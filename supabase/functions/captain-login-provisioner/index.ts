import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") || "";
  const callerClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const adminClient = createClient(url, serviceKey);
  try {
    const { data: { user }, error: authError } = await callerClient.auth.getUser();
    if (authError || !user || user.email?.toLowerCase() !== "musakazim373@gmail.com") return reply({ error: "Administrator access required." }, 403);
    const { data: adminRow, error: adminError } = await adminClient.from("admins").select("id").eq("id", user.id).maybeSingle();
    if (adminError || !adminRow) return reply({ error: "Administrator authorization failed." }, 403);
    const body = await req.json();
    const teamId = String(body.team_id || "");
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!teamId || !/^[a-z0-9._-]{4,24}$/.test(username) || password.length < 12 || password.length > 128) return reply({ error: "A valid 4-24 character username and password of 12-128 characters are required." }, 400);
    const { data: team, error: teamError } = await adminClient.from("teams").select("id,name").eq("id", teamId).maybeSingle();
    if (teamError || !team) return reply({ error: "Team not found." }, 404);
    const { data: clash, error: clashError } = await adminClient.from("teams").select("id").ilike("captain_username", username).neq("id", teamId).maybeSingle();
    if (clashError) throw clashError;
    if (clash) return reply({ error: "This username is already assigned to another team. Choose another." }, 409);
    const email = username + "@bjl-login.com";
    let existing = null;
    for (let page = 1; !existing && page <= 10; page++) {
      const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      existing = data.users.find((u) => u.email?.toLowerCase() === email) || null;
      if (data.users.length < 1000) break;
    }
    const appMetadata = { ...(existing?.app_metadata || {}), role: "captain", team_id: team.id };
    const userMetadata = { ...(existing?.user_metadata || {}), team_name: team.name, username };
    if (existing) {
      const { error } = await adminClient.auth.admin.updateUserById(existing.id, { password, email_confirm: true, app_metadata: appMetadata, user_metadata: userMetadata });
      if (error) throw error;
    } else {
      const { error } = await adminClient.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: appMetadata, user_metadata: userMetadata });
      if (error) throw error;
    }
    const { error: saveError } = await adminClient.from("teams").update({ captain_username: username }).eq("id", team.id);
    if (saveError) throw saveError;
    return reply({ success: true, team_id: team.id, username });
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : "Captain login provisioning failed." }, 500);
  }
});