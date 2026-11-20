import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ ok: false, error: "Captain account service is not configured on Supabase." }, 503);

  const authorization = req.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return json({ ok: false, error: "Admin sign-in required." }, 401);

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ ok: false, error: "Admin session is invalid or expired." }, 401);

  const { data: adminRow, error: adminError } = await userClient
    .from("admins").select("id").eq("id", authData.user.id).maybeSingle();
  if (adminError || !adminRow) return json({ ok: false, error: "Only an authorized BJL admin can create captain accounts." }, 403);

  let body: { teamId?: string; email?: string; password?: string };
  try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid request body." }, 400); }
  const teamId = String(body.teamId || "");
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!teamId || !/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email) || password.length < 12) {
    return json({ ok: false, error: "A valid captain email and a password of at least 12 characters are required." }, 400);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: team, error: teamError } = await admin.from("teams")
    .select("id,captain_email").eq("id", teamId).maybeSingle();
  if (teamError || !team) return json({ ok: false, error: "The selected BJL team was not found." }, 404);
  if ((team.captain_email || "").toLowerCase() !== email) {
    return json({ ok: false, error: "Captain email does not match the email saved for this team. Save the captain email first." }, 409);
  }

  const { data: users, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) return json({ ok: false, error: listError.message }, 500);
  const existing = users.users.find((u) => (u.email || "").toLowerCase() === email);
  let userId = existing?.id;
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { ...(existing.user_metadata || {}), bjl_role: "captain", bjl_team_id: teamId },
    });
    if (error) return json({ ok: false, error: error.message }, 500);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { bjl_role: "captain", bjl_team_id: teamId },
    });
    if (error || !data.user) return json({ ok: false, error: error?.message || "Could not create captain account." }, 500);
    userId = data.user.id;
  }

  return json({ ok: true, teamId, email, userId });
});
