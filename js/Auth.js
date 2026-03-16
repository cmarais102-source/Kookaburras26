// ─── AUTH & STORAGE ───────────────────────────────────────────────
const Auth = {
  USERS_KEY: 'vt_users',
  SESSION_KEY: 'vt_session',

  getUsers() {
    return JSON.parse(localStorage.getItem(this.USERS_KEY) || '{}');
  },

  saveUsers(users) {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  },

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
      bests: {}
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
    sessionStorage.setItem(this.SESSION_KEY, key);
    return { ok: true };
  },

  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
  },

  currentKey() {
    return sessionStorage.getItem(this.SESSION_KEY);
  },

  currentUser() {
    const key = this.currentKey();
    if (!key) return null;
    const users = this.getUsers();
    return users[key] || null;
  },

  saveSession(sessionData) {
    const key = this.currentKey();
    if (!key) return;
    const users = this.getUsers();
    if (!users[key]) return;
    users[key].sessions.unshift(sessionData);
    if (users[key].sessions.length > 60) users[key].sessions.length = 60;
    const bests = users[key].bests;
    const ex = sessionData.exercise;
    const score = sessionData.score;
    if (!bests[ex] || score > bests[ex]) {
      bests[ex] = score;
    }
    this.saveUsers(users);
  },

  getHistory() {
    const user = this.currentUser();
    return user ? user.sessions : [];
  },

  getBest(exerciseId) {
    const user = this.currentUser();
    return user && user.bests[exerciseId] ? user.bests[exerciseId] : null;
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
  }
};
