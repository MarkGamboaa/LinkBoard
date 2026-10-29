# LinkBoard API

The API uses Fastify, PostgreSQL, Prisma ORM, and Supabase Auth. The API validates each signed-in user's access token with Supabase before accessing private profile or board data. PostgreSQL can be hosted by Supabase, so auth and app data can live in the same Supabase project.

## Local setup

1. Install Node.js 24 LTS and PostgreSQL, or create a PostgreSQL database with a managed provider.
2. Copy `server/.env.example` to `server/.env` and set `DATABASE_URL` and `DIRECT_URL` to the PostgreSQL connection URLs. For Supabase, use the pooler URLs shown in Project Settings → Database.
3. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` from Project Settings → API. Set `SUPABASE_SERVICE_ROLE_KEY` for the server only; never put it in the client or commit it.
4. Copy `client/.env.example` to `client/.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the same Supabase project values.
5. In Supabase Authentication → URL Configuration, set the local and production Site URLs and allow the `/login`, `/invite`, and `/reset-password` redirects. Keep email confirmation enabled if you want new users to verify their address before signing in. Password reset requests use the Supabase email template; edit its branding in Authentication → Email Templates.
6. Install dependencies and generate Prisma Client:

   ```powershell
   npm install
   npm run db:generate
   ```

7. Apply the checked-in migrations:

   ```powershell
   npm run db:deploy
   ```

8. Start the API:

   ```powershell
   npm start
   ```

The API listens on port 3001 by default. `GET /api/health` reports whether PostgreSQL is reachable. `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are required before the API can start.

For schema changes during development, use `npm run db:migrate -- --name describe_change` to create and apply a migration.

## LinkBoard features

- Links store tags, notes, and optional site preview metadata.
- Board templates seed starter links for job search, travel planning, and learning.
- Owners can create seven-day collaboration invite links. Anyone with a link can sign in and accept it once to join the board.
- Website preview metadata is requested by the browser from Microlink when a link is added or its URL changes. Preview failures do not prevent saving the link.

Apply the checked-in migrations after updating the server code with `npm run db:deploy`, then regenerate the Prisma client with `npm run db:generate` if you change the schema locally.
