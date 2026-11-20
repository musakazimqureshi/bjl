import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...cors, "Content-Type": "application/json" } });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") || "";
  const callerClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const adminClient = createClient(url, serviceKey);

  try {
    const { data: { user }, error: authError } = await callerClient.auth.getUser();
    if (authError || !user || user.email?.toLowerCase() !== "musakazim373@gmail.com") {
      return new Response(JSON.stringify({ error: "Administrator access required." }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const { data: adminRow, error: adminError } = await adminClient.from("admins").select("id").eq("id", user.id).maybeSingle();
    if (adminError || !adminRow) return new Response(JSON.stringify({ error: "Administrator authorization failed." }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });

    const body = await req.json();
    const teamId = String(body.team_id || "");
    const password = String(body.password || "");
    if (!teamId || password.length < 12 || password.length > 128) {
      return new Response(JSON.stringify({ error: "A team and a password of 12 to 128 characters are required." }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const { data: team, error: teamError } = await adminClient.from("teams").select("id,name,captain_email").eq("id", teamId).maybeSingle();
    if (teamError || !team?.captain_email) return new Response(JSON.stringify({ error: "Team or captain email not found." }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });

    const email = String(team.captain_email).trim().toLowerCase();
    let existing = null;
    let page = 1;
    while (!existing && page <= 10) {
      const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      existing = data.users.find((u) => u.email?.toLowerCase() === email) || null;
      if (data.users.length < 1000) break;
      page++;
    }

    const metadata = { ...(existing?.user_metadata || {}), role: "captain", team_id: team.id, team_name: team.name };
    let result;
    if (existing) {
      const { data, error } = await adminClient.auth.admin.updateUserById(existing.id, { password, email_confirm: true, user_metadata: metadata });
      if (error) throw error;
      result = data.user;
    } else {
      const { data, error } = await adminClient.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: metadata });
      if (error) throw error;
      result = data.user;
    }
    return new Response(JSON.stringify({ success: true, team_id: team.id, email: result.email }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Captain login provisioning failed." }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
