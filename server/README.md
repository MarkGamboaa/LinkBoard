# LinkBoard API

The API uses Fastify, PostgreSQL, Prisma ORM, and Firebase Authentication. The API validates each signed-in user's Firebase ID token before accessing private profile or board data. PostgreSQL may remain hosted by Supabase; Firebase is used for authentication only.

## Local setup

1. Install Node.js 24 LTS and PostgreSQL, or create a PostgreSQL database with a managed provider.
2. Configure `DATABASE_URL` for PostgreSQL. If PostgreSQL is hosted by Supabase, use its connection URL from Project Settings → Database.
3. Keep Firebase Authentication enabled in the Firebase project. The client uses the Firebase project configuration in `client/src/firebase.js`.
4. Set `FIREBASE_PROJECT_ID` and configure Firebase Admin credentials for the API. Locally, use `GOOGLE_APPLICATION_CREDENTIALS` pointing to a service-account JSON file; on a hosted server, provide the service-account credentials using the platform's secret manager.
5. Set Firebase Authentication's authorized domains and email templates in the Firebase console. Password reset and verification emails are sent by Firebase.
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

The API listens on port 3001 by default. `GET /api/health` reports whether PostgreSQL is reachable. `DATABASE_URL` and Firebase Admin credentials are required before the API can start.

For schema changes during development, use `npm run db:migrate -- --name describe_change` to create and apply a migration.

## LinkBoard features

- Links store tags, notes, and optional site preview metadata.
- Board templates seed starter links for job search, travel planning, and learning.
- Owners can create seven-day collaboration invite links. Anyone with a link can sign in and accept it once to join the board.
- Website preview metadata is requested by the browser from Microlink when a link is added or its URL changes. Preview failures do not prevent saving the link.

Apply the checked-in migrations after updating the server code with `npm run db:deploy`, then regenerate the Prisma client with `npm run db:generate` if you change the schema locally.
