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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { employeeId } = await req.json();
    if (!employeeId) {
      return new Response(JSON.stringify({ error: "employeeId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("employer_id, role")
      .eq("user_id", caller.id)
      .single();

    if (!callerProfile || callerProfile.role !== "employer") {
      return new Response(JSON.stringify({ error: "Only employers can resend reset links" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: employee } = await supabaseAdmin
      .from("employees")
      .select("id, email, employer_id, user_id")
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

    if (!employee.user_id) {
      return new Response(JSON.stringify({ error: "Employee does not have an account yet. Use invite instead." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const siteUrl = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/+$/, "") || supabaseUrl;

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { error: recoveryError } = await anonClient.auth.resetPasswordForEmail(employee.email, {
      redirectTo: `${siteUrl}/reset-password`,
    });

    if (recoveryError) {
      const isRateLimited = recoveryError.message?.toLowerCase().includes("only request this after") || recoveryError.message?.includes("429");
      return new Response(
        JSON.stringify({
          error: isRateLimited
            ? "A reset email was requested too recently. Please wait about a minute and try again."
            : recoveryError.message,
        }),
        {
          status: isRateLimited ? 429 : 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: `Password reset email sent to ${employee.email}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});