// ─── APP CONTROLLER ───────────────────────────────────────────────
let currentGame = null;
let currentExerciseId = null;

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const p = document.getElementById('page-' + id);
  if (p) p.classList.add('active');

  const nav = document.getElementById('nav');
  if (id === 'login') { nav.classList.remove('visible'); }
  else { nav.classList.add('visible'); }
}

function showSessionOver() {
  Timer.stop();
  if (currentGame) { currentGame.cleanup(); currentGame = null; }
  document.getElementById('session-over').classList.add('show');
}

function showResult(exId, score, detail) {
  if (currentGame) { currentGame.cleanup(); }
  const duration = Timer.exerciseDuration();

  Auth.saveSession({
    exercise: exId,
    score,
    detail,
    duration,
    ts: Date.now()
  });

  const arena = document.getElementById('game-arena');
  const best = Auth.getBest(exId);
  const isNew = best === score && score > 0;

  arena.innerHTML = `
    <div class="result-panel">
      <h2>${isNew ? '🏆 NEW BEST' : 'Round Complete'}</h2>
      <div class="result-score">${score}</div>
      <div class="result-detail">${detail}</div>
      ${best ? `<div class="result-detail" style="color:var(--text-muted)">Personal best: ${best}</div>` : ''}
      <div class="result-actions">
        <button class="btn-primary btn-start" onclick="startExercise('${exId}')">Play Again</button>
        <button class="btn-secondary" onclick="goToDashboard()">Back to Dashboard</button>
      </div>
    </div>
  `;
}

function goToDashboard() {
  if (currentGame) { currentGame.cleanup(); currentGame = null; }
  showPage('dashboard');
  renderDashboard();
}

function startExercise(id) {
  const ex = EXERCISES.find(e => e.id === id);
  if (!ex || ex.locked) return;

  currentExerciseId = id;
  document.getElementById('ex-page-title').textContent = ex.name;

  const arena = document.getElementById('game-arena');
  arena.innerHTML = `
    <div id="countdown-overlay" class="show">
      <span id="countdown-num">3</span>
    </div>
    <div class="start-prompt">
      <h2>${ex.icon} ${ex.name}</h2>
      <p>${ex.desc}</p>
    </div>
  `;

  showPage('exercise');
  Timer.markExerciseStart();
  if (!Timer.running) Timer.start();

  let count = 3;
  const overlay = document.getElementById('countdown-overlay');
  const numEl = document.getElementById('countdown-num');

  const tick = setInterval(() => {
    count--;
    if (count <= 0) {
      clearInterval(tick);
      overlay.classList.remove('show');
      launchGame(id, arena);
    } else {
      numEl.textContent = count;
    }
  }, 800);
}

function launchGame(id, arena) {
  const overlay = document.getElementById('countdown-overlay');
  if (overlay) overlay.remove();

  switch (id) {
    case 'peripheral_flash':
      currentGame = GamePeripheralFlash;
      break;
    case 'reaction_tap':
      currentGame = GameReactionTap;
      break;
    case 'number_scatter':
      currentGame = GameNumberScatter;
      break;
  }

  if (currentGame) currentGame.init(arena);
}

// ─── DASHBOARD RENDER ─────────────────────────────────────────────
function renderDashboard() {
  const user = Auth.currentUser();
  if (!user) return;

  document.getElementById('dash-name').textContent = user.username;
  document.getElementById('dash-date').textContent = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const todaySecs = Auth.getTodaySeconds();
  const todayMins = Math.floor(todaySecs / 60);
  const streak = Auth.getStreakDays();
  const totalSessions = user.sessions.length;

  document.getElementById('stat-today').textContent = todayMins;
  document.getElementById('stat-streak').textContent = streak;
  document.getElementById('stat-sessions').textContent = totalSessions;

  const pct = Math.min(100, (todaySecs / 600) * 100);
  document.getElementById('session-progress').style.width = pct + '%';
  document.getElementById('progress-used').textContent = `${Math.floor(todaySecs / 60)}m ${todaySecs % 60}s used`;
  document.getElementById('progress-left').textContent = `${Math.floor(Math.max(0, 600 - todaySecs) / 60)}m ${Math.max(0, 600 - todaySecs) % 60}s left today`;

  Timer.render();

  const grid = document.getElementById('exercise-grid');
  grid.innerHTML = '';
  EXERCISES.forEach(ex => {
    const best = Auth.getBest(ex.id);
    const card = document.createElement('div');
    card.className = 'ex-card' + (ex.locked ? ' locked' : '');
    card.innerHTML = `
      <div class="ex-icon">${ex.icon}</div>
      <div class="ex-name">${ex.name}</div>
      <div class="ex-desc">${ex.desc}</div>
      ${best ? `<div class="ex-best">Best: <span>${best}</span></div>` : ''}
      ${ex.locked ? `<div class="ex-best" style="color:var(--text-muted)">— Coming soon</div>` : ''}
    `;
    if (!ex.locked) {
      card.addEventListener('click', () => startExercise(ex.id));
    }
    grid.appendChild(card);
  });

  const history = Auth.getHistory().slice(0, 8);
  const tbody = document.getElementById('history-tbody');
  if (history.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="color:var(--text-muted);text-align:center;padding:1rem">No sessions yet — pick an exercise above to start!</td></tr>`;
  } else {
    tbody.innerHTML = history.map(s => {
      const ex = EXERCISES.find(e => e.id === s.exercise);
      const date = new Date(s.ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const time = new Date(s.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      return `<tr>
        <td>${date} ${time}</td>
        <td>${ex ? ex.icon + ' ' + ex.name : s.exercise}</td>
        <td class="score">${s.score}</td>
        <td style="color:var(--text-muted)">${s.detail || ''}</td>
      </tr>`;
    }).join('');
  }
}

// ─── LOGIN / REGISTER ─────────────────────────────────────────────
function setupAuth() {
  let mode = 'login';

  const errorEl = document.getElementById('login-error');
  const titleEl = document.getElementById('login-title');
  const submitEl = document.getElementById('login-submit');
  const toggleEl = document.getElementById('login-toggle-text');

  document.getElementById('login-toggle-link').addEventListener('click', () => {
    mode = mode === 'login' ? 'register' : 'login';
    if (mode === 'register') {
      titleEl.textContent = 'Create Account';
      submitEl.textContent = 'Create Account';
      toggleEl.innerHTML = 'Already have an account? <a id="login-toggle-link">Sign in</a>';
    } else {
      titleEl.textContent = 'Sign In';
      submitEl.textContent = 'Sign In';
      toggleEl.innerHTML = 'New here? <a id="login-toggle-link">Create an account</a>';
    }
    errorEl.classList.remove('show');
    document.getElementById('login-toggle-link').addEventListener('click', arguments.callee);
  });

  document.getElementById('login-form-el').addEventListener('submit', e => {
    e.preventDefault();
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    errorEl.classList.remove('show');

    const result = mode === 'login' ? Auth.login(user, pass) : Auth.register(user, pass);
    if (!result.ok) {
      errorEl.textContent = result.msg;
      errorEl.classList.add('show');
    } else {
      onLogin();
    }
  });
}

function onLogin() {
  showPage('dashboard');
  renderDashboard();
  Timer.reset();
  const user = Auth.currentUser();
  document.getElementById('nav-username').textContent = user.username;
}

function setupNav() {
  document.getElementById('nav-logout').addEventListener('click', () => {
    Timer.reset();
    if (currentGame) { currentGame.cleanup(); currentGame = null; }
    Auth.logout();
    showPage('login');
    document.getElementById('nav').classList.remove('visible');
  });

  document.getElementById('nav-logo-link').addEventListener('click', () => {
    if (Auth.currentKey()) {
      if (currentGame) { currentGame.cleanup(); currentGame = null; }
      goToDashboard();
    }
  });
}

function setupSessionOver() {
  document.getElementById('session-over-close').addEventListener('click', () => {
    document.getElementById('session-over').classList.remove('show');
    goToDashboard();
  });
}

// ─── INIT ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupAuth();
  setupNav();
  setupSessionOver();
  Timer.render();

  if (Auth.currentKey() && Auth.currentUser()) {
    onLogin();
  } else {
    showPage('login');
  }
});
