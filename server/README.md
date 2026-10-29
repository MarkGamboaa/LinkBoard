# LinkBoard API

The API uses Fastify, PostgreSQL, Prisma ORM, and Firebase Authentication. Firebase remains the identity provider; the API verifies each signed-in user's ID token before accessing private profile or board data.

## Local setup

1. Install Node.js 24 LTS and PostgreSQL, or create a PostgreSQL database with a managed provider.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` to the PostgreSQL connection URL. For Supabase, the app can use the Transaction pooler URL (port `6543`); set `DIRECT_URL` to the Session pooler URL (port `5432`) so Prisma can run migrations. For local PostgreSQL, `DIRECT_URL` can stay blank.
3. Create a Firebase Admin service-account key for the `linkboard-5af54` Firebase project. Keep the JSON file private and point `GOOGLE_APPLICATION_CREDENTIALS` to it, or provide its JSON as `FIREBASE_SERVICE_ACCOUNT_JSON`.
4. Install dependencies and generate Prisma Client:

   ```powershell
   npm install
   npm run db:generate
   ```

5. Apply the checked-in migrations:

   ```powershell
   npm run db:deploy
   ```

6. Start the API:

   ```powershell
   npm start
   ```

The API listens on port 3001 by default. `GET /api/health` reports whether PostgreSQL is reachable. `DATABASE_URL` and Firebase service-account credentials are required before the API can start.

For schema changes during development, use `npm run db:migrate -- --name describe_change` to create and apply a migration.

## LinkBoard features

- Links store tags, notes, and optional site preview metadata.
- Board templates seed starter links for job search, travel planning, and learning.
- Owners can create seven-day collaboration invite links. Anyone with a link can sign in and accept it once to join the board.
- Website preview metadata is requested by the browser from Microlink when a link is added or its URL changes. Preview failures do not prevent saving the link.

Apply the checked-in migrations after updating the server code with `npm run db:deploy`, then regenerate the Prisma client with `npm run db:generate` if you change the schema locally.
