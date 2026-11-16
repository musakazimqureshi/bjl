# Change report – v12
Base: existing BJL Next.js project (v11). Nothing removed; existing registration, payment, team login, admin, quotes, footer, WhatsApp and language switch are kept.

## Changed files
- app/page.js – new home order: heading → TODAY'S WINNER | NEXT MATCH → OFFICIAL ANNOUNCEMENTS | MOMENTS & HIGHLIGHTS → ORGANIZER & MEMBERS → existing sections. Cards stay side by side on mobile; empty-state messages added.
- app/layout.js – adds the welcome splash (first visit only).
- app/admin/page.js – Team A/B and winner/opponent are dropdowns of registered teams; new "result" field.
- app/globals.css, lib/extra.js (labels, English + Urdu), components/People.js (Organizer first, gold frame; shown on home in its place and at the bottom of other pages).

## New files
- components/Splash.js, SETUP_URDU.md, CHANGE_REPORT.md, README.md.

## Database
- No new tables/columns for this version. Uses existing: settings (winner_team, loser_team, winner_result, winner_date, next_a, next_b, next_date, next_time, next_venue), announcements, moments, teams/players (via public_teams()). Full safe migration for older setups: sql/ALL_SQL_run_once.sql.

## Checks done here
Syntax of every file, imports, translation keys (English + Urdu), and a server-render test of every page and component. Not done: build on Vercel, real Supabase data, phone testing – these need to be verified after deployment.
