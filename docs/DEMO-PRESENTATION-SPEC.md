# Hublio Phase 3 — Demo and Presentation Specification

Use this pack when presenting to Hublio, YTG, a school, or an internal team. It covers **slides**, **what to say**, and a **click-by-click live demo**.

**Live URL:** https://hublio-mivali.onrender.com/login.html  
**Recommended duration:** 15 minutes (core) or 25 minutes (with Q&A)  
**Backup:** http://localhost:3000/login.html if the hosted app is waking up  

Open the live URL **before** the meeting. Free Render apps sleep when idle; the first load can take up to a minute.

---

## 1. Presentation objectives

By the end of the session, the audience should understand:

1. What problem Hublio solves in one sentence.  
2. That Phase 1–2 defined the workflow; Phase 3 is a working MVP.  
3. The three roles: learner, teacher, school admin.  
4. The path from **I’m Not Okay** → alert → case → follow-up / escalate.  
5. What is **in** the MVP and what is **explicitly out**.  
6. Suggested next step: UAT, then production hosting.

---

## 2. Audience variants

| Audience | Emphasise | Soft-pedal |
|----------|-----------|------------|
| Hublio / business | Workflow, accountability, POPIA posture, next commercial step | API internals |
| School leadership | Learner simplicity, teacher response, audit | Code, JSON vs SQL |
| Technical / YTG | Architecture, RBAC, audit, SQL schema, exclusions | Sales narrative |
| Mixed team (default) | Live demo of the three roles, then exclusions and UAT | Deep code |

---

## 3. Slide outline (10 slides)

Copy these titles into PowerPoint / Google Slides. Speaker notes are in section 4.

| # | Slide title | On the slide (keep sparse) |
|---|-------------|----------------------------|
| 1 | **Hublio Project 006 — Phase 3 MVP** | Wellness check-in for schools. Powered by Mivali. |
| 2 | **The problem** | Learners need a simple, private way to say they are not okay. Schools need a traceable response. |
| 3 | **How we got here** | Phase 1 requirements → Phase 2 prototype → Phase 3 working MVP |
| 4 | **The core idea** | I’m Okay / I’m Not Okay → alert → acknowledge → follow-up → case closed or escalated |
| 5 | **Who uses it** | Learner (code + PIN) · Teacher · School admin |
| 6 | **What the MVP does** | Check-in, alerts, cases, dashboard, admin, audit, role-based access |
| 7 | **Live demo** | Open the hosted URL. Three short journeys. |
| 8 | **Trust and privacy** | Minimise data, restrict access, hash credentials, audit. School remains POPIA responsible. |
| 9 | **In scope vs later** | In: core workflow. Later: AI, parents, SMS, apps, advanced analytics. |
| 10 | **Ask / next step** | UAT against the documentation spec. Then production database, hosting under Hublio, support model. |

Optional extra slides (only if you have time): architecture diagram, demo accounts, Render sleep disclaimer, commercial reminder (Phase 3 fee / change requests — do not improvise numbers).

---

## 4. Speaker notes (talk track)

**Slide 1 — Open**  
“This is the Phase 3 MVP for Hublio Project 006. Phases 1 and 2 defined *what* the product should do and *how* it should feel. Phase 3 is the first working system you can sign into.”

**Slide 2 — Problem**  
“A learner who is struggling often has no structured, low-friction way to tell a teacher. Paper systems and informal chats don’t give the school a consistent alert, acknowledgement, or record of what happened next.”

**Slide 3 — Journey**  
“We did not jump to build. Discovery and prototype came first. Today we are showing the approved MVP — not the full future platform.”

**Slide 4 — Core idea**  
“One question, two answers. I’m Okay is logged. I’m Not Okay creates a teacher alert and a case. The teacher acknowledges, records a follow-up, and either resolves, monitors, or escalates.”

**Slide 5 — Roles**  
“Learners use a code and PIN — more age-appropriate than email. Teachers see only the response work. Admins configure the school and can see the audit trail.”

**Slide 6 — MVP list**  
Walk the six bullets. Do not list every screen. Promise the demo will prove them.

**Slide 7 — Demo**  
“I’ll show the same story from three seats: the learner who is not okay, the teacher who responds, and the admin who can see that it was logged.”

**Slide 8 — Trust**  
“Because this may involve minors, we designed for least privilege and an audit trail. We implement technical controls; the school still owns consent, retention, and POPIA decisions. This demo is not a legal certification.”

**Slide 9 — Boundaries**  
“No AI counsellor, no parent app, no SMS yet. Those are future phases or change requests. That is how we keep the MVP honest.”

**Slide 10 — Close**  
“Ask: please complete UAT against the documentation spec. After that we can discuss production SQL, Hublio-owned hosting, and support.”

---

## 5. Live demo script (8–10 minutes)

Use **two browser windows** (or two profiles): one for the learner, one for staff. If you only have one window, finish the learner path, sign out, then sign in as teacher.

Wake the app first: open the URL and wait until the login card appears.

### Demo accounts (say these out loud)

| Role | Login | Secret |
|------|-------|--------|
| Learner | `024` | `1234` |
| Teacher | `kholofelo@school.local` | `demo` |
| Admin | `admin@demo.school` | `demo` |

### Journey A — Learner (2 minutes)

**Say:** “Thabiso is in Grade 5. He should be able to check in without email.”

1. Open https://hublio-mivali.onrender.com/login.html  
2. Leave role on **Learner**.  
3. Code `024`, PIN `1234`, **Sign in**.  
4. Point out mood picker. Select **Sad** (or Anxious).  
5. Click **I’m Not Okay**.  
6. Choose **School work** (use this for the demo so it does not auto-escalate; save bullying for the verbal explanation).  
7. Continue → type a short message, e.g. *“I don’t understand today’s maths.”*  
8. **Send my check-in**.  
9. Show the thank-you screen. **Sign out**.

**Say:** “He did not see other learners. A teacher is now notified.”

### Journey B — Teacher (4 minutes)

**Say:** “Ms Kholofelo sees class wellness, not a social feed.”

1. Role **Teacher**. Email `kholofelo@school.local`, password `demo`.  
2. Dashboard: stats + **Active alerts**. Find Thabiso / School work / just now.  
3. Click the alert. Show concern, optional message, case status.  
4. **Acknowledge & start follow-up**.  
5. Type: Private learner conversation. Outcome: **Needs monitoring**. Note: *“Spoke privately. Will check tomorrow.”*  
6. Save. Show status **Monitoring**.  
7. Open **Cases**, then **Reports**. One sentence on counts.  
8. **Sign out**.

**Optional 30 seconds:** mention that **Bullying or safety** can auto-escalate to Critical when that school setting is on.

### Journey C — Admin (2 minutes)

1. Role **Admin**. `admin@demo.school` / `demo`.  
2. **Settings** — school name and auto-escalate checkbox.  
3. **Learners** or **Teachers** — “this is how a school is set up.”  
4. **Audit** — show login, check-in, follow-up in the trail.  
5. Stop. Do not add dummy data live unless you have time.

**Say:** “Admin can see that the action happened. That is the accountability layer.”

---

## 6. If something goes wrong

| Symptom | What to do |
|---------|------------|
| Site spins / “loading” on first visit | Wait up to 60 seconds. Render free tier is waking. |
| Old login (two big buttons) | Hard refresh (Ctrl+F5). If still old, the service is on an old deploy. |
| Wrong password | Confirm role tab matches the account (Learner vs Teacher vs Admin). |
| Demo data looks empty after a new deploy | Seed reset is expected on some deploys. Use the demo accounts anyway; create a check-in live. |
| Internet fails | Switch to local: `node api/server.js` at `C:\Projects\Hublio`. |

Do not debug code in front of the audience. Switch to slides 8–10 and offer a follow-up UAT session.

---

## 7. Questions you should expect

**Is this live for a real school tomorrow?**  
It is a hosted MVP demo. Production needs Hublio-owned hosting, a proper database, real credentials, and UAT sign-off.

**Where is the data stored?**  
The demo uses a secure file store on the server. The production target is SQL (`database/schema.sql`).

**Can parents see this?**  
Not in this MVP.

**What if a learner is in danger?**  
Staff get a Critical / escalated case for safety and home concerns when that rule is enabled. The product does not replace emergency or safeguarding procedure. Schools still follow their own duty-of-care process.

**POPIA?**  
Technical controls are in the build. Legal advice and school policy stay with Hublio / the school.

**Can we add SMS?**  
Yes, as a change request / later phase. Not in the current MVP fee unless already contracted.

---

## 8. Timing plans

### 15-minute version

| Min | Activity |
|-----|----------|
| 0–3 | Slides 1–6 |
| 3–11 | Live demo A + B (skip admin if tight) |
| 11–13 | Slide 8–9 (privacy + exclusions) |
| 13–15 | Ask / next step |

### 25-minute version

Add Journey C, one extra case (escalation explanation), and 5 minutes Q&A.

---

## 9. Leave-behind pack

Send after the meeting (or put in the chat):

1. This file — how to present and demo  
2. `docs/DOCUMENTATION-SPEC.md` — what was built  
3. Live URL and demo accounts  
4. GitHub repo (technical audience only)

**Classification:** Internal. Demo passwords are not for production.

---

## 10. One-sentence close (memorise)

“Hublio now has a working MVP: a learner can say they are not okay, a teacher can respond on the record, and a school can see that it happened — ready for UAT, not yet a full production safeguarding platform.”
