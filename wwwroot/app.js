const API = '/api';

let db = null;
let alerts = [];
let stats = { feelingOkay: 27, activeAlerts: 3, checkedInPercent: 86, awaitingFollowUp: 2 };
let moodBreakdown = [
  ['Happy', 18, 67, '#52c978'],
  ['Okay', 7, 26, '#8c70d3'],
  ['Anxious', 2, 7, '#f3a11b'],
  ['Sad', 1, 4, '#df5948'],
];

const currentPage = location.pathname.split('/').pop() || 'index.html';
const pageState = {
  'index.html': ['learner', 'home'],
  'learner.html': ['learner', 'home'],
  'concern.html': ['learner', 'concern'],
  'message.html': ['learner', 'note'],
  'sent.html': ['learner', 'sent'],
  'okay.html': ['learner', 'okay'],
  'dashboard.html': ['teacher', 'dashboard'],
  'case.html': ['teacher', 'case'],
  'followup.html': ['teacher', 'followup'],
  'resolved.html': ['teacher', 'resolved'],
};
const statePage = {
  'learner:home': 'learner.html',
  'learner:concern': 'concern.html',
  'learner:note': 'message.html',
  'learner:sent': 'sent.html',
  'learner:okay': 'okay.html',
  'teacher:dashboard': 'dashboard.html',
  'teacher:case': 'case.html',
  'teacher:followup': 'followup.html',
  'teacher:resolved': 'resolved.html',
};

let [mode, screen] = pageState[currentPage] || ['learner', 'home'];
let mood = 'Happy';
let concern = 'Bullying or safety';
let caseId = '024';
let learnerMessage = 'Some older learners keep bothering me near the sports field.';

const app = document.querySelector('#app');
const teacherProfile = { name: 'Ms Kholofelo', className: 'Class 2B' };
const brand = `<div class="brand"><img src="hublio-logo.jpg" alt="Hublio" class="brand-logo" /></div>`;

async function loadData() {
  try {
    const res = await fetch(`${API}/dashboard`);
    if (!res.ok) return;
    db = await res.json();
    alerts = db.alerts || alerts;
    stats = db.stats || stats;
    if (db.teacher) {
      teacherProfile.name = db.teacher.name;
      teacherProfile.className = db.teacher.className;
    }
    if (db.moodBreakdown) {
      moodBreakdown = db.moodBreakdown.map((m) => [m.mood, m.count, m.percent, m.color]);
    }
  } catch {
    alerts = [
      { id: '024', name: 'Thabiso Maboe', grade: 'Class 2B', type: 'Feeling unsafe', time: '8 min ago', level: 'Critical', color: 'red', concern: 'Bullying or safety', message: learnerMessage },
      { id: '031', name: 'Sipho K.', grade: 'Class 2B', type: 'Feeling anxious', time: '24 min ago', level: 'Attention', color: 'orange', concern: 'Friends or classmates', message: '' },
      { id: '018', name: 'Amahle N.', grade: 'Grade 4A', type: 'Feeling sick', time: '42 min ago', level: 'New', color: 'purple', concern: 'I feel sick', message: '' },
    ];
  }
}

async function submitCheckIn(isOkay) {
  const textarea = document.querySelector('.textarea');
  const message = textarea ? textarea.value : learnerMessage;
  try {
    await fetch(`${API}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mood, isOkay, concern, message }),
    });
    await loadData();
  } catch {
    /* offline demo */
  }
}

async function resolveAlert(id) {
  try {
    await fetch(`${API}/alerts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Resolved' }),
    });
    await loadData();
  } catch {
    /* offline demo */
  }
}

function setMode(m) {
  mode = m;
  screen = m === 'learner' ? 'home' : 'dashboard';
  render();
}

function todayLabel() {
  return new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function phone(content, nav = true) {
  return `<div class="phone-wrap"><div class="phone"><div class="phone-head">${brand}<span class="avatar">👦🏾</span></div><div class="phone-content">${content}</div>${nav ? `<div class="bottom-nav"><b>⌂<br>Home</b><span>✓<br>Check-in</span><span>▱<br>Inbox</span><span>♧<br>Profile</span></div>` : ''}</div></div><div class="demo-note">Powered by Mivali</div>`;
}

function learner() {
  const learnerName = db?.learner?.name || 'Thabiso Maboe';
  const title = teacherProfile.name.split(' ')[0];
  const teacherName = title === 'Mr' || title === 'Ms' ? teacherProfile.name : `Ms ${teacherProfile.name}`;

  if (screen === 'home')
    return phone(
      `<span class="eyebrow">${new Date().toLocaleDateString(undefined, { weekday: 'long' })} check-in</span><h1>Good morning,<br>${learnerName} ⭐</h1><p>How are you feeling today?</p><div class="moods">${[
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
        .join('')}</div><div class="big-actions"><button class="btn btn-safe" onclick="handleOkay()">I'M OKAY<small>Everything is going great!</small></button><button class="btn btn-alert" onclick="screen='concern';render()">I'M NOT OKAY<small>I'd like to talk to a teacher</small></button><button class="link" onclick="setMode('teacher')">View teacher demo →</button></div>`
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
            `<button class="concern ${concern === x ? 'selected' : ''}" onclick="concern='${x}';render()">${x === 'Bullying or safety' ? '🛡️' : x === 'School work' ? '📚' : x === 'I feel sick' ? '🤒' : '💬'} &nbsp; ${x}</button>`
        )
        .join('')}</div><div class="big-actions"><button class="btn btn-primary" onclick="screen='note';render()">Continue →</button></div>`,
      false
    );
  if (screen === 'note')
    return phone(
      `<button class="back" onclick="screen='concern';render()">←</button><span class="eyebrow" style="margin-top:25px">Step 2 of 2 · Optional</span><h1>Would you like to tell us more?</h1><p>You can leave this blank. A teacher will still check on you.</p><textarea class="textarea" placeholder="Write here if you want to…">${learnerMessage}</textarea><div class="big-actions"><button class="btn btn-alert" onclick="handleSendCheckIn()">Send my check-in</button><button class="btn btn-light" onclick="handleSendCheckIn()">Skip message</button></div>`,
      false
    );
  if (screen === 'sent')
    return phone(
      `<div class="success"><div class="check">✓</div><span class="eyebrow">Check-in sent</span><h1>Thank you for telling us.</h1><p>${teacherName} has been notified and will check in with you soon.</p><div style="height:24px"></div><button class="btn btn-primary" onclick="setMode('teacher')">See the teacher's alert →</button><button class="link" style="display:block;margin:16px auto" onclick="screen='home';render()">Back to home</button></div>`,
      false
    );
  return phone(
    `<div class="success"><div class="check">✓</div><h1>Glad you're okay!</h1><p>Your check-in has been saved. Have a brilliant day, ${learnerName}.</p><div style="height:24px"></div><button class="btn btn-safe" onclick="screen='home';render()">Done</button></div>`,
    false
  );
}

function sidebar(active = 'Dashboard') {
  return `<aside class="sidebar">${brand}<nav class="nav">${['Dashboard', 'Learners', 'Alerts', 'Reports', 'Settings']
    .map(
      (x) =>
        `<button class="${active === x ? 'active' : ''}">${x === 'Dashboard' ? '▦' : x === 'Learners' ? '♙' : x === 'Alerts' ? '♧' : x === 'Reports' ? '▥' : '⚙'} &nbsp; ${x}</button>`
    )
    .join('')}</nav><div class="profile"><span class="avatar">👩🏾</span><div><b>${teacherProfile.name}</b><br><small>Teacher · ${teacherProfile.className}</small></div></div></aside>`;
}

function teacher() {
  let content = '';
  const tName = teacherProfile.name;

  if (screen === 'dashboard')
    content = `<div class="topbar"><div><span class="eyebrow">Teacher portal</span><h1>Dashboard overview</h1></div><div class="switch"><button onclick="setMode('learner')">Learner</button><button class="active">Teacher</button></div></div><section class="hero"><div><span class="eyebrow" style="color:#bfaee7">Class wellness</span><h2>Good morning, ${tName}</h2><p>Here's how your learners are doing today.</p></div><div class="date-pill">${todayLabel()}</div></section><div class="stats"><div class="stat"><div class="icon green">✓</div><strong>${stats.feelingOkay}</strong><span>Feeling okay</span></div><div class="stat"><div class="icon red">!</div><strong>${stats.activeAlerts}</strong><span>Active alerts</span></div><div class="stat"><div class="icon purple">⌁</div><strong>${stats.checkedInPercent}%</strong><span>Checked in</span></div><div class="stat"><div class="icon orange">◷</div><strong>${stats.awaitingFollowUp}</strong><span>Awaiting follow-up</span></div></div><div class="grid"><section class="panel"><div class="panel-head"><h3>Active alerts</h3><button class="link">View all</button></div>${alerts
      .map(
        (a) =>
          `<div class="alert" onclick="caseId='${a.id}';screen='case';render()"><span class="learner-id">${a.id}</span><div><strong>${a.name} · ${a.type}</strong><small>${a.grade} · ${a.time}</small></div><span class="badge ${a.color}">${a.level}</span></div>`
      )
      .join('')}</section><section class="panel"><div class="panel-head"><h3>Today's check-ins</h3></div>${moodBreakdown
      .map(
        (x) =>
          `<div class="bar-row"><div class="bar-label"><span>${x[0]}</span><b>${x[1]}</b></div><div class="bar"><i style="width:${x[2]}%;background:${x[3]}"></i></div></div>`
      )
      .join('')}</section></div>`;
  else if (screen === 'case') {
    const a = alerts.find((x) => x.id === caseId) || alerts[0];
    const msg = a.message || learnerMessage;
    content = `<div class="topbar"><div><button class="back" onclick="screen='dashboard';render()">←</button><span class="eyebrow" style="margin-left:15px">Case file · Learner ${a.id}</span><h1 style="margin-top:12px">${a.type}</h1></div><span class="badge red">Action required</span></div><div class="case-wrap"><div class="case-card"><div class="panel-head"><div><h3>${a.name}</h3><p>${a.grade} · Submitted today</p></div><span class="learner-id">${a.id}</span></div><div class="case-meta"><span class="badge orange">${a.concern || concern}</span><span class="badge purple">Not yet acknowledged</span></div><div class="case-note"><small>LEARNER'S OPTIONAL MESSAGE</small><p>${msg ? `"${msg}"` : 'No message provided.'}</p></div><h3>Recommended next step</h3><p>Speak with the learner privately as soon as possible. Confirm their immediate safety before recording a follow-up.</p><div class="big-actions" style="max-width:360px;margin-top:25px"><button class="btn btn-primary" onclick="screen='followup';render()">Acknowledge & start follow-up</button></div></div></div>`;
  } else if (screen === 'followup')
    content = `<div class="topbar"><div><span class="eyebrow">Case file · Learner ${caseId}</span><h1>Log learner follow-up</h1></div><span class="badge purple">Acknowledged</span></div><div class="case-wrap"><div class="case-card"><h3>What action was taken?</h3><p>Record only the information needed to support the learner.</p><div class="fields"><div class="field"><label>FOLLOW-UP TYPE</label><select><option>Private learner conversation</option><option>Counsellor referral</option><option>Guardian contacted</option></select></div><div class="field"><label>OUTCOME</label><select><option>Resolved locally</option><option>Needs monitoring</option><option>Escalated</option></select></div><div class="field full"><label>PRIVATE CASE NOTE</label><textarea rows="5">Spoke with learner privately. Duty teacher will monitor and address the learners involved.</textarea></div></div><div class="big-actions" style="max-width:360px"><button class="btn btn-safe" onclick="resolveAlert('${caseId}');screen='resolved';render()">Complete resolution</button><button class="btn btn-light" onclick="screen='case';render()">Save and return later</button></div></div></div>`;
  else
    content = `<div class="topbar"><div><span class="eyebrow">Case file · Learner ${caseId}</span><h1>Case resolution complete</h1></div></div><div class="case-wrap"><div class="case-card success" style="min-height:520px;display:flex;flex-direction:column;justify-content:center"><div class="check">✓</div><h1>Follow-up completed successfully</h1><p>Learner wellbeing signal logged, assessed and resolution state stored.</p><div class="case-note" style="max-width:520px;margin:25px auto;text-align:left;width:100%"><b>RESOLUTION TYPE</b><span style="float:right;color:var(--green);font-weight:800">RESOLVED LOCALLY</span><p>Completed by ${tName}</p></div><button class="btn btn-primary" style="max-width:360px;margin:0 auto;width:100%" onclick="screen='dashboard';render()">Return to dashboard</button></div></div>`;

  return `<div class="shell">${sidebar(screen === 'dashboard' ? 'Dashboard' : 'Alerts')}<main class="main">${content}</main></div><div class="demo-note">Powered by Mivali</div>`;
}

function render() {
  const target = statePage[`${mode}:${screen}`];
  if (target && location.pathname.split('/').pop() !== target) history.pushState({ mode, screen }, '', target);
  app.innerHTML = mode === 'learner' ? learner() : teacher();

  const teacherAvatar = app.querySelector('.sidebar .profile .avatar');
  if (teacherAvatar) {
    teacherAvatar.innerHTML = `<img src="mario.jpeg" alt="${teacherProfile.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.parentElement.textContent='👩🏾'">`;
    teacherAvatar.style.overflow = 'hidden';
  }
  window.scrollTo(0, 0);
}

window.addEventListener('popstate', () => {
  const p = location.pathname.split('/').pop();
  [mode, screen] = pageState[p] || ['learner', 'home'];
  render();
});

window.handleOkay = async () => {
  await submitCheckIn(true);
  screen = 'okay';
  render();
};
window.handleSendCheckIn = async () => {
  await submitCheckIn(false);
  screen = 'sent';
  render();
};

loadData().then(render);
