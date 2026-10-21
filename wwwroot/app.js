const API = '/api';

let me = null;
let db = null;
let alerts = [];
let cases = [];
let stats = { feelingOkay: 0, activeAlerts: 0, checkedInPercent: 0, awaitingFollowUp: 0 };
let activity = { learnerLoginsToday: 0, learnerCheckInsToday: 0, recent: [] };
let listFilter = '';
let activeModal = null;
let editRecordId = null;
let clockTimer = null;
let moodBreakdown = [];
let teacherNav = 'Dashboard';
let caseId = '';
let mood = 'Happy';
let concern = 'Bullying or safety';
let learnerMessage = '';
let voiceNoteDataUrl = null;
let voiceMediaRecorder = null;
let voiceRecordStream = null;
let voiceRecordTimer = null;
let voiceRecordSeconds = 0;
const VOICE_MAX_SECONDS = 45;

const currentPage = location.pathname.split('/').pop() || 'index.html';
const pageState = {
  'index.html': ['learner', 'home'],
  'learner.html': ['learner', 'home'],
  'concern.html': ['learner', 'concern'],
  'message.html': ['learner', 'note'],
  'sent.html': ['learner', 'sent'],
  'okay.html': ['learner', 'okay'],
  'dashboard.html': ['staff', 'dashboard'],
  'case.html': ['staff', 'case'],
  'followup.html': ['staff', 'followup'],
  'resolved.html': ['staff', 'resolved'],
};
const statePage = {
  'learner:home': 'learner.html',
  'learner:concern': 'concern.html',
  'learner:note': 'message.html',
  'learner:sent': 'sent.html',
  'learner:okay': 'okay.html',
  'staff:dashboard': 'dashboard.html',
  'staff:case': 'case.html',
  'staff:followup': 'followup.html',
  'staff:resolved': 'resolved.html',
};

let [mode, screen] = pageState[currentPage] || ['learner', 'home'];
const app = document.querySelector('#app');
const brand = `<div class="brand"><img src="mivali-logo.png" alt="Mivali" class="brand-logo" /></div>`;
const ytgCredit = `<footer class="ytg-credit" role="contentinfo"><span>Developed by <strong>Young Tech Giants</strong></span></footer>`;

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) {
    location.href = 'login.html';
    throw new Error('Please sign in');
  }
  if (!res.ok) throw new Error(body.error || 'Request failed');
  return body;
}

async function loadMe() {
  const res = await fetch(`${API}/auth/me`, { credentials: 'same-origin' });
  const body = await res.json();
  me = body.user;
}

async function loadData() {
  db = await api('/dashboard');
  alerts = db.alerts || [];
  cases = db.cases || [];
  stats = db.stats || stats;
  activity = db.activity || activity;
  moodBreakdown = (db.moodBreakdown || []).map((m) => [m.mood, m.count, m.percent, m.color]);
}

function todayLabel() {
  return new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function periodOfDay(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

function timeGreeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function staffClockHtml() {
  const now = new Date();
  const time = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  return `<div class="clock-block"><span class="clock-period" id="clock-period">${periodOfDay(now)}</span><strong class="live-clock" id="live-clock">${time}</strong><span class="clock-date">${todayLabel()}</span></div>`;
}

function staffTopbar(eyebrow, title, extra = '') {
  return `<div class="topbar staff-topbar"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1>${extra}</div>${staffClockHtml()}</div>`;
}

function activityBanner() {
  const logins = activity.learnerLoginsToday ?? 0;
  const checkIns = activity.learnerCheckInsToday ?? stats.learnersCheckedInToday ?? 0;
  return `<div class="activity-alert" role="status"><span class="activity-alert-icon" aria-hidden="true">🔔</span><div><strong>${logins}</strong> learner sign-in${logins === 1 ? '' : 's'} today · <strong>${checkIns}</strong> checked in on the app</div><button type="button" class="link activity-link" onclick="teacherNav='Reports';screen='dashboard';render()">View activity</button></div>`;
}

function directoryToolbar(addLabel, modalId, canAdd = true) {
  const q = esc(listFilter);
  return `<div class="directory-toolbar"><label class="filter-field">Filter by name<input type="search" placeholder="Search name…" value="${q}" oninput="listFilter=this.value;render()"></label>${
    canAdd ? `<button type="button" class="btn btn-primary btn-sm" onclick="openModal('${modalId}')">${addLabel}</button>` : ''
  }</div>`;
}

function filterByName(items, key = 'name') {
  const q = listFilter.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => String(item[key] || '').toLowerCase().includes(q));
}

function modalLayer() {
  if (!activeModal) return '';
  const closeBtn = `<button type="button" class="modal-close" onclick="closeModal()" aria-label="Close">×</button>`;
  if (activeModal === 'add-learner') {
    return `<div class="modal-backdrop" onclick="closeModal()"></div><div class="modal" role="dialog" aria-labelledby="modal-title">${closeBtn}<h3 id="modal-title">Add learner</h3>
      <form class="inline-form modal-form" onsubmit="return createLearner(event)">
        <div class="fields">
          <div class="field"><label>Name</label><input name="name" required autofocus></div>
          <div class="field"><label>Code</label><input name="code" placeholder="032"></div>
          <div class="field"><label>Grade</label><input name="grade" placeholder="Grade 5B"></div>
          <div class="field"><label>Class</label><input name="className" placeholder="Class 2B"></div>
          <div class="field"><label>PIN</label><input name="pin" value="1234"></div>
        </div>
        <div class="modal-actions"><button class="btn btn-light" type="button" onclick="closeModal()">Cancel</button><button class="btn btn-primary" type="submit">Save learner</button></div>
      </form></div>`;
  }
  if (activeModal === 'add-teacher') {
    return `<div class="modal-backdrop" onclick="closeModal()"></div><div class="modal" role="dialog">${closeBtn}<h3>Add teacher</h3>
      <form class="inline-form modal-form" onsubmit="return createTeacher(event)">
        <div class="fields">
          <div class="field"><label>Name</label><input name="name" required autofocus></div>
          <div class="field"><label>Email</label><input name="email" type="email" required></div>
          <div class="field"><label>Class</label><input name="className"></div>
          <div class="field"><label>Temp password</label><input name="password" value="demo"></div>
        </div>
        <div class="modal-actions"><button class="btn btn-light" type="button" onclick="closeModal()">Cancel</button><button class="btn btn-primary" type="submit">Save teacher</button></div>
      </form></div>`;
  }
  if (activeModal === 'add-class') {
    return `<div class="modal-backdrop" onclick="closeModal()"></div><div class="modal" role="dialog">${closeBtn}<h3>Add class</h3>
      <form class="inline-form modal-form" onsubmit="return createClass(event)">
        <div class="fields">
          <div class="field"><label>Name</label><input name="name" required autofocus></div>
          <div class="field"><label>Grade</label><input name="grade"></div>
          <div class="field"><label>Teacher ID</label><input name="teacherId" value="1"></div>
        </div>
        <div class="modal-actions"><button class="btn btn-light" type="button" onclick="closeModal()">Cancel</button><button class="btn btn-primary" type="submit">Save class</button></div>
      </form></div>`;
  }
  if (activeModal === 'edit-learner') {
    const l = (db.learners || []).find((x) => String(x.id) === String(editRecordId));
    if (!l) return '';
    return `<div class="modal-backdrop" onclick="closeModal()"></div><div class="modal" role="dialog">${closeBtn}<h3>Edit learner</h3>
      <form class="inline-form modal-form" onsubmit="return updateLearner(event)">
        <input type="hidden" name="id" value="${esc(l.id)}">
        <div class="fields">
          <div class="field"><label>Name</label><input name="name" value="${esc(l.name)}" required autofocus></div>
          <div class="field"><label>Code</label><input name="code" value="${esc(l.code)}" required></div>
          <div class="field"><label>Grade</label><input name="grade" value="${esc(l.grade)}"></div>
          <div class="field"><label>Class</label><input name="className" value="${esc(l.className)}"></div>
          <div class="field"><label>New PIN (optional)</label><input name="pin" placeholder="Leave blank to keep current"></div>
        </div>
        <div class="modal-actions"><button class="btn btn-light" type="button" onclick="closeModal()">Cancel</button><button class="btn btn-primary" type="submit">Save changes</button></div>
      </form></div>`;
  }
  if (activeModal === 'edit-teacher') {
    const t = (db.teachers || []).find((x) => String(x.id) === String(editRecordId));
    if (!t) return '';
    return `<div class="modal-backdrop" onclick="closeModal()"></div><div class="modal" role="dialog">${closeBtn}<h3>Edit teacher</h3>
      <form class="inline-form modal-form" onsubmit="return updateTeacher(event)">
        <input type="hidden" name="id" value="${esc(t.id)}">
        <div class="fields">
          <div class="field"><label>Name</label><input name="name" value="${esc(t.name)}" required autofocus></div>
          <div class="field"><label>Email</label><input name="email" type="email" value="${esc(t.email)}" required></div>
          <div class="field"><label>Class</label><input name="className" value="${esc(t.className)}"></div>
          <div class="field"><label>New password (optional)</label><input name="password" placeholder="Leave blank to keep current"></div>
        </div>
        <div class="modal-actions"><button class="btn btn-light" type="button" onclick="closeModal()">Cancel</button><button class="btn btn-primary" type="submit">Save changes</button></div>
      </form></div>`;
  }
  if (activeModal === 'edit-class') {
    const c = (db.classes || []).find((x) => String(x.id) === String(editRecordId));
    if (!c) return '';
    return `<div class="modal-backdrop" onclick="closeModal()"></div><div class="modal" role="dialog">${closeBtn}<h3>Edit class</h3>
      <form class="inline-form modal-form" onsubmit="return updateClass(event)">
        <input type="hidden" name="id" value="${esc(c.id)}">
        <div class="fields">
          <div class="field"><label>Name</label><input name="name" value="${esc(c.name)}" required autofocus></div>
          <div class="field"><label>Grade</label><input name="grade" value="${esc(c.grade)}"></div>
          <div class="field"><label>Teacher ID</label><input name="teacherId" value="${esc(c.teacherId)}"></div>
        </div>
        <div class="modal-actions"><button class="btn btn-light" type="button" onclick="closeModal()">Cancel</button><button class="btn btn-primary" type="submit">Save changes</button></div>
      </form></div>`;
  }
  return '';
}

function startLiveClock() {
  if (clockTimer) clearInterval(clockTimer);
  clockTimer = setInterval(() => {
    const clock = document.getElementById('live-clock');
    const period = document.getElementById('clock-period');
    if (!clock) return;
    const now = new Date();
    clock.textContent = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' });
    if (period) period.textContent = periodOfDay(now);
  }, 1000);
}

function badgeClass(status) {
  if (status === 'Resolved') return 'green';
  if (status === 'Escalated' || status === 'Critical') return 'red';
  if (status === 'Acknowledged' || status === 'Monitoring' || status === 'Attention') return 'orange';
  return 'purple';
}

function phone(content, nav = true) {
  const learnerName = me?.learner?.name || me?.name || 'Learner';
  const now = new Date();
  const phoneClock = `<div class="phone-clock"><span>${periodOfDay(now)}</span><strong id="live-clock">${now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</strong></div>`;
  return `<div class="phone-wrap"><div class="phone"><div class="phone-head">${brand}${phoneClock}<span class="avatar">👦</span></div><div class="phone-content">${content}</div>${nav ? `<div class="bottom-nav"><b>⌂<br>Home</b><span>✓<br>Check-in</span><span>▱<br>Inbox</span><span>♧<br>Profile</span></div>` : ''}</div></div><div class="demo-note">Signed in as ${esc(learnerName)}</div>`;
}

function learner() {
  const learnerName = me?.learner?.name || me?.name || 'Learner';
  const teacherName = db?.teacher?.name || 'your teacher';

  if (screen === 'home')
    return phone(
      `<span class="eyebrow">${new Date().toLocaleDateString(undefined, { weekday: 'long' })} check-in</span><p class="learner-identity">Which learner is this? <strong>${esc(learnerName)}</strong></p><h1>${timeGreeting()},<br>${esc(learnerName)} ⭐</h1><p>How are you feeling today?</p><div class="moods">${[
        ['😊', 'Happy'],
        ['😐', 'Okay'],
        ['😴', 'Tired'],
        ['😰', 'Anxious'],
        ['😢', 'Sad'],
        ['🤢', 'Sick'],
      ]
        .map(
          (x) =>
            `<button class="mood ${mood === x[1] ? 'selected' : ''}" onclick="mood='${x[1]}';render()"><span>${x[0]}</span>${x[1]}</button>`
        )
        .join('')}</div><div class="big-actions"><button class="btn btn-safe" onclick="handleOkay()">I'M OKAY<small>Everything is going great!</small></button><button class="btn btn-alert" onclick="screen='concern';render()">I'M NOT OKAY<small>I'd like to talk to a teacher</small></button><button class="link" onclick="logout()">Sign out</button></div>`
    );
  if (screen === 'concern')
    return phone(
      `<button class="back" onclick="screen='home';render()">←</button><span class="eyebrow" style="margin-top:25px">Step 1 of 2 · ${esc(learnerName)}</span><p class="learner-identity">Learner: <strong>${esc(learnerName)}</strong></p><h1>What is worrying you, ${esc(learnerName)}?</h1><p>Choose the one that feels closest. Your teacher will listen.</p><div class="concerns">${[
        'Bullying or safety',
        'Friends or classmates',
        'School work',
        'Home or family',
        'I feel sick',
        'Something else',
      ]
        .map(
          (x) =>
            `<button class="concern ${concern === x ? 'selected' : ''}" onclick="concern='${x.replace(/'/g, "\\'")}';render()">${x === 'Bullying or safety' ? '🛡️' : x === 'School work' ? '📚' : x === 'I feel sick' ? '🤒' : '💬'} &nbsp; ${x}</button>`
        )
        .join('')}</div><div class="big-actions"><button class="btn btn-primary" onclick="screen='note';render()">Continue →</button></div>`,
      false
    );
  if (screen === 'note')
    return phone(
      `<button class="back" onclick="screen='concern';render()">←</button><span class="eyebrow" style="margin-top:25px">Step 2 of 2 · Optional</span><h1>Would you like to tell us more?</h1><p>Type a short note or record a voice message — both are optional. A teacher will still check on you.</p><label class="field-label" for="learner-message">Type a message</label><textarea id="learner-message" class="textarea" maxlength="280" placeholder="Write here if you want to…" oninput="learnerMessage=this.value">${esc(learnerMessage)}</textarea><div class="voice-panel"><p class="voice-label">Or record a voice message</p><div class="voice-controls"><button type="button" class="btn btn-light voice-btn" id="voice-record-btn">🎙 Start recording</button><button type="button" class="btn btn-light voice-btn" id="voice-clear-btn" hidden>Remove recording</button></div><p class="voice-status" id="voice-status">Up to ${VOICE_MAX_SECONDS} seconds</p><audio id="voice-preview" class="voice-preview" controls hidden></audio></div><div class="big-actions"><button class="btn btn-alert" onclick="handleSendCheckIn()">Send my check-in</button><button class="btn btn-light" onclick="handleSendCheckIn(true)">Skip message</button></div>`,
      false
    );
  if (screen === 'sent')
    return phone(
      `<div class="success"><div class="check">✓</div><span class="eyebrow">Check-in sent</span><h1>Thank you for telling us.</h1><p>${esc(teacherName)} has been notified and will check in with you soon.</p><div style="height:24px"></div><button class="btn btn-primary" onclick="screen='home';render()">Back to home</button></div>`,
      false
    );
  return phone(
    `<div class="success"><div class="check">✓</div><h1>Glad you're okay!</h1><p>Your check-in has been saved. Have a brilliant day, ${esc(learnerName)}.</p><div style="height:24px"></div><button class="btn btn-safe" onclick="screen='home';render()">Done</button></div>`,
    false
  );
}

function navItems() {
  if (me?.role === 'admin') return ['Dashboard', 'Learners', 'Teachers', 'Classes', 'Alerts', 'Cases', 'Reports', 'Audit', 'Settings'];
  return ['Dashboard', 'Learners', 'Alerts', 'Cases', 'Reports', 'Settings'];
}

function sidebar(active) {
  const name = me?.name || db?.teacher?.name || 'Staff';
  const roleLabel = me?.role === 'admin' ? 'School admin' : `Teacher · ${esc(db?.teacher?.className || '')}`;
  return `<aside class="sidebar">${brand}<nav class="nav">${navItems()
    .map((x) => `<button class="${active === x ? 'active' : ''}" onclick="teacherNav='${x}';screen='dashboard';render()">${icon(x)} &nbsp; ${x}</button>`)
    .join('')}</nav><div class="profile"><span class="avatar">👩</span><div><b>${esc(name)}</b><br><small>${roleLabel}</small><button type="button" class="btn-signout" onclick="logout()">Sign out</button></div></div></aside>`;
}

function icon(name) {
  return { Dashboard: '▦', Learners: '♙', Teachers: '♟', Classes: '▣', Alerts: '♧', Cases: '▤', Reports: '▥', Audit: '📋', Settings: '⚙' }[name] || '•';
}

function alertRow(a) {
  return `<div class="alert" onclick="openCase('${esc(a.caseId || a.id)}')"><span class="learner-id">${esc(a.learnerCode || a.id)}</span><div><strong>${esc(a.name)} · ${esc(a.type)}</strong><small>${esc(a.grade)} · ${esc(a.time)} · ${esc(a.status)}</small></div><span class="badge ${a.color || badgeClass(a.level)}">${esc(a.level)}</span></div>`;
}

function staffDashboard() {
  const tName = me?.name || 'there';
  const openAlerts = alerts.filter((a) => a.status !== 'Resolved');
  return `${staffTopbar(`${esc(db?.school?.name || 'School')} · ${me?.role === 'admin' ? 'Admin' : 'Teacher'} portal`, 'Dashboard overview')}${activityBanner()}<section class="hero"><div><span class="eyebrow" style="color:#bfaee7">Class wellness</span><h2>${timeGreeting()}, ${esc(tName)}</h2><p>Here's how your learners are doing today.</p></div><div class="date-pill">${todayLabel()}</div></section><div class="stats"><div class="stat"><div class="icon green">✓</div><strong>${stats.feelingOkay}</strong><span>Feeling okay</span></div><div class="stat"><div class="icon red">!</div><strong>${stats.activeAlerts}</strong><span>Active alerts</span></div><div class="stat"><div class="icon purple">⌁</div><strong>${stats.checkedInPercent}%</strong><span>Checked in</span></div><div class="stat"><div class="icon orange">◷</div><strong>${stats.awaitingFollowUp}</strong><span>Open cases</span></div></div><div class="grid"><section class="panel"><div class="panel-head"><h3>Active alerts</h3><button class="link" onclick="teacherNav='Alerts';render()">View all</button></div>${openAlerts.length ? openAlerts.map(alertRow).join('') : '<p class="empty">No active alerts.</p>'}</section><section class="panel"><div class="panel-head"><h3>Today's check-ins</h3></div>${moodBreakdown
    .map((x) => `<div class="bar-row"><div class="bar-label"><span>${esc(x[0])}</span><b>${x[1]}</b></div><div class="bar"><i style="width:${x[2]}%;background:${x[3]}"></i></div></div>`)
    .join('') || '<p class="empty">No check-ins yet.</p>'}</section></div>`;
}

function table(headers, rows) {
  const cols = headers.length;
  return `<div class="table-wrap"><table class="data-table"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="${cols}">No records yet.</td></tr>`}</tbody></table></div>`;
}

function rowActions(type, id) {
  const safeId = encodeURIComponent(String(id));
  const editKind = type === 'learners' ? 'learner' : type === 'teachers' ? 'teacher' : 'class';
  return `<span class="row-actions"><button type="button" class="link row-edit" onclick="openEditModal('${editKind}','${safeId}')">Edit</button><button type="button" class="link row-delete" onclick="deleteRecord('${type}','${safeId}')">Delete</button></span>`;
}

function exportToolbar(kind) {
  return `<div class="export-toolbar"><button type="button" class="btn btn-light btn-sm" onclick="shareReport('${kind}')">Share</button><button type="button" class="btn btn-light btn-sm" onclick="printReport('${kind}')">Print</button><button type="button" class="btn btn-light btn-sm" onclick="downloadReportCsv('${kind}')">Download CSV</button><button type="button" class="btn btn-light btn-sm" onclick="downloadReportPdf('${kind}')">Download PDF</button></div>`;
}

function learnersView() {
  const items = filterByName(db.learners || []);
  const rows = items
    .map(
      (l) =>
        `<tr><td>${esc(l.code)}</td><td>${esc(l.name)}</td><td>${esc(l.grade)}</td><td>${esc(l.className)}</td><td>${rowActions('learners', l.id)}</td></tr>`
    )
    .join('');
  const empty = items.length ? rows : `<tr><td colspan="5">${listFilter.trim() ? 'No learners match that name.' : 'No records yet.'}</td></tr>`;
  return `${staffTopbar('Directory', 'Learners')}${activityBanner()}<section class="panel">${directoryToolbar('+ Add learner', 'add-learner')}${table(['Code', 'Name', 'Grade', 'Class', 'Actions'], empty)}</section>`;
}

function teachersView() {
  const items = filterByName(db.teachers || []);
  const rows = items
    .map((t) => `<tr><td>${esc(t.name)}</td><td>${esc(t.email)}</td><td>${esc(t.className)}</td><td>${rowActions('teachers', t.id)}</td></tr>`)
    .join('');
  const empty = items.length ? rows : `<tr><td colspan="4">${listFilter.trim() ? 'No teachers match that name.' : 'No records yet.'}</td></tr>`;
  return `${staffTopbar('Administration', 'Teachers')}${activityBanner()}<section class="panel">${directoryToolbar('+ Add teacher', 'add-teacher')}${table(['Name', 'Email', 'Class', 'Actions'], empty)}</section>`;
}

function classesView() {
  const items = filterByName(db.classes || [], 'name');
  const rows = items
    .map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(c.grade)}</td><td>${esc(c.teacherId)}</td><td>${rowActions('classes', c.id)}</td></tr>`)
    .join('');
  const empty = items.length ? rows : `<tr><td colspan="4">${listFilter.trim() ? 'No classes match that name.' : 'No records yet.'}</td></tr>`;
  return `${staffTopbar('Administration', 'Classes / grades')}${activityBanner()}<section class="panel">${directoryToolbar('+ Add class', 'add-class')}${table(['Class', 'Grade', 'Teacher ID', 'Actions'], empty)}</section>`;
}

function alertsView() {
  return `<div class="topbar"><div><span class="eyebrow">Response</span><h1>Alerts</h1></div></div><section class="panel">${alerts.map(alertRow).join('') || '<p class="empty">No alerts.</p>'}</section>`;
}

function casesView() {
  const rows = (cases || [])
    .map(
      (c) =>
        `<tr class="click-row" onclick="openCase('${esc(c.id)}')"><td>${esc(c.id)}</td><td>${esc(c.learnerName)}</td><td>${esc(c.concern)}</td><td><span class="badge ${badgeClass(c.status)}">${esc(c.status)}</span></td></tr>`
    )
    .join('');
  return `<div class="topbar"><div><span class="eyebrow">Case management</span><h1>Cases</h1></div></div><section class="panel">${table(['Case', 'Learner', 'Concern', 'Status'], rows)}</section>`;
}

function reportsView() {
  const r = db.reports || {};
  const recent = (activity.recent || [])
    .map(
      (ev) =>
        `<li><span class="badge ${ev.kind === 'login' ? 'purple' : 'green'}">${ev.kind === 'login' ? 'Sign-in' : 'Check-in'}</span> ${esc(ev.label)} <small>${esc(String(ev.at || '').replace('T', ' ').slice(0, 16))}</small></li>`
    )
    .join('');
  return `${staffTopbar('Reporting', 'Basic activity')}${activityBanner()}${exportToolbar('reports')}<div id="print-area-reports" class="print-area"><div class="stats"><div class="stat"><strong>${activity.learnerLoginsToday || 0}</strong><span>Learner sign-ins today</span></div><div class="stat"><strong>${activity.learnerCheckInsToday || 0}</strong><span>Check-ins today</span></div><div class="stat"><strong>${r.totalAlerts || 0}</strong><span>Alerts</span></div><div class="stat"><strong>${r.openCases || 0}</strong><span>Open cases</span></div></div>
    <section class="panel"><h3>Recent learner activity</h3><ul class="timeline">${recent || '<li>No learner sign-ins or check-ins yet today.</li>'}</ul></section>
    <div class="grid"><section class="panel"><h3>By concern</h3>${(r.byConcern || []).map((x) => `<div class="bar-row"><div class="bar-label"><span>${esc(x.label)}</span><b>${x.count}</b></div></div>`).join('') || '<p class="empty">No data yet.</p>'}</section>
    <section class="panel"><h3>By case status</h3>${(r.byStatus || []).map((x) => `<div class="bar-row"><div class="bar-label"><span>${esc(x.label)}</span><b>${x.count}</b></div></div>`).join('') || '<p class="empty">No data yet.</p>'}</section></div></div>`;
}

function auditView() {
  const rows = (db.audit || [])
    .map((a) => `<tr><td>${esc(a.at).replace('T', ' ').slice(0, 16)}</td><td>${esc(a.actor)}</td><td>${esc(a.role)}</td><td>${esc(a.action)}</td><td>${esc(a.detail)}</td></tr>`)
    .join('');
  return `${staffTopbar('Accountability', 'Audit trail')}${exportToolbar('audit')}<section id="print-area-audit" class="panel print-area">${table(['When', 'Who', 'Role', 'Action', 'Detail'], rows)}</section>`;
}

function settingsView() {
  const s = db.school || {};
  if (me?.role !== 'admin') {
    return `${staffTopbar('Account', 'Settings')}<section class="panel"><p>Signed in as <b>${esc(me?.name)}</b> (${esc(me?.role)}).</p><p>Learner records are limited to your assigned class.</p><button type="button" class="btn btn-light" onclick="logout()">Sign out</button></section>`;
  }
  return `${staffTopbar('School administration', 'School configuration')}<section class="panel"><button type="button" class="btn btn-light settings-signout" onclick="logout()">Sign out</button>
    <form class="inline-form" onsubmit="return saveSchool(event)">
      <div class="fields">
        <div class="field"><label>School name</label><input name="name" value="${esc(s.name)}" required></div>
        <div class="field"><label>Check-in window</label><input name="checkInWindow" value="${esc(s.checkInWindow)}"></div>
        <div class="field full"><label><input type="checkbox" name="escalateSafetyImmediately" ${s.escalateSafetyImmediately ? 'checked' : ''}> Auto-escalate bullying / safety and home-or-family concerns</label></div>
      </div>
      <button class="btn btn-primary" type="submit">Save configuration</button>
    </form></section>`;
}

function caseView() {
  const cse = cases.find((c) => c.id === caseId) || cases.find((c) => c.alertId === caseId) || cases[0];
  const a = alerts.find((x) => x.caseId === cse?.id || x.id === cse?.alertId) || alerts[0];
  if (!cse && !a) return `<section class="panel"><p>No case selected.</p></section>`;
  const item = cse || {};
  const msg = item.message || a?.message || '';
  const voice = item.voiceNote || a?.voiceNote || '';
  const voiceHtml = voice
    ? `<div class="case-voice"><small>VOICE MESSAGE</small><audio controls class="voice-playback" src="${voice}"></audio></div>`
    : '';
  const history = (item.history || []).map((h) => `<li><b>${esc(h.event)}</b><small> · ${esc(h.by)} · ${esc(h.at).replace('T', ' ').slice(0, 16)}</small>${h.note ? `<p>${esc(h.note)}</p>` : ''}</li>`).join('');
  return `<div class="topbar"><div><button class="back" onclick="teacherNav='Cases';screen='dashboard';render()">←</button><span class="eyebrow" style="margin-left:15px">Case file · ${esc(item.id || a.id)}</span><h1 style="margin-top:12px">${esc(a?.type || item.concern || 'Learner case')}</h1></div><span class="badge ${badgeClass(item.status || a?.status)}">${esc(item.status || a?.status)}</span></div>
    <div class="case-wrap"><div class="case-card"><div class="panel-head"><div><h3>${esc(item.learnerName || a?.name)}</h3><p>${esc(item.grade || a?.grade)} · Code ${esc(item.learnerCode || a?.learnerCode)}</p></div><span class="learner-id">${esc(item.learnerCode || a?.id)}</span></div>
    <div class="case-meta"><span class="badge orange">${esc(item.concern || a?.concern)}</span><span class="badge ${badgeClass(a?.level)}">${esc(a?.level || 'Alert')}</span></div>
    <div class="case-note"><small>LEARNER'S OPTIONAL MESSAGE</small><p>${msg ? `"${esc(msg)}"` : voice ? 'Voice message only.' : 'No message provided.'}</p>${voiceHtml}</div>
    <h3>Case history</h3><ul class="timeline">${history || '<li>No history yet.</li>'}</ul>
    <div class="big-actions" style="max-width:360px;margin-top:25px">
      ${a?.status === 'Open' ? `<button class="btn btn-primary" onclick="acknowledgeCase('${esc(a.id)}','${esc(item.id)}')">Acknowledge & start follow-up</button>` : `<button class="btn btn-primary" onclick="screen='followup';render()">Record follow-up</button>`}
    </div></div></div>`;
}

function followUpView() {
  const cse = cases.find((c) => c.id === caseId) || cases[0];
  return `<div class="topbar"><div><span class="eyebrow">Case file · ${esc(cse?.id)}</span><h1>Log learner follow-up</h1></div><span class="badge purple">${esc(cse?.status)}</span></div>
    <div class="case-wrap"><div class="case-card"><h3>What action was taken?</h3><p>Record only the information needed to support the learner.</p>
    <form onsubmit="return saveFollowUp(event)">
      <div class="fields">
        <div class="field"><label>FOLLOW-UP TYPE</label><select name="type"><option>Private learner conversation</option><option>Counsellor referral</option><option>Guardian contacted</option><option>Duty teacher monitoring</option></select></div>
        <div class="field"><label>OUTCOME</label><select name="outcome"><option>Resolved locally</option><option>Needs monitoring</option><option>Escalated</option></select></div>
        <div class="field full"><label>PRIVATE CASE NOTE</label><textarea name="note" rows="5" maxlength="2000" placeholder="Keep notes factual and minimal."></textarea></div>
      </div>
      <div class="big-actions" style="max-width:360px"><button class="btn btn-safe" type="submit">Save follow-up</button><button class="btn btn-light" type="button" onclick="screen='case';render()">Return to case</button></div>
    </form></div></div>`;
}

function resolvedView() {
  const cse = cases.find((c) => c.id === caseId) || {};
  return `<div class="topbar"><div><span class="eyebrow">Case file · ${esc(cse.id)}</span><h1>Follow-up saved</h1></div></div><div class="case-wrap"><div class="case-card success" style="min-height:420px;display:flex;flex-direction:column;justify-content:center"><div class="check">✓</div><h1>Case updated</h1><p>Status is now <b>${esc(cse.status || 'updated')}</b>.</p><button class="btn btn-primary" style="max-width:360px;margin:24px auto 0;width:100%" onclick="teacherNav='Dashboard';screen='dashboard';render()">Return to dashboard</button></div></div>`;
}

function staff() {
  let content = '';
  if (screen === 'case') content = caseView();
  else if (screen === 'followup') content = followUpView();
  else if (screen === 'resolved') content = resolvedView();
  else {
    const views = {
      Dashboard: staffDashboard,
      Learners: learnersView,
      Teachers: teachersView,
      Classes: classesView,
      Alerts: alertsView,
      Cases: casesView,
      Reports: reportsView,
      Audit: auditView,
      Settings: settingsView,
    };
    content = (views[teacherNav] || staffDashboard)();
  }
  const side = screen === 'dashboard' ? teacherNav : 'Cases';
  return `<div class="shell">${sidebar(side)}<main class="main">${content}</main></div>${modalLayer()}<div class="demo-note">Mivali · Phase 3 MVP · ${esc(me?.role)}</div>`;
}

function render() {
  if (!app) return;
  const key = `${mode}:${screen}`;
  const target = statePage[key];
  if (target && location.pathname.split('/').pop() !== target) history.pushState({ mode, screen, teacherNav, caseId }, '', target);
  app.innerHTML = (mode === 'learner' ? learner() : staff()) + ytgCredit;
  if (mode === 'staff' || mode === 'learner') startLiveClock();
  if (mode === 'learner' && screen === 'note') setupVoiceMessageUi();
  window.scrollTo(0, 0);
}

function stopVoiceRecordingInternal() {
  if (voiceRecordTimer) {
    clearInterval(voiceRecordTimer);
    voiceRecordTimer = null;
  }
  if (voiceMediaRecorder && voiceMediaRecorder.state === 'recording') voiceMediaRecorder.stop();
}

function resetVoiceStream() {
  if (voiceRecordStream) {
    voiceRecordStream.getTracks().forEach((t) => t.stop());
    voiceRecordStream = null;
  }
}

function setupVoiceMessageUi() {
  const recordBtn = document.getElementById('voice-record-btn');
  const clearBtn = document.getElementById('voice-clear-btn');
  const statusEl = document.getElementById('voice-status');
  const preview = document.getElementById('voice-preview');
  if (!recordBtn || !statusEl) return;

  const syncPreview = () => {
    if (preview && voiceNoteDataUrl) {
      preview.src = voiceNoteDataUrl;
      preview.hidden = false;
      if (clearBtn) clearBtn.hidden = false;
      statusEl.textContent = 'Recording saved — tap Send or record again.';
    }
  };
  syncPreview();

  recordBtn.onclick = async () => {
    if (voiceMediaRecorder && voiceMediaRecorder.state === 'recording') {
      stopVoiceRecordingInternal();
      recordBtn.textContent = '🎙 Start recording';
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      statusEl.textContent = 'Voice recording is not supported on this browser.';
      return;
    }
    try {
      resetVoiceStream();
      voiceRecordStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      voiceMediaRecorder = new MediaRecorder(voiceRecordStream);
      voiceRecordSeconds = 0;
      statusEl.textContent = 'Recording… 0s';
      recordBtn.textContent = '⏹ Stop recording';
      voiceMediaRecorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      voiceMediaRecorder.onstop = () => {
        resetVoiceStream();
        if (!chunks.length) return;
        const blob = new Blob(chunks, { type: voiceMediaRecorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          voiceNoteDataUrl = reader.result;
          syncPreview();
        };
        reader.readAsDataURL(blob);
        recordBtn.textContent = '🎙 Start recording';
      };
      voiceMediaRecorder.start();
      voiceRecordTimer = setInterval(() => {
        voiceRecordSeconds += 1;
        statusEl.textContent = `Recording… ${voiceRecordSeconds}s`;
        if (voiceRecordSeconds >= VOICE_MAX_SECONDS) stopVoiceRecordingInternal();
      }, 1000);
    } catch {
      statusEl.textContent = 'Microphone access was blocked. Allow the mic to record.';
      resetVoiceStream();
    }
  };

  if (clearBtn) {
    clearBtn.onclick = () => {
      voiceNoteDataUrl = null;
      if (preview) {
        preview.hidden = true;
        preview.removeAttribute('src');
      }
      clearBtn.hidden = true;
      statusEl.textContent = `Up to ${VOICE_MAX_SECONDS} seconds`;
    };
  }
}

window.openModal = (id) => {
  activeModal = id;
  editRecordId = null;
  render();
};

window.openEditModal = (kind, id) => {
  activeModal = `edit-${kind}`;
  editRecordId = decodeURIComponent(id);
  render();
};

window.closeModal = () => {
  activeModal = null;
  editRecordId = null;
  render();
};

window.openCase = (id) => {
  caseId = id;
  screen = 'case';
  render();
};

window.acknowledgeCase = async (alertId, id) => {
  await api(`/alerts/${alertId}`, { method: 'PUT', body: JSON.stringify({ acknowledge: true }) });
  caseId = id;
  await loadData();
  screen = 'followup';
  render();
};

window.saveFollowUp = async (event) => {
  event.preventDefault();
  const form = event.target;
  await api(`/cases/${caseId}/followups`, {
    method: 'POST',
    body: JSON.stringify({ type: form.type.value, outcome: form.outcome.value, note: form.note.value }),
  });
  await loadData();
  screen = 'resolved';
  render();
  return false;
};

window.createLearner = async (event) => {
  event.preventDefault();
  const f = event.target;
  await api('/learners', {
    method: 'POST',
    body: JSON.stringify({ name: f.name.value, code: f.code.value, grade: f.grade.value, className: f.className.value, pin: f.pin.value }),
  });
  await loadData();
  activeModal = null;
  render();
  return false;
};

window.createTeacher = async (event) => {
  event.preventDefault();
  const f = event.target;
  await api('/teachers', {
    method: 'POST',
    body: JSON.stringify({ name: f.name.value, email: f.email.value, className: f.className.value, password: f.password.value }),
  });
  await loadData();
  activeModal = null;
  render();
  return false;
};

window.createClass = async (event) => {
  event.preventDefault();
  const f = event.target;
  await api('/classes', {
    method: 'POST',
    body: JSON.stringify({ name: f.name.value, grade: f.grade.value, teacherId: f.teacherId.value }),
  });
  await loadData();
  activeModal = null;
  render();
  return false;
};

window.updateLearner = async (event) => {
  event.preventDefault();
  const f = event.target;
  const body = { name: f.name.value, code: f.code.value, grade: f.grade.value, className: f.className.value };
  if (f.pin.value.trim()) body.pin = f.pin.value;
  await api(`/learners/${encodeURIComponent(f.id.value)}`, { method: 'PUT', body: JSON.stringify(body) });
  await loadData();
  closeModal();
  return false;
};

window.updateTeacher = async (event) => {
  event.preventDefault();
  const f = event.target;
  const body = { name: f.name.value, email: f.email.value, className: f.className.value };
  if (f.password.value.trim()) body.password = f.password.value;
  await api(`/teachers/${encodeURIComponent(f.id.value)}`, { method: 'PUT', body: JSON.stringify(body) });
  await loadData();
  closeModal();
  return false;
};

window.updateClass = async (event) => {
  event.preventDefault();
  const f = event.target;
  await api(`/classes/${encodeURIComponent(f.id.value)}`, {
    method: 'PUT',
    body: JSON.stringify({ name: f.name.value, grade: f.grade.value, teacherId: f.teacherId.value }),
  });
  await loadData();
  closeModal();
  return false;
};

window.saveSchool = async (event) => {
  event.preventDefault();
  const f = event.target;
  await api('/school', {
    method: 'PUT',
    body: JSON.stringify({
      name: f.name.value,
      checkInWindow: f.checkInWindow.value,
      escalateSafetyImmediately: f.escalateSafetyImmediately.checked,
    }),
  });
  await loadData();
  render();
  return false;
};

window.logout = async () => {
  await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'same-origin' });
  location.href = 'login.html';
};

window.deleteRecord = async (type, id) => {
  const label = type === 'learners' ? 'learner' : type === 'teachers' ? 'teacher' : 'class';
  if (!confirm(`Delete this ${label}? They will be removed from the directory.`)) return;
  await api(`/${type}/${decodeURIComponent(id)}`, { method: 'DELETE' });
  await loadData();
  render();
};

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadBlob(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function reportSummaryLines() {
  const r = db.reports || {};
  const lines = [
    ['Mivali activity report', todayLabel()],
    ['Learner sign-ins today', activity.learnerLoginsToday || 0],
    ['Check-ins today', activity.learnerCheckInsToday || 0],
    ['Total alerts', r.totalAlerts || 0],
    ['Open cases', r.openCases || 0],
    [],
    ['Recent activity', 'When'],
  ];
  (activity.recent || []).forEach((ev) => lines.push([ev.label, String(ev.at || '').replace('T', ' ').slice(0, 16)]));
  lines.push([], ['By concern', 'Count']);
  (r.byConcern || []).forEach((x) => lines.push([x.label, x.count]));
  lines.push([], ['By case status', 'Count']);
  (r.byStatus || []).forEach((x) => lines.push([x.label, x.count]));
  return lines;
}

window.downloadReportCsv = (kind) => {
  let rows;
  if (kind === 'audit') {
    rows = [['When', 'Who', 'Role', 'Action', 'Detail']];
    (db.audit || []).forEach((a) => rows.push([a.at, a.actor, a.role, a.action, a.detail]));
  } else {
    rows = reportSummaryLines();
  }
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  downloadBlob(`mivali-${kind}-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8');
};

window.downloadReportPdf = (kind) => {
  const areaId = kind === 'audit' ? 'print-area-audit' : 'print-area-reports';
  const area = document.getElementById(areaId);
  if (!area) return;
  const w = window.open('', '_blank');
  if (!w) {
    printReport(kind);
    return;
  }
  w.document.write(`<!doctype html><html><head><title>Mivali ${kind}</title><link rel="stylesheet" href="styles.css"></head><body><h1>Mivali ${kind === 'audit' ? 'Audit trail' : 'Activity report'}</h1><p>${todayLabel()}</p>${area.innerHTML}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
};

window.printReport = (kind) => {
  document.body.classList.add('print-mode');
  document.body.dataset.printTarget = kind === 'audit' ? 'audit' : 'reports';
  window.print();
  window.addEventListener(
    'afterprint',
    () => {
      document.body.classList.remove('print-mode');
      delete document.body.dataset.printTarget;
    },
    { once: true }
  );
};

window.shareReport = async (kind) => {
  const lines =
    kind === 'audit'
      ? (db.audit || []).slice(0, 15).map((a) => `${a.at}: ${a.actor} — ${a.action}`)
      : reportSummaryLines()
          .filter((r) => r.length)
          .map((r) => r.join(': '));
  const text = `Mivali ${kind} (${todayLabel()})\n\n${lines.join('\n')}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: `Mivali ${kind}`, text });
      return;
    } catch {
      /* fall through */
    }
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    alert('Report summary copied — paste into email or WhatsApp to share.');
  } else {
    prompt('Copy this report summary:', text);
  }
};

window.handleOkay = async () => {
  await api('/checkin', { method: 'POST', body: JSON.stringify({ mood, isOkay: true }) });
  screen = 'okay';
  render();
};

window.handleSendCheckIn = async (skip) => {
  stopVoiceRecordingInternal();
  const textarea = document.getElementById('learner-message') || document.querySelector('.textarea');
  const message = skip ? '' : textarea ? textarea.value.trim() : learnerMessage;
  const voiceNote = skip ? null : voiceNoteDataUrl;
  await api('/checkin', { method: 'POST', body: JSON.stringify({ mood, isOkay: false, concern, message, voiceNote }) });
  voiceNoteDataUrl = null;
  learnerMessage = '';
  screen = 'sent';
  render();
};

window.addEventListener('popstate', () => {
  const p = location.pathname.split('/').pop();
  [mode, screen] = pageState[p] || [mode, screen];
  render();
});

(async function boot() {
  await loadMe();
  const staffPage = mode === 'staff' || currentPage === 'dashboard.html' || currentPage === 'case.html' || currentPage === 'followup.html' || currentPage === 'resolved.html';
  if (!me) {
    location.href = 'login.html';
    return;
  }
  if (staffPage && me.role === 'learner') {
    location.href = 'index.html';
    return;
  }
  if (!staffPage && me.role !== 'learner') {
    location.href = 'dashboard.html';
    return;
  }
  mode = me.role === 'learner' ? 'learner' : 'staff';
  await loadData();
  render();
})();
