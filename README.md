# Discord-like Demo Website

This repository contains a minimal demo of a Discord-like web app: channels, messages, search, create/delete channels and messages, and basic username-only authentication. Data is stored in `data.json` on the backend so changes are shared between users.

This README explains how the app works, how to run it locally, and how to publish the frontend to GitHub Pages while hosting the backend on a platform like Vercel or Render.

Contents
- How it works
- Run locally (development)
- Deploy frontend to GitHub Pages (docs/)
- Deploy backend to Vercel (recommended)
- Wire frontend to backend (set API_BASE)
- Environment variables and cookie settings
- Troubleshooting
- Next steps / improvements

How it works
- Frontend: static HTML/CSS/JS lives in `public/` and was copied into `docs/` for GitHub Pages. The UI calls an API for channels and messages.
- Backend: an Express app (`server.js`) exposes REST endpoints and persists to `data.json`. Sessions and users are stored in `data.json` for the demo.

Run locally (development)
1. Install dependencies

```bash
npm install
```

2. Start the server

```bash
npm start
```

3. Open the app in your browser:

http://localhost:3000

API endpoints
- GET /api/channels
- POST /api/channels { name }
- DELETE /api/channels/:id
- GET /api/channels/:id/messages
- POST /api/channels/:id/messages { text }
- DELETE /api/channels/:id/messages/:mid
- GET /api/search?q=...
- POST /api/register { username }
- POST /api/login { username }
- POST /api/logout
- GET /api/me

Deploy frontend to GitHub Pages (quick)
1. The `docs/` folder already contains the static frontend ready to be served by Pages. If you make changes to `public/`, re-copy them to `docs/`:

Run the following from the repo root:

```bash
rm -rf docs
cp -R public docs
git add docs
git commit -m "Update docs for GitHub Pages"
git push
```

2. Enable GitHub Pages (UI):
- Go to your repository on GitHub → Settings → Pages.
- Under "Source" choose Branch: `main` and Folder: `/docs`. Save.
- After a minute you should see your site at `https://<your-username>.github.io/<repo>/` (for this repo: `https://testers1289.github.io/website/`).

Deploy backend (Vercel recommended)
This app relies on a backend because `data.json` must be modified by the server. Vercel is quick and free for hobby projects.

1. Create a Vercel account and install the Vercel CLI (optional).
2. Connect the GitHub repository to Vercel and create a new project. Use the default settings — Vercel detects Node.js and runs `npm start`.
3. Set environment variables for CORS/cookie behavior (in the Vercel dashboard → Project Settings → Environment Variables):

- `FRONTEND_ORIGIN` = `https://<your-username>.github.io` (example: `https://testers1289.github.io`)
- `COOKIE_SECURE` = `true`
- `COOKIE_SAMESITE` = `None`

These make cross-site cookies possible (Pages → backend). If you host frontend on a different custom domain, set `FRONTEND_ORIGIN` to that domain.

4. Deploy. Vercel will give you a backend URL, for example: `https://your-backend.vercel.app`.

Wire frontend to backend (set API_BASE)
1. Edit the Pages static files in `docs/` to point to your backend. Open `docs/index.html`, `docs/login.html`, and `docs/search.html` and set the `window.API_BASE` value near the top of each file. Example:

Add or update this script tag at the top of `docs/index.html`:

```html
<script>
  // Set your backend URL here
  window.API_BASE = 'https://your-backend.vercel.app';
</script>
```

2. Commit and push. GitHub Pages will pick up the change and your frontend will call the deployed backend.

Environment variables and cookie settings
- `FRONTEND_ORIGIN` (optional but recommended): the exact origin of your Pages site (e.g. `https://testers1289.github.io`). This configures CORS on the server.
- `COOKIE_SECURE=true` and `COOKIE_SAMESITE=None`: required for cross-site cookies between Pages (https) and your backend. Without these the session cookie might be blocked by browsers.

Security notes
- This demo uses username-only auth and stores sessions in `data.json`. Do not use this as-is in production. At minimum:
  - Add password hashing (bcrypt)
  - Switch to a proper database (SQLite/Postgres)
  - Add HTTPS (hosting providers provide this)

Troubleshooting
- 403 when trying to delete a channel as another user: expected (only owners can delete).
- Cookies not sent from Pages to backend: check that `COOKIE_SECURE=true`, `COOKIE_SAMESITE=None`, and `FRONTEND_ORIGIN` match Pages origin, and that backend is HTTPS.
- If Pages shows stale content, clear browser cache or wait a minute — Pages caches aggressively.

Next steps I can do for you
- Deploy the backend to Vercel and set the env vars (I can prepare a `vercel.json` and instructions; I cannot call Vercel on your behalf).
- Set the `API_BASE` in `docs/` if you give me the backend URL.
- Migrate persistence from `data.json` to SQLite for safer concurrency.

If you want me to finish anything for you (set the API_BASE in `docs/`, prepare Vercel config, or convert to a single-host app), tell me which option and I will do it.
