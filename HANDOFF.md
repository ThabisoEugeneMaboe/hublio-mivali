# Mivali Phase 3 — handoff for developers

## GitHub repository

**https://github.com/ThabisoEugeneMaboe/hublio-mivali** (branch `main`)

Collaborator **MarioAdoonsGee** is invited with **Write** access (clone, branch, push, edit files, open PRs).

## Live demo (Render)

**https://hublio-mivali.onrender.com/login.html**

Auto-deploy: push to `main` on GitHub (Render service `hublio-mivali`).

## Run locally

```bat
cd C:\Sampra\Hublio
npm install
node api/server.js
```

Open http://localhost:3000/login.html

Or use `C:\Sampra\Start Hublio.bat` if present on your machine.

## Demo logins

| Role | Login | Password / PIN |
|------|--------|----------------|
| Learner | `024` | `1234` |
| Teacher | `kholofelo@school.local` | `demo` |
| Admin | `admin@demo.school` | `demo` |

## Project layout

| Path | Purpose |
|------|---------|
| `wwwroot/` | HTML, `app.js`, `styles.css`, Mivali assets |
| `api/server.js` | HTTP server and routes |
| `api/mvp.js` | Auth, dashboard, check-ins, CRUD, audit |
| `api/data.json` | Demo school data (persisted on server) |
| `render.yaml` | Render build/start config |

## Recent features (main)

- Mivali branding, Young Tech Giants footer credit
- Live clock and time-based greetings
- Learner voice message on check-in (optional)
- Teacher/admin: learner directory filter, add modals, remove rows
- Admin: teachers/classes CRUD, Reports & Audit Share / Print / CSV / PDF
- Learner activity banner (sign-ins and check-ins today)

## Deploy notes

See `AUTO-DEPLOY-RENDER.txt` and `DEPLOY-TO-RENDER-NOW.txt`.

Optional GitHub secret `RENDER_DEPLOY_HOOK_URL` for the workflow in `.github/workflows/render-deploy.yml`.

## Contact

Repo owner: **ThabisoEugeneMaboe**. For access issues, accept the GitHub invite or ask the owner to re-send.
