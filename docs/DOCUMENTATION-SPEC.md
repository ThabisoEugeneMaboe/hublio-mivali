# Hublio Project 006 — Phase 3 MVP Documentation Specification

**Product:** Hublio wellness check-in  
**Owner:** Hublio / Young Tech Giants (Pty) Ltd  
**Build partner:** Mivali  
**Status:** Phase 3 MVP deployed (UAT-ready demo)  
**Live demo:** https://hublio-mivali.onrender.com/login.html  
**Source:** https://github.com/ThabisoEugeneMaboe/hublio-mivali  

This document describes what the Phase 3 MVP **is**, how it **works**, and how it maps to the approved Phase 1–2 requirements. It is the specification to use for internal review, UAT, and handover discussion.

---

## 1. Purpose

Hublio gives a school a simple, structured way for learners to say how they are, and for teachers to respond when a learner is not okay.

The core interaction remains:

- **I’m Okay**
- **I’m Not Okay**

When a learner is not okay, the system creates an alert and a case so an authorised staff member can acknowledge, follow up, update status, and escalate if needed.

The MVP establishes this core digital workflow. Advanced wellbeing intelligence, parent apps, and AI counselling are out of scope.

---

## 2. Phase context

| Phase | Focus | Outcome |
|-------|--------|---------|
| 1 | Discovery, requirements, workflows, MVP definition | Agreed problem and feature list |
| 2 | User journeys, interface concepts, click-through prototype | Agreed UX direction |
| 3 | Technical development of the approved MVP | Working application with roles, check-in, alerts, cases, admin |

Phase 3 implements the prototype as a functional system. It is not a full school ERP.

---

## 3. Users and roles

| Role | Who | Access |
|------|-----|--------|
| Learner | Pupil at the school | Own check-in only. Cannot open staff screens. |
| Teacher | Class teacher | Dashboard, assigned learners, alerts, cases, follow-up, basic reports. |
| School admin | School administrator | All teacher functions plus school configuration, teachers, classes, audit trail. |

Sign-in is role-based:

- Learner: **learner code + PIN**
- Teacher / admin: **email + password**

Sessions use an HTTP-only cookie (12 hours). Passwords and PINs are stored hashed (scrypt), not as plain text.

### Demo accounts (UAT / presentation)

| Role | Sign-in | Secret |
|------|---------|--------|
| Learner | `024` (also `031`, `018`) | PIN `1234` |
| Teacher | `kholofelo@school.local` | `demo` |
| Admin | `admin@demo.school` | `demo` |

These credentials are for the demonstration school only. They must be changed before any real-school production use.

---

## 4. Functional specification (MVP)

### 4.1 School administration

Implemented:

- School name and basic configuration
- Check-in window label
- Auto-escalate setting for safety / home-or-family concerns
- Create and list teachers
- Create and list learners (code, grade, class, PIN)
- Create and list classes / grades
- Role-based menus (admin sees Teachers, Classes, Audit, Settings)

### 4.2 Teacher environment

Implemented:

- Sign in to the teacher portal
- Dashboard: feeling okay, active alerts, checked-in %, open cases
- View learners in the school/class directory
- Receive **I’m Not Okay** alerts
- Open case file with learner name, grade, concern, optional message
- Acknowledge alert
- Record follow-up (type, outcome, private note)
- Case statuses: Open, Acknowledged, Monitoring, Escalated, Resolved
- Basic reporting by concern and case status

### 4.3 Learner profiles

Implemented:

- Name, learner code, grade, class, assigned teacher
- Staff-only view of learner directory
- Learner session is bound to their own profile for check-in

Not implemented (future): full pastoral file, medical history, parent contacts as a product module.

### 4.4 Learner check-in

Implemented:

1. Choose mood: Happy, Okay, Tired, Anxious, Sad, Sick  
2. **I’m Okay** — stored as a check-in; no alert  
3. **I’m Not Okay** — concern category, then optional message (max 280 characters)  
4. Confirmation that a teacher has been notified  

Concern categories:

- Bullying or safety  
- Friends or classmates  
- School work  
- Home or family  
- I feel sick  
- Something else  

### 4.5 Teacher alerts

When a learner is not okay, the system:

- Stores the check-in  
- Creates an **alert** (New, Attention, or Critical)  
- Creates a **case** linked to that alert  
- Writes an **audit** event  

Staff can view, acknowledge, and open the case.

**Basic escalation rule:** if school setting *auto-escalate safety* is on, **Bullying or safety** and **Home or family** open as Critical / Escalated.

### 4.6 Follow-up and case management

Implemented:

- Case created automatically from a not-okay check-in  
- Case status  
- Follow-up records (conversation, counsellor referral, guardian contacted, duty monitoring)  
- Outcomes: Resolved locally, Needs monitoring, Escalated  
- Case history timeline  
- Escalation via follow-up outcome **Escalated**

### 4.7 School dashboard

Implemented for authorised staff:

- Current / active alerts  
- Open-case count  
- Check-in activity and mood breakdown  
- Basic reporting (counts by concern and status)

### 4.8 Audit trail

Admin can view recent actions, including:

- Login  
- Check-in  
- Alert created / acknowledged  
- Follow-up / escalation  
- Teacher, learner, class, school updates  

Purpose: accountability and administrative oversight, not legal certification.

### 4.9 Role-based access

| Action | Learner | Teacher | Admin |
|--------|---------|---------|-------|
| Check in | Yes | No | No |
| View staff dashboard | No | Yes | Yes |
| Acknowledge / follow up | No | Yes | Yes |
| Add learner | No | Yes | Yes |
| Add teacher / class / school config | No | No | Yes |
| View audit log | No | No | Yes |

Unauthenticated users are sent to login. Learners hitting staff URLs are redirected to the check-in.

---

## 5. Technical architecture

Layered application, as proposed for Phase 3.

```
Learner / Teacher / Admin UI  (wwwroot)
            │
            ▼
Application / API  (api/server.js + api/mvp.js)
  Auth, RBAC, check-ins, alerts, cases, escalation, reporting, audit
            │
            ▼
Data layer  (api/data.json for MVP demo)
  Schools, users, learners, teachers, classes,
  check-ins, alerts, cases, follow-ups, audit
```

| Layer | Implementation |
|-------|----------------|
| UI | Responsive HTML/CSS/JS. Learner flow is phone-style; staff is desktop portal. |
| API | Node.js HTTP service. Same origin as the UI. |
| Data | JSON file store for the demo MVP. Production target schema: `database/schema.sql` |
| Notifications | In-app alerts only (no SMS/email gateway in this MVP) |
| Hosting | Render web service: https://hublio-mivali.onrender.com |

**Start command:** `node api/server.js`  
**Port:** `PORT` environment variable, or 3000 locally.

### 5.1 Main API routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/me` | Current user |
| GET | `/api/dashboard` | Role-scoped dashboard payload |
| POST | `/api/checkin` | Learner check-in |
| PUT | `/api/alerts/:id` | Acknowledge / update alert |
| POST | `/api/cases/:id/followups` | Follow-up and status change |
| POST | `/api/teachers` | Admin: add teacher |
| POST | `/api/learners` | Admin/teacher: add learner |
| POST | `/api/classes` | Admin: add class |
| PUT | `/api/school` | Admin: school configuration |

---

## 6. Data protection and security (MVP controls)

The system may process information about learners, including minors. Phase 3 implements agreed **technical** controls. It does **not** provide POPIA legal certification. Hublio / the school remains responsible for lawful processing, consent, retention, and data-subject rights.

Implemented in this MVP:

- Data minimisation in the learner flow (optional short message)  
- Role-based access  
- Authentication (code+PIN or email+password)  
- Hashed credentials  
- HTTP-only session cookie  
- HTTPS on the hosted demo (Render)  
- Staff-only learner directory  
- Audit logging of key actions  
- Input length limits on messages and notes  

Not yet production-grade:

- Azure SQL / managed database with backups  
- Secrets manager beyond hashed demo accounts  
- SMS/email notification provider under Hublio’s account  
- Formal penetration test / legal privacy review  

---

## 7. Hosting notes for demos

- **URL:** https://hublio-mivali.onrender.com/login.html  
- **Free Render plan:** the app may sleep after about 15 minutes idle. First visit can take 30–60 seconds to wake.  
- **JSON store:** demo data is file-based. A new deploy can reset seed data. Do not treat Render as a permanent pupil record system.  
- **Local run:** `C:\Projects\Hublio` → `node api/server.js` → http://localhost:3000/login.html  

---

## 8. Exclusions (not in this MVP)

Unless added later via change request:

- AI counselling or diagnosis  
- Student-to-student social features  
- Parent platform  
- Advanced analytics / pattern detection  
- Location tracking or facial recognition  
- Native mobile apps  
- Offline mode  
- SMS / extra notification channels  
- School ERP (timetable, fees, attendance as a full product)  

---

## 9. Acceptance mapping (Phase 3 proposal)

| Proposal item | MVP status |
|---------------|------------|
| School administration account and basic config | Done |
| Teachers, learners, classes | Done |
| Role-based access | Done |
| Learner I’m Okay / I’m Not Okay | Done |
| Concern categories and limited message | Done |
| Teacher alerts and acknowledgement | Done |
| Follow-up, case status, history, basic escalation | Done |
| Dashboard and basic reporting | Done |
| Audit trail | Done (admin) |
| Secure database (SQL production) | Schema prepared; demo uses JSON |
| Email/SMS notifications | Out of scope for this MVP |
| UAT-ready hosted demo | Done (Render) |
| Production handover under Hublio accounts | Outstanding (commercial / hosting decision) |

---

## 10. Related files

| File | Use |
|------|-----|
| `docs/DEMO-PRESENTATION-SPEC.md` | Slide outline, talk track, live demo script |
| `README.md` | How to run locally |
| `database/schema.sql` | Production SQL target |
| `api/mvp.js` | Business rules |
| `api/server.js` | HTTP API |
| `wwwroot/` | User interface |

---

## 11. Document control

| Field | Value |
|-------|--------|
| Document type | Phase 3 MVP documentation specification |
| Audience | Hublio, YTG, school stakeholders, UAT testers |
| Classification | Internal — contains demo credentials |
| Next step | UAT against this spec; production hosting and SQL when approved |
