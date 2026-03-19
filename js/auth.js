// ─── FIREBASE CONFIG ──────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyB504Xb4PpFoiXnO7bA8iJ7eWS0fuu0Kvc",
  authDomain:        "kookaburrasvt.firebaseapp.com",
  projectId:         "kookaburrasvt",
  storageBucket:     "kookaburrasvt.firebasestorage.app",
  messagingSenderId: "369464801585",
  appId:             "1:369464801585:web:b9e2e0c8530397d7e61810"
};

// Firebase is loaded via CDN scripts in index.html (compat version)
firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore();

const ADMIN_USER = 'craig.marais19';

// ─── AUTH ─────────────────────────────────────────────────────────
const Auth = {
  SESSION_KEY:  'vt_session',
  _cachedUser:  null,

  currentKey()  { return sessionStorage.getItem(this.SESSION_KEY); },
  currentUser() { return this._cachedUser || null; },
  isAdmin()     { return this.currentKey() === ADMIN_USER.toLowerCase(); },

  _blank(username, password) {
    return {
      username,
      password:  btoa(password),
      createdAt: Date.now(),
      sessions:  [],
      bests:     {},
      levels: {
        peripheral_flash: 1,
        arrow_reaction:   1,
        number_scatter:   1,
        shape_counter:    1
      },
      consecutive: {
        peripheral_flash: 0,
        arrow_reaction:   0,
        number_scatter:   0,
        shape_counter:    0
      }
    };
  },

  // ── Register ──────────────────────────────────────────────────
  async register(username, password) {
    const key = username.toLowerCase().trim();
    if (!key || key.length < 2) return { ok:false, msg:'Username must be at least 2 characters.' };
    if (password.length < 4)    return { ok:false, msg:'Password must be at least 4 characters.' };
    try {
      const doc = await db.collection('users').doc(key).get();
      if (doc.exists) return { ok:false, msg:'Username already taken.' };
      const userData = this._blank(username.trim(), password);
      await db.collection('users').doc(key).set(userData);
      sessionStorage.setItem(this.SESSION_KEY, key);
      this._cachedUser = userData;
      return { ok:true };
    } catch(e) {
      console.error('Register error:', e);
      return { ok:false, msg:'Connection error. Please try again.' };
    }
  },

  // ── Login ─────────────────────────────────────────────────────
  async login(username, password) {
    const key = username.toLowerCase().trim();
    try {
      const doc = await db.collection('users').doc(key).get();
      if (!doc.exists) return { ok:false, msg:'User not found.' };
      const user = doc.data();
      if (atob(user.password) !== password) return { ok:false, msg:'Incorrect password.' };

      // Migrate old accounts
      let needsUpdate = false;
      if (!user.levels)      { user.levels      = { peripheral_flash:1, arrow_reaction:1, number_scatter:1, shape_counter:1 }; needsUpdate=true; }
      if (!user.consecutive) { user.consecutive = { peripheral_flash:0, arrow_reaction:0, number_scatter:0, shape_counter:0 }; needsUpdate=true; }
      if (!user.levels.shape_counter)                   { user.levels.shape_counter=1;      needsUpdate=true; }
      if (user.consecutive.shape_counter === undefined) { user.consecutive.shape_counter=0; needsUpdate=true; }
      if (needsUpdate) await db.collection('users').doc(key).set(user);

      sessionStorage.setItem(this.SESSION_KEY, key);
      this._cachedUser = user;
      return { ok:true };
    } catch(e) {
      console.error('Login error:', e);
      return { ok:false, msg:'Connection error. Please try again.' };
    }
  },

  // ── Logout ────────────────────────────────────────────────────
  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
    this._cachedUser = null;
  },

  // ── Save session & check level up ─────────────────────────────
  async saveSession(data) {
    const key = this.currentKey();
    if (!key) return null;
    try {
      const doc  = await db.collection('users').doc(key).get();
      if (!doc.exists) return null;
      const user = doc.data();

      if (!user.sessions)  user.sessions = [];
      user.sessions.unshift(data);
      if (user.sessions.length > 200) user.sessions.length = 200;

      if (!user.bests) user.bests = {};
      const bk = `${data.exercise}_L${data.level}`;
      if (!user.bests[bk]            || data.score > user.bests[bk])            user.bests[bk]           = data.score;
      if (!user.bests[data.exercise] || data.score > user.bests[data.exercise]) user.bests[data.exercise] = data.score;

      // Level up check
      let levelUp    = null;
      const exId     = data.exercise;
      const curLevel = user.levels[exId] || 1;

      if (data.passed) {
        user.consecutive[exId] = (user.consecutive[exId] || 0) + 1;
        if (user.consecutive[exId] >= 3 && curLevel < MAX_LEVEL) {
          user.levels[exId]      = curLevel + 1;
          user.consecutive[exId] = 0;
          levelUp = { exercise: exId, newLevel: curLevel + 1 };
        }
      } else {
        user.consecutive[exId] = 0;
      }

      await db.collection('users').doc(key).set(user);
      this._cachedUser = user;
      return levelUp;
    } catch(e) {
      console.error('SaveSession error:', e);
      return null;
    }
  },

  // ── Getters ───────────────────────────────────────────────────
  getUserLevel(exId) {
    const u = this._cachedUser;
    return (u && u.levels && u.levels[exId]) || 1;
  },

  getConsecutive(exId) {
    const u = this._cachedUser;
    return (u && u.consecutive && u.consecutive[exId]) || 0;
  },

  getMaxAccessible() {
    const u = this._cachedUser;
    if (!u) return STAGE_SIZE;
    return maxAccessibleLevel(u.levels);
  },

  getBest(exId, level) {
    const u = this._cachedUser;
    if (!u) return null;
    return level ? (u.bests[`${exId}_L${level}`] || null) : (u.bests[exId] || null);
  },

  getTodaySeconds() {
    const u = this._cachedUser;
    if (!u || !u.sessions) return 0;
    const today = new Date().toDateString();
    return u.sessions
      .filter(s => new Date(s.ts).toDateString() === today)
      .reduce((sum, s) => sum + (s.duration || 0), 0);
  },

  getStreakDays() {
    const u = this._cachedUser;
    if (!u || !u.sessions || !u.sessions.length) return 0;
    const days = [...new Set(u.sessions.map(s => new Date(s.ts).toDateString()))];
    let streak  = 0;
    const now   = new Date();
    for (let i=0; i<365; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      if (days.includes(d.toDateString())) streak++;
      else if (i > 0) break;
    }
    return streak;
  },

  getHistory(limit) {
    const u = this._cachedUser;
    const s = (u && u.sessions) ? u.sessions : [];
    return limit ? s.slice(0, limit) : s;
  },

  resetData() {
    const key = this.currentKey();
    if (!key) return;
    const fresh = {
      ...this._cachedUser,
      sessions:    [],
      bests:       {},
      levels:      { peripheral_flash:1, arrow_reaction:1, number_scatter:1, shape_counter:1 },
      consecutive: { peripheral_flash:0, arrow_reaction:0, number_scatter:0, shape_counter:0 }
    };
    db.collection('users').doc(key).set(fresh);
    this._cachedUser = fresh;
  },

  // ── Admin ─────────────────────────────────────────────────────
  async getAllUsers() {
    try {
      const snap = await db.collection('users').get();
      return snap.docs.map(doc => ({
        key:         doc.id,
        username:    doc.data().username,
        createdAt:   doc.data().createdAt,
        sessions:    doc.data().sessions    || [],
        levels:      doc.data().levels      || {},
        consecutive: doc.data().consecutive || {}
      }));
    } catch(e) {
      console.error('getAllUsers error:', e);
      return [];
    }
  }
};
