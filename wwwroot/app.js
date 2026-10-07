const API = '/api';

let me = null;
let db = null;
let alerts = [];
let cases = [];
let stats = { feelingOkay: 0, activeAlerts: 0, checkedInPercent: 0, awaitingFollowUp: 0 };
let moodBreakdown = [];
let teacherNav = 'Dashboard';
let caseId = '';
let mood = 'Happy';
let concern = 'Bullying or safety';
let learnerMessage = '';

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
  moodBreakdown = (db.moodBreakdown || []).map((m) => [m.mood, m.count, m.percent, m.color]);
}

function todayLabel() {
  return new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function badgeClass(status) {
  if (status === 'Resolved') return 'green';
  if (status === 'Escalated' || status === 'Critical') return 'red';
  if (status === 'Acknowledged' || status === 'Monitoring' || status === 'Attention') return 'orange';
  return 'purple';
}

function phone(content, nav = true) {
  const learnerName = me?.learner?.name || me?.name || 'Learner';
  return `<div class="phone-wrap"><div class="phone"><div class="phone-head">${brand}<span class="avatar">👦</span></div><div class="phone-content">${content}</div>${nav ? `<div class="bottom-nav"><b>⌂<br>Home</b><span>✓<br>Check-in</span><span>▱<br>Inbox</span><span>♧<br>Profile</span></div>` : ''}</div></div><div class="demo-note">Signed in as ${esc(learnerName)}</div>`;
}

function learner() {
  const learnerName = me?.learner?.name || me?.name || 'Learner';
  const teacherName = db?.teacher?.name || 'your teacher';

  if (screen === 'home')
    return phone(
      `<span class="eyebrow">${new Date().toLocaleDateString(undefined, { weekday: 'long' })} check-in</span><h1>Good morning,<br>${esc(learnerName)} ⭐</h1><p>How are you feeling today?</p><div class="moods">${[
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
      `<button class="back" onclick="screen='home';render()">←</button><span class="eyebrow" style="margin-top:25px">Step 1 of 2</span><h1>What is worrying you?</h1><p>Choose the one that feels closest. Your teacher will listen.</p><div class="concerns">${[
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
      `<button class="back" onclick="screen='concern';render()">←</button><span class="eyebrow" style="margin-top:25px">Step 2 of 2 · Optional</span><h1>Would you like to tell us more?</h1><p>You can leave this blank. Keep it short — a teacher will still check on you.</p><textarea class="textarea" maxlength="280" placeholder="Write here if you want to…">${esc(learnerMessage)}</textarea><div class="big-actions"><button class="btn btn-alert" onclick="handleSendCheckIn()">Send my check-in</button><button class="btn btn-light" onclick="handleSendCheckIn(true)">Skip message</button></div>`,
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
    .join('')}</nav><div class="profile"><span class="avatar">👩</span><div><b>${esc(name)}</b><br><small>${roleLabel}</small><br><button class="link" onclick="logout()">Sign out</button></div></div></aside>`;
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
  return `<div class="topbar"><div><span class="eyebrow">${esc(db?.school?.name || 'School')} · ${me?.role === 'admin' ? 'Admin' : 'Teacher'} portal</span><h1>Dashboard overview</h1></div></div><section class="hero"><div><span class="eyebrow" style="color:#bfaee7">Class wellness</span><h2>Good morning, ${esc(tName)}</h2><p>Here's how your learners are doing today.</p></div><div class="date-pill">${todayLabel()}</div></section><div class="stats"><div class="stat"><div class="icon green">✓</div><strong>${stats.feelingOkay}</strong><span>Feeling okay</span></div><div class="stat"><div class="icon red">!</div><strong>${stats.activeAlerts}</strong><span>Active alerts</span></div><div class="stat"><div class="icon purple">⌁</div><strong>${stats.checkedInPercent}%</strong><span>Checked in</span></div><div class="stat"><div class="icon orange">◷</div><strong>${stats.awaitingFollowUp}</strong><span>Open cases</span></div></div><div class="grid"><section class="panel"><div class="panel-head"><h3>Active alerts</h3><button class="link" onclick="teacherNav='Alerts';render()">View all</button></div>${openAlerts.length ? openAlerts.map(alertRow).join('') : '<p class="empty">No active alerts.</p>'}</section><section class="panel"><div class="panel-head"><h3>Today's check-ins</h3></div>${moodBreakdown
    .map((x) => `<div class="bar-row"><div class="bar-label"><span>${esc(x[0])}</span><b>${x[1]}</b></div><div class="bar"><i style="width:${x[2]}%;background:${x[3]}"></i></div></div>`)
    .join('') || '<p class="empty">No check-ins yet.</p>'}</section></div>`;
}

function table(headers, rows) {
  return `<div class="table-wrap"><table class="data-table"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows || '<tr><td colspan="8">No records yet.</td></tr>'}</tbody></table></div>`;
}

function learnersView() {
  const rows = (db.learners || [])
    .map(
      (l) =>
        `<tr><td>${esc(l.code)}</td><td>${esc(l.name)}</td><td>${esc(l.grade)}</td><td>${esc(l.className)}</td></tr>`
    )
    .join('');
  return `<div class="topbar"><div><span class="eyebrow">Directory</span><h1>Learners</h1></div></div><section class="panel">${table(['Code', 'Name', 'Grade', 'Class'], rows)}
    <form class="inline-form" onsubmit="return createLearner(event)">
      <h3>Add learner</h3>
      <div class="fields">
        <div class="field"><label>Name</label><input name="name" required></div>
        <div class="field"><label>Code</label><input name="code" placeholder="032"></div>
        <div class="field"><label>Grade</label><input name="grade" placeholder="Grade 5B"></div>
        <div class="field"><label>Class</label><input name="className" placeholder="Class 2B"></div>
        <div class="field"><label>PIN</label><input name="pin" value="1234"></div>
      </div>
      <button class="btn btn-primary" type="submit">Save learner</button>
    </form></section>`;
}

function teachersView() {
  const rows = (db.teachers || []).map((t) => `<tr><td>${esc(t.name)}</td><td>${esc(t.email)}</td><td>${esc(t.className)}</td></tr>`).join('');
  return `<div class="topbar"><div><span class="eyebrow">Administration</span><h1>Teachers</h1></div></div><section class="panel">${table(['Name', 'Email', 'Class'], rows)}
    <form class="inline-form" onsubmit="return createTeacher(event)">
      <h3>Add teacher</h3>
      <div class="fields">
        <div class="field"><label>Name</label><input name="name" required></div>
        <div class="field"><label>Email</label><input name="email" type="email" required></div>
        <div class="field"><label>Class</label><input name="className"></div>
        <div class="field"><label>Temp password</label><input name="password" value="demo"></div>
      </div>
      <button class="btn btn-primary" type="submit">Save teacher</button>
    </form></section>`;
}

function classesView() {
  const rows = (db.classes || []).map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(c.grade)}</td><td>${esc(c.teacherId)}</td></tr>`).join('');
  return `<div class="topbar"><div><span class="eyebrow">Administration</span><h1>Classes / grades</h1></div></div><section class="panel">${table(['Class', 'Grade', 'Teacher ID'], rows)}
    <form class="inline-form" onsubmit="return createClass(event)">
      <h3>Add class</h3>
      <div class="fields">
        <div class="field"><label>Name</label><input name="name" required></div>
        <div class="field"><label>Grade</label><input name="grade"></div>
        <div class="field"><label>Teacher ID</label><input name="teacherId" value="1"></div>
      </div>
      <button class="btn btn-primary" type="submit">Save class</button>
    </form></section>`;
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
  return `<div class="topbar"><div><span class="eyebrow">Reporting</span><h1>Basic activity</h1></div></div><div class="stats"><div class="stat"><strong>${r.totalCheckIns || 0}</strong><span>Check-ins</span></div><div class="stat"><strong>${r.totalAlerts || 0}</strong><span>Alerts</span></div><div class="stat"><strong>${r.openCases || 0}</strong><span>Open cases</span></div><div class="stat"><strong>${r.escalated || 0}</strong><span>Escalated</span></div></div>
    <div class="grid"><section class="panel"><h3>By concern</h3>${(r.byConcern || []).map((x) => `<div class="bar-row"><div class="bar-label"><span>${esc(x.label)}</span><b>${x.count}</b></div></div>`).join('') || '<p class="empty">No data yet.</p>'}</section>
    <section class="panel"><h3>By case status</h3>${(r.byStatus || []).map((x) => `<div class="bar-row"><div class="bar-label"><span>${esc(x.label)}</span><b>${x.count}</b></div></div>`).join('') || '<p class="empty">No data yet.</p>'}</section></div>`;
}

function auditView() {
  const rows = (db.audit || [])
    .map((a) => `<tr><td>${esc(a.at).replace('T', ' ').slice(0, 16)}</td><td>${esc(a.actor)}</td><td>${esc(a.role)}</td><td>${esc(a.action)}</td><td>${esc(a.detail)}</td></tr>`)
    .join('');
  return `<div class="topbar"><div><span class="eyebrow">Accountability</span><h1>Audit trail</h1></div></div><section class="panel">${table(['When', 'Who', 'Role', 'Action', 'Detail'], rows)}</section>`;
}

function settingsView() {
  const s = db.school || {};
  if (me?.role !== 'admin') {
    return `<div class="topbar"><div><span class="eyebrow">Account</span><h1>Settings</h1></div></div><section class="panel"><p>Signed in as <b>${esc(me?.name)}</b> (${esc(me?.role)}).</p><p>Learner records are limited to your assigned class.</p></section>`;
  }
  return `<div class="topbar"><div><span class="eyebrow">School administration</span><h1>School configuration</h1></div></div><section class="panel">
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
  const history = (item.history || []).map((h) => `<li><b>${esc(h.event)}</b><small> · ${esc(h.by)} · ${esc(h.at).replace('T', ' ').slice(0, 16)}</small>${h.note ? `<p>${esc(h.note)}</p>` : ''}</li>`).join('');
  return `<div class="topbar"><div><button class="back" onclick="teacherNav='Cases';screen='dashboard';render()">←</button><span class="eyebrow" style="margin-left:15px">Case file · ${esc(item.id || a.id)}</span><h1 style="margin-top:12px">${esc(a?.type || item.concern || 'Learner case')}</h1></div><span class="badge ${badgeClass(item.status || a?.status)}">${esc(item.status || a?.status)}</span></div>
    <div class="case-wrap"><div class="case-card"><div class="panel-head"><div><h3>${esc(item.learnerName || a?.name)}</h3><p>${esc(item.grade || a?.grade)} · Code ${esc(item.learnerCode || a?.learnerCode)}</p></div><span class="learner-id">${esc(item.learnerCode || a?.id)}</span></div>
    <div class="case-meta"><span class="badge orange">${esc(item.concern || a?.concern)}</span><span class="badge ${badgeClass(a?.level)}">${esc(a?.level || 'Alert')}</span></div>
    <div class="case-note"><small>LEARNER'S OPTIONAL MESSAGE</small><p>${msg ? `"${esc(msg)}"` : 'No message provided.'}</p></div>
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
  return `<div class="shell">${sidebar(side)}<main class="main">${content}</main></div><div class="demo-note">Mivali · Phase 3 MVP · ${esc(me?.role)}</div>`;
}

function render() {
  if (!app) return;
  const key = `${mode}:${screen}`;
  const target = statePage[key];
  if (target && location.pathname.split('/').pop() !== target) history.pushState({ mode, screen, teacherNav, caseId }, '', target);
  app.innerHTML = mode === 'learner' ? learner() : staff();
  window.scrollTo(0, 0);
}

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
  render();
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

window.handleOkay = async () => {
  await api('/checkin', { method: 'POST', body: JSON.stringify({ mood, isOkay: true }) });
  screen = 'okay';
  render();
};

window.handleSendCheckIn = async (skip) => {
  const textarea = document.querySelector('.textarea');
  const message = skip ? '' : textarea ? textarea.value : learnerMessage;
  await api('/checkin', { method: 'POST', body: JSON.stringify({ mood, isOkay: false, concern, message }) });
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
