// ─── AUTH & STORAGE ───────────────────────────────────────────────
const Auth = {
  USERS_KEY: 'vt_users',
  SESSION_KEY: 'vt_session',

  getUsers() { return JSON.parse(localStorage.getItem(this.USERS_KEY) || '{}'); },
  saveUsers(u) { localStorage.setItem(this.USERS_KEY, JSON.stringify(u)); },

  register(username, password) {
    const users = this.getUsers();
    const key = username.toLowerCase().trim();
    if (!key || key.length < 2) return { ok: false, msg: 'Username must be at least 2 characters.' };
    if (password.length < 4) return { ok: false, msg: 'Password must be at least 4 characters.' };
    if (users[key]) return { ok: false, msg: 'Username already taken.' };
    users[key] = {
      username: username.trim(),
      password: btoa(password),
      createdAt: Date.now(),
      sessions: [],
      bests: {},
      unlockedLevels: {
        peripheral_flash: 1,
        arrow_reaction: 1,
        number_scatter: 1
      }
    };
    this.saveUsers(users);
    this.login(username, password);
    return { ok: true };
  },

  login(username, password) {
    const users = this.getUsers();
    const key = username.toLowerCase().trim();
    const user = users[key];
    if (!user) return { ok: false, msg: 'User not found.' };
    if (atob(user.password) !== password) return { ok: false, msg: 'Incorrect password.' };
    // Migrate old accounts
    if (!user.unlockedLevels) {
      user.unlockedLevels = { peripheral_flash: 1, arrow_reaction: 1, number_scatter: 1 };
      this.saveUsers(users);
    }
    sessionStorage.setItem(this.SESSION_KEY, key);
    return { ok: true };
  },

  logout() { sessionStorage.removeItem(this.SESSION_KEY); },
  currentKey() { return sessionStorage.getItem(this.SESSION_KEY); },

  currentUser() {
    const key = this.currentKey();
    if (!key) return null;
    return this.getUsers()[key] || null;
  },

  saveSession(sessionData) {
    const key = this.currentKey();
    if (!key) return;
    const users = this.getUsers();
    if (!users[key]) return;
    const u = users[key];

    u.sessions.unshift(sessionData);
    if (u.sessions.length > 60) u.sessions.length = 60;

    // Update best per exercise+level
    const bestKey = `${sessionData.exercise}_L${sessionData.level || 1}`;
    if (!u.bests[bestKey] || sessionData.score > u.bests[bestKey]) {
      u.bests[bestKey] = sessionData.score;
    }
    // Also store flat best
    if (!u.bests[sessionData.exercise] || sessionData.score > u.bests[sessionData.exercise]) {
      u.bests[sessionData.exercise] = sessionData.score;
    }

    // Check for unlock
    const unlocked = this.checkUnlock(u, sessionData.exercise, sessionData.level || 1, sessionData.score);
    this.saveUsers(users);
    return unlocked;
  },

  checkUnlock(user, exId, level, score) {
    const diffs = DIFFICULTIES[exId];
    if (!diffs) return null;
    const current = diffs.find(d => d.level === level);
    if (!current || !current.unlock_score) return null;
    if (score >= current.unlock_score) {
      const nextLevel = level + 1;
      const currentUnlocked = user.unlockedLevels[exId] || 1;
      if (nextLevel > currentUnlocked && nextLevel <= diffs.length) {
        user.unlockedLevels[exId] = nextLevel;
        return { exercise: exId, newLevel: nextLevel, label: diffs[nextLevel - 1].label };
      }
    }
    return null;
  },

  getUnlockedLevel(exId) {
    const user = this.currentUser();
    return (user && user.unlockedLevels && user.unlockedLevels[exId]) || 1;
  },

  getHistory() {
    const user = this.currentUser();
    return user ? user.sessions : [];
  },

  getBest(exerciseId, level) {
    const user = this.currentUser();
    if (!user) return null;
    if (level) {
      return user.bests[`${exerciseId}_L${level}`] || null;
    }
    return user.bests[exerciseId] || null;
  },

  getTodaySeconds() {
    const user = this.currentUser();
    if (!user) return 0;
    const today = new Date().toDateString();
    return user.sessions
      .filter(s => new Date(s.ts).toDateString() === today)
      .reduce((sum, s) => sum + (s.duration || 0), 0);
  },

  getStreakDays() {
    const user = this.currentUser();
    if (!user || !user.sessions.length) return 0;
    const days = [...new Set(user.sessions.map(s => new Date(s.ts).toDateString()))];
    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      if (days.includes(d.toDateString())) streak++;
      else if (i > 0) break;
    }
    return streak;
  },

  resetData() {
    const key = this.currentKey();
    if (!key) return;
    const users = this.getUsers();
    if (!users[key]) return;
    users[key].sessions = [];
    users[key].bests = {};
    users[key].unlockedLevels = { peripheral_flash: 1, arrow_reaction: 1, number_scatter: 1 };
    this.saveUsers(users);
  }
};
