BATTAGRAM JUNIOR LEAGUE (BJL) - PHASE 10 UPDATE

WHAT CHANGED
1. Kept the existing Next.js project and red/black/white visual identity.
2. Added two bordered match tiles: Today's Winner and Next Match.
3. Next Match displays Team A vs Team B, date, time and Dab Ground, Battagram.
4. Team names are clickable. They open Registered Teams and automatically open that team's full squad.
5. Announcements and Moments & Highlights now appear in two separate bordered boxes side-by-side on the homepage.
6. The organizer card is displayed first, with a gold border. Member cards follow.
7. Included the four supplied photos in public/team/ and kept the local photo fallback active.
8. Existing registration, registered teams, payment, contacts, quotations and admin features were retained.

FILES
- phase10.sql: optional safe defaults for the existing settings table. Run in Supabase SQL Editor.
- app/page.js: homepage layout and match cards.
- app/admin/page.js: team dropdowns for Next Match.
- app/teams/page.js: auto-open selected team's squad from the homepage link.
- app/globals.css: bordered tiles and responsive layout.
- lib/extra.js: English/Urdu labels.
- public/team/: four supplied portraits.

HOW TO APPLY
1. Download and extract this ZIP.
2. Open the bjl folder. Upload/replace the project files in your existing GitHub repository, preserving the same folder structure.
3. Do not delete your existing environment variables in Vercel. The project still needs:
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
4. In Supabase SQL Editor, run phase10.sql once. It only inserts defaults if those keys do not already exist.
5. Commit and push the updated files to GitHub. Vercel should deploy automatically if it is connected to that repository.
6. Open /admin, sign in, then go to Match Center. Choose Team A and Team B from the registered-team dropdowns, set the date and time, and save. The ground is fixed to Dab Ground, Battagram on the public homepage.
7. To publish the winner, use the Today's Winner fields in the same Match Center tab and save.

IMPORTANT
- A team must already be registered to appear in the Next Match dropdown.
- Team links resolve by the exact registered team name. The admin dropdown writes the registered name and UUID to settings.
- No Live Score, Points Table or Team Results management has been added.
- No production deployment was performed from this workspace. You must push the ZIP's project files to your GitHub repository for Vercel to publish them.
