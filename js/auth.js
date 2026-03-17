// ─── AUTH & STORAGE ───────────────────────────────────────────────
const ADMIN_USER = 'craig.marais19';

const Auth = {
  USERS_KEY:   'vt_users',
  SESSION_KEY: 'vt_session',

  getUsers()     { return JSON.parse(localStorage.getItem(this.USERS_KEY) || '{}'); },
  saveUsers(u)   { localStorage.setItem(this.USERS_KEY, JSON.stringify(u)); },

  _blank(username, password) {
    return {
      username,
      password:  btoa(password),
      createdAt: Date.now(),
      sessions:  [],
      bests:     {},
      // current reached level per exercise (1 = just started)
      levels: {
        peripheral_flash: 1,
        arrow_reaction:   1,
        number_scatter:   1
      },
      // consecutive passes tracker {exId: count}
      consecutive: {
        peripheral_flash: 0,
        arrow_reaction:   0,
        number_scatter:   0
      }
    };
  },

  register(username, password) {
    const users = this.getUsers();
    const key   = username.toLowerCase().trim();
    if (!key || key.length < 2)  return { ok: false, msg: 'Username must be at least 2 characters.' };
    if (password.length < 4)     return { ok: false, msg: 'Password must be at least 4 characters.' };
    if (users[key])               return { ok: false, msg: 'Username already taken.' };
    users[key] = this._blank(username.trim(), password);
    this.saveUsers(users);
    this.login(username, password);
    return { ok: true };
  },

  login(username, password) {
    const users = this.getUsers();
    const key   = username.toLowerCase().trim();
    const user  = users[key];
    if (!user)                          return { ok: false, msg: 'User not found.' };
    if (atob(user.password) !== password) return { ok: false, msg: 'Incorrect password.' };
    // migrate old accounts
    if (!user.levels)      user.levels      = { peripheral_flash:1, arrow_reaction:1, number_scatter:1 };
    if (!user.consecutive) user.consecutive = { peripheral_flash:0, arrow_reaction:0, number_scatter:0 };
    this.saveUsers(users);
    sessionStorage.setItem(this.SESSION_KEY, key);
    return { ok: true };
  },

  logout()       { sessionStorage.removeItem(this.SESSION_KEY); },
  currentKey()   { return sessionStorage.getItem(this.SESSION_KEY); },
  currentUser()  {
    const key = this.currentKey();
    return key ? (this.getUsers()[key] || null) : null;
  },
  isAdmin()      { return this.currentKey() === ADMIN_USER.toLowerCase(); },

  // ── Save a completed round and check level progression ──────────
  saveSession(data) {
    const key = this.currentKey();
    if (!key) return null;
    const users = this.getUsers();
    const u     = users[key];
    if (!u) return null;

    u.sessions.unshift(data);
    if (u.sessions.length > 200) u.sessions.length = 200;

    // best score per exercise+level
    const bk = `${data.exercise}_L${data.level}`;
    if (!u.bests[bk] || data.score > u.bests[bk]) u.bests[bk] = data.score;
    if (!u.bests[data.exercise] || data.score > u.bests[data.exercise]) u.bests[data.exercise] = data.score;

    // ── consecutive pass check ──
    let levelUp = null;
    const exId     = data.exercise;
    const curLevel = u.levels[exId] || 1;
    const cfg      = getLevel(exId, curLevel);

    if (data.passed) {
      u.consecutive[exId] = (u.consecutive[exId] || 0) + 1;
      if (u.consecutive[exId] >= 3) {
        // Check stage gate: can they advance?
        const nextLevel = curLevel + 1;
        const accessible = maxAccessibleLevel(u.levels);
        if (nextLevel <= accessible && nextLevel <= MAX_LEVEL) {
          u.levels[exId]      = nextLevel;
          u.consecutive[exId] = 0;
          levelUp = { exercise: exId, newLevel: nextLevel };
        }
      }
    } else {
      u.consecutive[exId] = 0;
    }

    this.saveUsers(users);
    return levelUp;
  },

  getUserLevel(exId) {
    const u = this.currentUser();
    return (u && u.levels && u.levels[exId]) || 1;
  },

  getConsecutive(exId) {
    const u = this.currentUser();
    return (u && u.consecutive && u.consecutive[exId]) || 0;
  },

  getMaxAccessible() {
    const u = this.currentUser();
    if (!u) return STAGE_SIZE;
    return maxAccessibleLevel(u.levels);
  },

  getBest(exId, level) {
    const u = this.currentUser();
    if (!u) return null;
    return level ? (u.bests[`${exId}_L${level}`] || null) : (u.bests[exId] || null);
  },

  getTodaySeconds() {
    const u = this.currentUser();
    if (!u) return 0;
    const today = new Date().toDateString();
    return u.sessions
      .filter(s => new Date(s.ts).toDateString() === today)
      .reduce((sum, s) => sum + (s.duration || 0), 0);
  },

  getStreakDays() {
    const u = this.currentUser();
    if (!u || !u.sessions.length) return 0;
    const days  = [...new Set(u.sessions.map(s => new Date(s.ts).toDateString()))];
    let streak  = 0;
    const now   = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      if (days.includes(d.toDateString())) streak++;
      else if (i > 0) break;
    }
    return streak;
  },

  getHistory(limit) {
    const u = this.currentUser();
    const s = u ? u.sessions : [];
    return limit ? s.slice(0, limit) : s;
  },

  resetData() {
    const key = this.currentKey();
    if (!key) return;
    const users = this.getUsers();
    if (!users[key]) return;
    const u = users[key];
    u.sessions    = [];
    u.bests       = {};
    u.levels      = { peripheral_flash:1, arrow_reaction:1, number_scatter:1 };
    u.consecutive = { peripheral_flash:0, arrow_reaction:0, number_scatter:0 };
    this.saveUsers(users);
  },

  // ── Admin helpers ────────────────────────────────────────────────
  getAllUsers() {
    const users = this.getUsers();
    return Object.entries(users).map(([key, u]) => ({
      key,
      username:    u.username,
      createdAt:   u.createdAt,
      sessions:    u.sessions || [],
      levels:      u.levels   || {},
      consecutive: u.consecutive || {}
    }));
  }
};
