# Hublio — Wellness Check-ins

Learner wellness check-in and teacher dashboard. **Powered by Mivali.**

## Location

`C:\Projects\Hublio`

## Run locally

Double-click **`Start Hublio.bat`** or:

```bat
cd C:\Projects\Hublio
node api/server.js
```

Open **http://localhost:3000/login.html**

## Screens

| Role | URL | Flow |
|------|-----|------|
| **Login** | `/login.html` | Choose learner or teacher |
| **Learner** | `/` | Mood check-in → OK / Not OK → concern → message → sent |
| **Teacher** | `/dashboard.html` | Stats, alerts, mood breakdown |
| **Case** | `/case.html` | Alert detail → follow-up → resolved |

Toggle **Learner / Teacher** on the dashboard switch.

## Database (when you're ready)

SQL schema: [`database/schema.sql`](database/schema.sql)

Tables: `Teachers`, `Learners`, `CheckIns`, `Alerts`, `FollowUps`

Current demo uses JSON file API at [`api/data.json`](api/data.json). Replace `api/server.js` endpoints with SQL when database is connected.

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/dashboard` | Teacher dashboard data |
| POST | `/api/checkin` | Submit learner check-in |
| PUT | `/api/alerts/:id` | Update alert / resolve case |

## Project structure

```
Hublio/
├── wwwroot/          Frontend (HTML, CSS, JS)
├── api/              Node server + JSON data store
├── database/         SQL schema for production
└── Start Hublio.bat
```
