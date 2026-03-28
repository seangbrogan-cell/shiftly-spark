import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Hardcoded platform admin user ID
const PLATFORM_ADMIN_ID = "2ce85d0c-543c-4f02-96f7-9fc6c3f5a444";

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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller identity
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();

    if (!user || user.id !== PLATFORM_ADMIN_ID) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Fetch all stats in parallel
    const [
      employersRes,
      profilesRes,
      employeesRes,
      recentProfilesRes,
      recentEmployersRes,
      emailStatsRes,
    ] = await Promise.all([
      admin.from("employers").select("id, name, created_at"),
      admin.from("profiles").select("id, user_id, display_name, role, employer_id, created_at"),
      admin.from("employees").select("id, name, email, employer_id, user_id, created_at"),
      admin.from("profiles").select("*").order("created_at", { ascending: false }).limit(20),
      admin.from("employers").select("*").order("created_at", { ascending: false }).limit(20),
      admin.from("email_send_log").select("id, template_name, recipient_email, status, created_at, message_id")
        .order("created_at", { ascending: false }).limit(50),
    ]);

    const employers = employersRes.data || [];
    const profiles = profilesRes.data || [];
    const employees = employeesRes.data || [];

    const stats = {
      totalEmployers: employers.length,
      totalProfiles: profiles.length,
      employerProfiles: profiles.filter(p => p.role === "employer").length,
      employeeProfiles: profiles.filter(p => p.role === "employee").length,
      totalEmployeeRecords: employees.length,
      employeesWithAccounts: employees.filter(e => e.user_id).length,
    };

    // Build employer lookup for enriching data
    const employerMap: Record<string, string> = {};
    for (const e of employers) {
      employerMap[e.id] = e.name;
    }

    const recentSignups = (recentProfilesRes.data || []).map(p => ({
      ...p,
      employer_name: p.employer_id ? employerMap[p.employer_id] || "Unknown" : null,
    }));

    const recentOrgs = (recentEmployersRes.data || []).map(e => {
      const owner = profiles.find(p => p.employer_id === e.id && p.role === "employer");
      return { ...e, owner_name: owner?.display_name || null };
    });

    // Deduplicate email logs by message_id
    const emailLogs = emailStatsRes.data || [];
    const seenMsgIds = new Set<string>();
    const dedupedEmails = emailLogs.filter(e => {
      if (!e.message_id || seenMsgIds.has(e.message_id)) return false;
      seenMsgIds.add(e.message_id);
      return true;
    });

    return new Response(JSON.stringify({
      stats,
      recentSignups,
      recentOrgs,
      recentEmails: dedupedEmails,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
