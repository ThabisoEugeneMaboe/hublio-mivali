# Hublio — Phase 3 MVP

Learner wellbeing check-in, teacher alerts, case management, and school administration. **Powered by Mivali.**

## Run locally

```bat
cd C:\Projects\Hublio
node api/server.js
```

Open **http://localhost:3000/login.html**

### Demo accounts

| Role | Sign-in | Secret |
|------|---------|--------|
| Learner | code `024` (also `031`, `018`) | PIN `1234` |
| Teacher | `kholofelo@school.local` | `demo` |
| School admin | `admin@demo.school` | `demo` |

## What this MVP covers

- Role-based sign-in (learner / teacher / school admin)
- Learner **I'm Okay** / **I'm Not Okay** check-in, concern categories, optional 280-character message
- Teacher alerts, acknowledgement, follow-up notes, case status, basic escalation
- School admin: school config, teachers, learners, classes/grades
- Dashboard, basic reporting, audit trail
- Session cookies, hashed passwords/PINs, staff-only learner records

Not in this MVP: AI counselling, parent apps, advanced analytics, SMS gateways.

## API

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/me` | Current user |
| GET | `/api/dashboard` | Role-scoped dashboard |
| POST | `/api/checkin` | Learner check-in |
| PUT | `/api/alerts/:id` | Acknowledge / update alert |
| POST | `/api/cases/:id/followups` | Follow-up + status / escalation |
| POST | `/api/teachers` | Admin: add teacher |
| POST | `/api/learners` | Admin/teacher: add learner |
| POST | `/api/classes` | Admin: add class |
| PUT | `/api/school` | Admin: school configuration |

Production SQL target: [`database/schema.sql`](database/schema.sql). Demo data: [`api/data.json`](api/data.json).
