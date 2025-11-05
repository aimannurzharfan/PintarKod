Server API
--------------

This repository contains a small Express server used for development API endpoints.

Run the server locally:

1. Ensure your `DATABASE_URL` environment variable points to a reachable database used by Prisma (MySQL as defined in `prisma/schema.prisma`).
2. Install dependencies from the project root:

   npm install

3. Start the server:

   npm run start:server

Endpoints:
- GET /api/health -> simple health check
- POST /api/register { username, email, password } -> creates a user (password hashed with bcrypt)

Notes:
- The Prisma client uses the project's Prisma schema. If you modify the schema, run `npx prisma generate` and apply migrations as needed.
