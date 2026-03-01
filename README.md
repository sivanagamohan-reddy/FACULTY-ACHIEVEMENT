# Faculty Tracker Pro Web (HTML/CSS/JS + Bootstrap + Node + Express + PostgreSQL)

## Stack
- Frontend: HTML, CSS, JavaScript, Bootstrap 5
- Backend: Node.js + Express
- Database: PostgreSQL

## Setup
1. `cd faculty-tracker-pro-web`
2. `npm install`
3. Copy `.env.example` to `.env` and update `DATABASE_URL`
4. Create database, then run: `psql -d faculty_tracker -f sql/schema.sql`
5. Start server: `npm run dev`
6. Open `http://localhost:4000`

## Features cloned from Flutter UI
- Dashboard with branded color cards, action cards, and recent activity
- Individual animated entry pages for Publications, FDPs, Conferences, Workshops, Patents
- Reports & Analytics screen
- Global Search screen
- AI Assistant screen
- Responsive layout and animated transitions

## Deploy on Render (Free)
1. Push this repo to GitHub.
2. In Render, create a new `Blueprint` service and select this repo.
3. Render will read `render.yaml`.
4. Set `DATABASE_URL` to your Render PostgreSQL connection string.
5. Set `CORS_ORIGIN` to your Render app URL (for example: `https://your-app.onrender.com`).
6. Deploy.

### Notes
- The startup command runs `auth:init` and `db:init` automatically before starting server.
- Health check endpoint: `/healthz`
- In production, secure cookies and DB SSL are enabled by configuration.
