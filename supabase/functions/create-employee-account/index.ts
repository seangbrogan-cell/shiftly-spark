import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the calling user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with caller's JWT to verify identity
    const supabaseCaller = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await supabaseCaller.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client for user creation
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { employeeId } = await req.json();
    if (!employeeId) {
      return new Response(JSON.stringify({ error: "employeeId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller owns this employee (same employer)
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("employer_id, role")
      .eq("user_id", caller.id)
      .single();

    if (!callerProfile || callerProfile.role !== "employer") {
      return new Response(JSON.stringify({ error: "Only employers can create employee accounts" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the employee record
    const { data: employee } = await supabaseAdmin
      .from("employees")
      .select("id, email, name, employer_id, user_id")
      .eq("id", employeeId)
      .single();

    if (!employee) {
      return new Response(JSON.stringify({ error: "Employee not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (employee.employer_id !== callerProfile.employer_id) {
      return new Response(JSON.stringify({ error: "Employee does not belong to your organization" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (employee.user_id) {
      return new Response(JSON.stringify({ error: "Employee already has an account" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create auth user with a random password
    const tempPassword = crypto.randomUUID() + "Aa1!";
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: employee.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { display_name: employee.name },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = newUser.user.id;

    // Update profile to link to employer with employee role
    await supabaseAdmin
      .from("profiles")
      .update({
        employer_id: employee.employer_id,
        role: "employee",
        display_name: employee.name,
      })
      .eq("user_id", userId);

    // Link employee record to auth user
    await supabaseAdmin
      .from("employees")
      .update({ user_id: userId })
      .eq("id", employeeId);

    // Ensure employee is assigned to at least the default (first) workplace
    const { data: existingWp } = await supabaseAdmin
      .from("employee_workplaces")
      .select("id")
      .eq("employee_id", employeeId)
      .limit(1);

    if (!existingWp || existingWp.length === 0) {
      // Get the first workplace for this employer
      const { data: defaultWp } = await supabaseAdmin
        .from("workplaces")
        .select("id")
        .eq("employer_id", employee.employer_id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (defaultWp && defaultWp.length > 0) {
        await supabaseAdmin
          .from("employee_workplaces")
          .insert({ employee_id: employeeId, workplace_id: defaultWp[0].id });
      }
    }

    // Send password reset email so employee can set their own password
    // We need to use the site URL for the redirect
    const siteUrl = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/+$/, "") || supabaseUrl;

    // Send the recovery email via the normal auth flow (single request to avoid rate-limit collisions)
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { error: recoveryError } = await anonClient.auth.resetPasswordForEmail(employee.email, {
      redirectTo: `${siteUrl}/reset-password`,
    });

    if (recoveryError) {
      const isRateLimited = recoveryError.message?.toLowerCase().includes("only request this after") || recoveryError.message?.includes("429");
      return new Response(
        JSON.stringify({
          error: isRateLimited
            ? "A reset email was requested too recently for this address. Please wait about a minute and try again."
            : recoveryError.message,
        }),
        {
          status: isRateLimited ? 429 : 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: `Account created for ${employee.email}. A password reset email has been sent.` }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
