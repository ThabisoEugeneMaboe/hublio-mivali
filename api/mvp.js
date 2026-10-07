const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, 'data.json');
const SESSION_HOURS = 12;
const MESSAGE_MAX = 280;
const CRITICAL_CONCERNS = ['Bullying or safety', 'Home or family'];

const sessions = new Map();

function nowIso() {
  return new Date().toISOString();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(String(password), salt, 64);
  const known = Buffer.from(hash, 'hex');
  if (known.length !== check.length) return false;
  return crypto.timingSafeEqual(known, check);
}

function nextId(items, field = 'id') {
  const max = items.reduce((n, item) => Math.max(n, Number(item[field]) || 0), 0);
  return String(max + 1).padStart(3, '0');
}

function relativeTime(iso) {
  if (!iso) return 'Just now';
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function readRaw() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeRaw(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function migrate(data) {
  data.school = data.school || {
    id: 'sch-001',
    name: 'Mivali Demo Primary',
    timezone: 'Africa/Johannesburg',
    checkInWindow: 'Weekday mornings',
    escalateSafetyImmediately: true,
  };
  data.classes = data.classes || [
    { id: 'cls-2b', name: 'Class 2B', grade: 'Grade 5B', teacherId: 1 },
    { id: 'cls-4a', name: 'Grade 4A', grade: 'Grade 4A', teacherId: 1 },
  ];
  data.teachers = data.teachers || (data.teacher ? [data.teacher] : []);
  data.learners = data.learners || (data.learner ? [data.learner] : []);
  data.users = data.users || [];
  data.cases = data.cases || [];
  data.followUps = data.followUps || [];
  data.audit = data.audit || [];
  data.checkIns = data.checkIns || [];
  data.alerts = data.alerts || [];
  data.stats = data.stats || { feelingOkay: 0, activeAlerts: 0, checkedInPercent: 0, awaitingFollowUp: 0 };

  if (!data.users.length) {
    data.users = [
      { id: 'u-admin', role: 'admin', name: 'School Admin', email: 'admin@demo.school', password: 'demo', active: true },
      {
        id: 'u-teacher-1',
        role: 'teacher',
        name: data.teachers[0]?.name || 'Ms Kholofelo',
        email: data.teachers[0]?.email || 'kholofelo@school.local',
        password: 'demo',
        teacherId: data.teachers[0]?.id || 1,
        active: true,
      },
      {
        id: 'u-learner-024',
        role: 'learner',
        name: data.learners[0]?.name || 'Thabiso Maboe',
        loginCode: data.learners[0]?.code || '024',
        pin: '1234',
        learnerId: data.learners[0]?.id || 1,
        active: true,
      },
    ];
  }

  let changed = false;
  for (const user of data.users) {
    if (user.password && !user.passwordHash) {
      const hashed = hashPassword(user.password);
      user.salt = hashed.salt;
      user.passwordHash = hashed.hash;
      delete user.password;
      changed = true;
    }
    if (user.pin && !user.pinHash) {
      const hashed = hashPassword(user.pin);
      user.pinSalt = hashed.salt;
      user.pinHash = hashed.hash;
      delete user.pin;
      changed = true;
    }
  }

  data.alerts.forEach((alert) => {
    if (!alert.caseId) {
      const caseId = `C${alert.id}`;
      alert.caseId = caseId;
      changed = true;
      if (!data.cases.find((c) => c.id === caseId)) {
        data.cases.push({
          id: caseId,
          alertId: alert.id,
          learnerName: alert.name,
          learnerCode: alert.id,
          grade: alert.grade,
          concern: alert.concern,
          message: alert.message,
          status: alert.status === 'Resolved' ? 'Resolved' : 'Open',
          createdAt: nowIso(),
          history: [{ at: nowIso(), event: 'Case created from prototype alert', by: 'System' }],
        });
      }
    }
  });

  if (changed) writeRaw(data);
  return data;
}

function load() {
  return migrate(readRaw());
}

function save(data) {
  writeRaw(data);
}

function audit(data, actor, action, detail) {
  data.audit.unshift({
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 99)}`,
    at: nowIso(),
    actor: actor?.name || 'System',
    role: actor?.role || 'system',
    action,
    detail,
  });
  data.audit = data.audit.slice(0, 500);
}

function createSession(user) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { userId: user.id, expires: Date.now() + SESSION_HOURS * 3600 * 1000 });
  return token;
}

function getSession(token) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expires) {
    sessions.delete(token);
    return null;
  }
  const data = load();
  return data.users.find((u) => u.id === session.userId && u.active !== false) || null;
}

function destroySession(token) {
  sessions.delete(token);
}

function publicUser(user, data) {
  const learner = data.learners.find((l) => String(l.id) === String(user.learnerId));
  const teacher = data.teachers.find((t) => String(t.id) === String(user.teacherId));
  return {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email || null,
    loginCode: user.loginCode || learner?.code || null,
    teacherId: user.teacherId || null,
    learnerId: user.learnerId || null,
    school: data.school,
    teacher: teacher || null,
    learner: learner || null,
  };
}

function teacherLearnerIds(data, user) {
  if (user.role === 'admin') return data.learners.map((l) => l.id);
  const teacher = data.teachers.find((t) => String(t.id) === String(user.teacherId));
  if (!teacher) return [];
  return data.learners
    .filter((l) => l.teacherId === teacher.id || l.className === teacher.className)
    .map((l) => l.id);
}

function canSeeAlert(data, user, alert) {
  if (user.role === 'admin') return true;
  const ids = teacherLearnerIds(data, user);
  const learner = data.learners.find((l) => l.name === alert.name || l.code === alert.learnerCode || String(l.id) === String(alert.learnerId));
  if (learner) return ids.includes(learner.id);
  return true;
}

function recomputeStats(data) {
  const open = data.alerts.filter((a) => a.status !== 'Resolved');
  const awaiting = data.cases.filter((c) => ['Open', 'Acknowledged', 'Monitoring', 'Escalated'].includes(c.status));
  const today = new Date().toISOString().slice(0, 10);
  const todays = data.checkIns.filter((c) => String(c.submittedAt || '').startsWith(today));
  const okay = todays.filter((c) => c.isOkay).length;
  const learnerCount = Math.max(data.learners.length, 1);
  const checkedIn = new Set(todays.map((c) => c.learnerId)).size;
  data.stats = {
    feelingOkay: okay || data.stats.feelingOkay,
    activeAlerts: open.length,
    checkedInPercent: Math.round((checkedIn / learnerCount) * 100) || data.stats.checkedInPercent,
    awaitingFollowUp: awaiting.length,
  };
}

function moodBreakdown(data) {
  const colors = { Happy: '#52c978', Okay: '#8c70d3', Tired: '#6d43c0', Anxious: '#f3a11b', Sad: '#df5948', Sick: '#df5948' };
  const counts = {};
  data.checkIns.forEach((c) => {
    const mood = c.mood || 'Okay';
    counts[mood] = (counts[mood] || 0) + 1;
  });
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(counts).map(([mood, count]) => ({
    mood,
    count,
    percent: Math.round((count / total) * 100),
    color: colors[mood] || '#6d43c0',
  }));
}

function login({ role, login, password }) {
  const data = load();
  const key = String(login || '').trim().toLowerCase();
  const user = data.users.find((u) => {
    if (role && u.role !== role) return false;
    if (u.email && u.email.toLowerCase() === key) return true;
    if (u.loginCode && String(u.loginCode).toLowerCase() === key) return true;
    return false;
  });
  if (!user || user.active === false) return { error: 'Invalid credentials', status: 401 };
  const secretOk =
    user.role === 'learner'
      ? verifyPassword(password, user.pinSalt, user.pinHash)
      : verifyPassword(password, user.salt, user.passwordHash);
  if (!secretOk) return { error: 'Invalid credentials', status: 401 };
  audit(data, user, 'login', `${user.role} signed in`);
  save(data);
  const token = createSession(user);
  return { token, user: publicUser(user, data) };
}

function dashboard(user) {
  const data = load();
  recomputeStats(data);
  save(data);
  const alerts = data.alerts.filter((a) => canSeeAlert(data, user, a)).map((a) => ({ ...a, time: relativeTime(a.createdAt) }));
  const cases = data.cases.filter((c) => alerts.some((a) => a.caseId === c.id || a.id === c.alertId));
  const learners = user.role === 'learner' ? data.learners.filter((l) => String(l.id) === String(user.learnerId)) : data.learners.filter((l) => teacherLearnerIds(data, user).includes(l.id));
  return {
    school: data.school,
    teacher: data.teachers.find((t) => String(t.id) === String(user.teacherId)) || data.teachers[0],
    learner: data.learners.find((l) => String(l.id) === String(user.learnerId)) || learners[0],
    alerts,
    cases,
    learners,
    teachers: user.role === 'admin' ? data.teachers : data.teachers.filter((t) => String(t.id) === String(user.teacherId)),
    classes: data.classes,
    followUps: data.followUps,
    stats: data.stats,
    moodBreakdown: moodBreakdown(data),
    audit: user.role === 'admin' ? data.audit.slice(0, 80) : [],
    reports: reports(data, user),
  };
}

function reports(data, user) {
  const alerts = data.alerts.filter((a) => canSeeAlert(data, user, a));
  const byConcern = {};
  alerts.forEach((a) => {
    const key = a.concern || 'Unspecified';
    byConcern[key] = (byConcern[key] || 0) + 1;
  });
  const byStatus = {};
  data.cases.forEach((c) => {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
  });
  return {
    totalCheckIns: data.checkIns.length,
    totalAlerts: alerts.length,
    openCases: data.cases.filter((c) => c.status !== 'Resolved').length,
    escalated: data.cases.filter((c) => c.status === 'Escalated').length,
    byConcern: Object.entries(byConcern).map(([label, count]) => ({ label, count })),
    byStatus: Object.entries(byStatus).map(([label, count]) => ({ label, count })),
  };
}

function submitCheckIn(user, payload) {
  if (user.role !== 'learner') return { error: 'Only learners can check in', status: 403 };
  const data = load();
  const learner = data.learners.find((l) => String(l.id) === String(user.learnerId));
  if (!learner) return { error: 'Learner profile not found', status: 400 };
  const message = String(payload.message || '').slice(0, MESSAGE_MAX);
  const concern = payload.concern || '';
  const mood = payload.mood || 'Okay';
  const isOkay = Boolean(payload.isOkay);
  const checkIn = {
    id: nextId(data.checkIns),
    learnerId: learner.id,
    mood,
    isOkay,
    concern: isOkay ? null : concern,
    message: isOkay ? '' : message,
    submittedAt: nowIso(),
  };
  data.checkIns.push(checkIn);
  audit(data, user, 'check_in', isOkay ? "I'm Okay" : `I'm Not Okay · ${concern || mood}`);

  if (!isOkay) {
    const critical = data.school.escalateSafetyImmediately && CRITICAL_CONCERNS.includes(concern);
    const alertId = nextId(data.alerts);
    const caseId = `C${alertId}`;
    const alert = {
      id: alertId,
      caseId,
      learnerId: learner.id,
      learnerCode: learner.code,
      name: learner.name,
      grade: learner.grade,
      type: `Feeling ${String(mood).toLowerCase()}`,
      createdAt: nowIso(),
      level: critical ? 'Critical' : 'New',
      color: critical ? 'red' : 'purple',
      concern,
      message,
      status: 'Open',
    };
    data.alerts.unshift(alert);
    data.cases.unshift({
      id: caseId,
      alertId,
      learnerId: learner.id,
      learnerName: learner.name,
      learnerCode: learner.code,
      grade: learner.grade,
      concern,
      message,
      status: critical ? 'Escalated' : 'Open',
      createdAt: nowIso(),
      history: [
        { at: nowIso(), event: 'Case opened from learner check-in', by: learner.name },
        ...(critical ? [{ at: nowIso(), event: 'Auto-escalated: safety concern', by: 'System' }] : []),
      ],
    });
    audit(data, user, 'alert_created', `Alert ${alertId} for ${learner.name}`);
  }

  recomputeStats(data);
  save(data);
  return { ok: true, checkIn };
}

function updateAlert(user, id, payload) {
  if (!['teacher', 'admin'].includes(user.role)) return { error: 'Forbidden', status: 403 };
  const data = load();
  const alert = data.alerts.find((a) => a.id === id);
  if (!alert) return { error: 'Alert not found', status: 404 };
  if (!canSeeAlert(data, user, alert)) return { error: 'Forbidden', status: 403 };
  const cse = data.cases.find((c) => c.id === alert.caseId || c.alertId === alert.id);
  if (payload.status === 'Acknowledged' || payload.acknowledge) {
    alert.status = 'Acknowledged';
    alert.level = alert.level === 'New' ? 'Attention' : alert.level;
    alert.color = alert.color === 'purple' ? 'orange' : alert.color;
    alert.acknowledgedAt = nowIso();
    alert.acknowledgedBy = user.name;
    if (cse && cse.status === 'Open') {
      cse.status = 'Acknowledged';
      cse.history.push({ at: nowIso(), event: 'Alert acknowledged', by: user.name });
    }
    audit(data, user, 'alert_acknowledged', `Alert ${alert.id}`);
  }
  if (payload.status && payload.status !== 'Acknowledged') {
    alert.status = payload.status;
  }
  save(data);
  return { ok: true, alert, case: cse };
}

function addFollowUp(user, caseId, payload) {
  if (!['teacher', 'admin'].includes(user.role)) return { error: 'Forbidden', status: 403 };
  const data = load();
  const cse = data.cases.find((c) => c.id === caseId);
  if (!cse) return { error: 'Case not found', status: 404 };
  const followUp = {
    id: nextId(data.followUps),
    caseId,
    teacherId: user.teacherId || null,
    by: user.name,
    type: payload.type || 'Private learner conversation',
    outcome: payload.outcome || 'Needs monitoring',
    note: String(payload.note || '').slice(0, 2000),
    at: nowIso(),
  };
  data.followUps.unshift(followUp);
  const statusMap = {
    'Resolved locally': 'Resolved',
    'Needs monitoring': 'Monitoring',
    Escalated: 'Escalated',
  };
  cse.status = statusMap[followUp.outcome] || cse.status;
  cse.history.push({ at: nowIso(), event: `Follow-up: ${followUp.type} · ${followUp.outcome}`, by: user.name, note: followUp.note });
  const alert = data.alerts.find((a) => a.caseId === cse.id || a.id === cse.alertId);
  if (alert && cse.status === 'Resolved') {
    alert.status = 'Resolved';
    alert.level = 'Resolved';
    alert.color = 'green';
  }
  if (alert && cse.status === 'Escalated') {
    alert.level = 'Critical';
    alert.color = 'red';
    alert.status = 'Escalated';
  }
  audit(data, user, cse.status === 'Escalated' ? 'case_escalated' : 'follow_up', `Case ${cse.id} → ${cse.status}`);
  recomputeStats(data);
  save(data);
  return { ok: true, followUp, case: cse };
}

function requireAdmin(user) {
  if (user.role !== 'admin') return { error: 'Admin only', status: 403 };
  return null;
}

function createTeacher(user, payload) {
  const denied = requireAdmin(user);
  if (denied) return denied;
  const data = load();
  const id = (data.teachers.reduce((n, t) => Math.max(n, Number(t.id) || 0), 0) || 0) + 1;
  const teacher = {
    id,
    name: payload.name,
    email: payload.email,
    className: payload.className || 'Unassigned',
    avatarUrl: payload.avatarUrl || '',
  };
  data.teachers.push(teacher);
  const hashed = hashPassword(payload.password || 'demo');
  data.users.push({
    id: `u-teacher-${id}`,
    role: 'teacher',
    name: teacher.name,
    email: teacher.email,
    teacherId: id,
    salt: hashed.salt,
    passwordHash: hashed.hash,
    active: true,
  });
  if (payload.className) {
    data.classes.push({ id: `cls-${id}`, name: payload.className, grade: payload.grade || payload.className, teacherId: id });
  }
  audit(data, user, 'teacher_created', teacher.name);
  save(data);
  return { ok: true, teacher };
}

function createLearner(user, payload) {
  if (!['admin', 'teacher'].includes(user.role)) return { error: 'Forbidden', status: 403 };
  const data = load();
  const id = (data.learners.reduce((n, l) => Math.max(n, Number(l.id) || 0), 0) || 0) + 1;
  const code = payload.code || String(100 + id);
  const learner = {
    id,
    code,
    name: payload.name,
    grade: payload.grade || 'Unassigned',
    className: payload.className || 'Unassigned',
    teacherId: Number(payload.teacherId) || user.teacherId || data.teachers[0]?.id,
  };
  data.learners.push(learner);
  const hashed = hashPassword(payload.pin || '1234');
  data.users.push({
    id: `u-learner-${code}`,
    role: 'learner',
    name: learner.name,
    loginCode: code,
    learnerId: id,
    pinSalt: hashed.salt,
    pinHash: hashed.hash,
    active: true,
  });
  audit(data, user, 'learner_created', `${learner.name} (${code})`);
  save(data);
  return { ok: true, learner };
}

function updateSchool(user, payload) {
  const denied = requireAdmin(user);
  if (denied) return denied;
  const data = load();
  data.school = { ...data.school, ...payload };
  audit(data, user, 'school_updated', data.school.name);
  save(data);
  return { ok: true, school: data.school };
}

function createClass(user, payload) {
  const denied = requireAdmin(user);
  if (denied) return denied;
  const data = load();
  const item = {
    id: `cls-${Date.now()}`,
    name: payload.name,
    grade: payload.grade || payload.name,
    teacherId: Number(payload.teacherId) || null,
  };
  data.classes.push(item);
  audit(data, user, 'class_created', item.name);
  save(data);
  return { ok: true, class: item };
}

module.exports = {
  MESSAGE_MAX,
  getSession,
  destroySession,
  publicUser,
  login,
  dashboard,
  submitCheckIn,
  updateAlert,
  addFollowUp,
  createTeacher,
  createLearner,
  createClass,
  updateSchool,
  load,
};
