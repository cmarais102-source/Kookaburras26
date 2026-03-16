// ─── APP CONTROLLER ───────────────────────────────────────────────
let currentGame = null;
let currentExerciseId = null;
let currentDifficultyLevel = 1;

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const p = document.getElementById('page-' + id);
  if (p) p.classList.add('active');
  const nav = document.getElementById('nav');
  if (id === 'login') { nav.classList.remove('visible'); }
  else {
    nav.classList.add('visible');
    document.querySelectorAll('.nav-link').forEach(l => {
      l.classList.toggle('active', l.dataset.page === id);
    });
  }
}

function showSessionOver() {
  Timer.stop();
  if (currentGame) { currentGame.cleanup(); currentGame = null; }
  document.getElementById('session-over').classList.add('show');
}

function showUnlockToast(label) {
  const toast = document.getElementById('unlock-toast');
  toast.textContent = `🔓 Unlocked: ${label}!`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

function showResult(exId, score, detail, level) {
  if (currentGame) { currentGame.cleanup(); }
  const duration = Timer.exerciseDuration();

  const unlocked = Auth.saveSession({ exercise: exId, score, detail, duration, level: level || 1, ts: Date.now() });

  if (unlocked) {
    const ex = EXERCISES.find(e => e.id === unlocked.exercise);
    setTimeout(() => showUnlockToast(`${ex ? ex.name : unlocked.exercise} — ${unlocked.label}`), 600);
  }

  const arena = document.getElementById('game-arena');
  const best = Auth.getBest(exId, level);
  const isNew = best === score && score > 0;

  // Unlock hint for next level
  const diffs = DIFFICULTIES[exId];
  const currentDiff = diffs ? diffs.find(d => d.level === (level || 1)) : null;
  const unlockedLevel = Auth.getUnlockedLevel(exId);
  let unlockHint = '';
  if (currentDiff && currentDiff.unlock_score && unlockedLevel === (level || 1)) {
    const need = currentDiff.unlock_score - score;
    if (need > 0) {
      unlockHint = `<div class="result-detail" style="color:var(--gold)">Score ${need} more to unlock ${diffs[(level||1)].label} difficulty!</div>`;
    }
  }

  arena.innerHTML = `
    <div class="result-panel">
      <h2>${isNew ? '🏆 NEW BEST' : 'Round Complete'}</h2>
      <div class="result-score">${score}</div>
      <div class="result-detail">${detail}</div>
      ${best ? `<div class="result-detail" style="color:var(--text-muted)">Personal best (Level ${level||1}): ${best}</div>` : ''}
      ${unlockHint}
      <div class="result-actions">
        <button class="btn-primary btn-start" onclick="startExercise('${exId}', ${level||1})">Play Again</button>
        <button class="btn-secondary" onclick="goToDashboard()">Dashboard</button>
      </div>
    </div>
  `;
}

function goToDashboard() {
  if (currentGame) { currentGame.cleanup(); currentGame = null; }
  showPage('dashboard');
  renderDashboard();
}

// ─── DIFFICULTY SELECTOR ──────────────────────────────────────────
function startExercise(id, level) {
  const ex = EXERCISES.find(e => e.id === id);
  if (!ex || ex.locked) return;

  const diffs = DIFFICULTIES[id];
  const unlockedLevel = Auth.getUnlockedLevel(id);

  // If multiple levels available, show selector first
  if (diffs && unlockedLevel > 1 && !level) {
    showDifficultySelector(id, ex, diffs, unlockedLevel);
    return;
  }

  launchWithLevel(id, ex, level || 1);
}

function showDifficultySelector(id, ex, diffs, unlockedLevel) {
  showPage('exercise');
  document.getElementById('ex-page-title').textContent = ex.name;
  const arena = document.getElementById('game-arena');

  const buttons = diffs.map(d => {
    const isLocked = d.level > unlockedLevel;
    const cls = isLocked ? 'diff-locked' : (d.level === 1 ? 'diff-easy' : d.level === 2 ? 'diff-medium' : 'diff-hard');
    return `<button
      class="btn-secondary"
      style="min-width:160px;${isLocked ? 'opacity:0.4;cursor:not-allowed' : ''}"
      ${isLocked ? 'disabled' : `onclick="launchWithLevel('${id}', null, ${d.level})"`}>
      <span class="diff-badge ${cls}">${d.label}</span>
      <div style="margin-top:0.4rem;font-size:0.75rem;color:var(--text-muted)">${
        d.level === 1 ? 'Starter speed' : d.level === 2 ? 'Faster targets' : 'Maximum speed'
      }</div>
      ${isLocked ? `<div class="unlock-hint">Score ${diffs[d.level-2].unlock_score}+ on ${diffs[d.level-2].label} to unlock</div>` : ''}
    </button>`;
  }).join('');

  arena.innerHTML = `
    <div class="start-prompt">
      <div style="font-size:3rem;margin-bottom:1rem">${ex.icon}</div>
      <h2>${ex.name}</h2>
      <p>${ex.desc}</p>
      <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin-top:1.5rem">${buttons}</div>
    </div>
  `;
}

function launchWithLevel(id, ex, level) {
  if (!ex) ex = EXERCISES.find(e => e.id === id);
  currentExerciseId = id;
  currentDifficultyLevel = level;
  document.getElementById('ex-page-title').textContent = ex.name;

  const diffs = DIFFICULTIES[id];
  const diff = diffs ? diffs.find(d => d.level === level) : null;

  const arena = document.getElementById('game-arena');
  arena.innerHTML = `
    <div id="countdown-overlay" class="show">
      <span id="countdown-num">3</span>
      <button id="countdown-pause-btn" onclick="Timer.toggle()">⏸ Pause Session</button>
    </div>
  `;

  showPage('exercise');
  Timer.markExerciseStart();
  if (!Timer.running) Timer.start();

  let count = 3;
  const numEl = document.getElementById('countdown-num');

  const tick = setInterval(() => {
    if (Timer.paused) return;
    count--;
    if (count <= 0) {
      clearInterval(tick);
      document.getElementById('countdown-overlay').classList.remove('show');
      actuallyLaunch(id, arena, diff);
    } else {
      numEl.textContent = count;
      numEl.style.animation = 'none';
      requestAnimationFrame(() => { numEl.style.animation = 'countPop 0.8s ease'; });
    }
  }, 800);
}

function actuallyLaunch(id, arena, diff) {
  switch (id) {
    case 'peripheral_flash': currentGame = GamePeripheralFlash; break;
    case 'arrow_reaction':   currentGame = GameArrowReaction;   break;
    case 'number_scatter':   currentGame = GameNumberScatter;   break;
  }
  if (currentGame) currentGame.init(arena, diff);
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
  document.getElementById('stat-today').textContent = Math.floor(todaySecs / 60);
  document.getElementById('stat-streak').textContent = Auth.getStreakDays();
  document.getElementById('stat-sessions').textContent = user.sessions.length;

  const pct = Math.min(100, (todaySecs / 600) * 100);
  document.getElementById('session-progress').style.width = pct + '%';
  document.getElementById('progress-used').textContent = `${Math.floor(todaySecs/60)}m ${todaySecs%60}s used`;
  document.getElementById('progress-left').textContent = `${Math.floor(Math.max(0,600-todaySecs)/60)}m ${Math.max(0,600-todaySecs)%60}s left today`;

  Timer.render();

  // Exercise grid
  const grid = document.getElementById('exercise-grid');
  grid.innerHTML = '';
  EXERCISES.forEach(ex => {
    const best = Auth.getBest(ex.id);
    const unlockedLevel = Auth.getUnlockedLevel(ex.id);
    const diffs = DIFFICULTIES[ex.id];
    const card = document.createElement('div');
    card.className = 'ex-card' + (ex.locked ? ' locked' : '');

    let diffBadges = '';
    let unlockHint = '';
    if (diffs && !ex.locked) {
      diffBadges = diffs.map(d => {
        const isUnlocked = d.level <= unlockedLevel;
        const cls = !isUnlocked ? 'diff-locked' : (d.level===1?'diff-easy':d.level===2?'diff-medium':'diff-hard');
        return `<span class="diff-badge ${cls}">${isUnlocked ? d.label : '🔒'}</span>`;
      }).join('');
      if (unlockedLevel < diffs.length) {
        const next = diffs[unlockedLevel - 1];
        unlockHint = `<div class="unlock-hint">Score ${next.unlock_score}+ to unlock ${diffs[unlockedLevel].label}</div>`;
      }
    }

    card.innerHTML = `
      <div class="ex-icon">${ex.icon}</div>
      <div class="ex-name">${ex.name}</div>
      <div class="ex-desc">${ex.desc}</div>
      <div class="ex-meta">
        ${diffBadges}
        ${best ? `<span class="ex-best">Best: <span>${best}</span></span>` : ''}
      </div>
      ${unlockHint}
      ${ex.locked ? '<div class="unlock-hint">— Coming soon</div>' : ''}
    `;
    if (!ex.locked) card.addEventListener('click', () => startExercise(ex.id));
    grid.appendChild(card);
  });

  // History table
  const history = Auth.getHistory().slice(0, 8);
  const tbody = document.getElementById('history-tbody');
  if (!history.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="color:var(--text-muted);text-align:center;padding:1rem">No sessions yet — pick an exercise above!</td></tr>`;
  } else {
    tbody.innerHTML = history.map(s => {
      const ex = EXERCISES.find(e => e.id === s.exercise);
      const date = new Date(s.ts).toLocaleDateString('en-GB', {day:'numeric',month:'short'});
      const time = new Date(s.ts).toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'});
      const lvl = s.level ? `L${s.level}` : '';
      return `<tr>
        <td>${date} ${time}</td>
        <td>${ex ? ex.icon + ' ' + ex.name : s.exercise} ${lvl ? `<span style="color:var(--text-muted);font-size:0.72rem">${lvl}</span>` : ''}</td>
        <td class="score">${s.score}</td>
        <td style="color:var(--text-muted)">${s.detail || ''}</td>
      </tr>`;
    }).join('');
  }
}

// ─── PROGRESS PAGE ────────────────────────────────────────────────
let progressFilter = 'peripheral_flash';

function renderProgress() {
  const history = Auth.getHistory();
  const exIds = ['peripheral_flash', 'arrow_reaction', 'number_scatter'];

  // Filter buttons
  const filterWrap = document.getElementById('progress-filter');
  filterWrap.innerHTML = exIds.map(id => {
    const ex = EXERCISES.find(e => e.id === id);
    return `<button class="ex-filter-btn${progressFilter===id?' active':''}" onclick="setProgressFilter('${id}')">${ex.icon} ${ex.name}</button>`;
  }).join('');

  renderScoreChart(history);
  renderReactionChart(history);
  renderDailyChart(history);
}

function setProgressFilter(id) {
  progressFilter = id;
  renderProgress();
}

function renderScoreChart(history) {
  const wrap = document.getElementById('chart-scores');
  const data = history.filter(s => s.exercise === progressFilter).slice(0, 20).reverse();

  if (data.length < 2) {
    wrap.innerHTML = '<div class="chart-empty">Play at least 2 sessions to see your score trend.</div>';
    return;
  }

  const W = wrap.offsetWidth || 500, H = 180;
  const pad = { top: 20, right: 20, bottom: 40, left: 45 };
  const scores = data.map(s => s.score);
  const maxS = Math.max(...scores), minS = Math.max(0, Math.min(...scores) - 5);

  const sx = (i) => pad.left + i * (W - pad.left - pad.right) / (data.length - 1);
  const sy = (v) => pad.top + (1 - (v - minS) / (maxS - minS + 1)) * (H - pad.top - pad.bottom);

  const pts = data.map((d, i) => `${sx(i)},${sy(d.score)}`).join(' ');
  const areaPts = `${sx(0)},${H - pad.bottom} ${pts} ${sx(data.length-1)},${H - pad.bottom}`;

  const labels = data.map((d, i) => {
    if (i % Math.ceil(data.length / 6) !== 0 && i !== data.length - 1) return '';
    const dt = new Date(d.ts);
    return `<text class="chart-label" x="${sx(i)}" y="${H - 10}" text-anchor="middle">${dt.getDate()}/${dt.getMonth()+1}</text>`;
  }).join('');

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(t => {
    const v = Math.round(minS + t * (maxS - minS));
    const y = sy(v);
    return `<line class="chart-grid-line" x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}"/>
            <text class="chart-label" x="${pad.left - 8}" y="${y + 4}" text-anchor="end">${v}</text>`;
  }).join('');

  wrap.innerHTML = `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#00e676" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#00e676" stop-opacity="0"/>
    </linearGradient></defs>
    ${gridLines}
    <polyline class="chart-area" points="${areaPts}" fill="url(#chartGrad)"/>
    <polyline class="chart-line" points="${pts}"/>
    ${data.map((d,i) => `<circle class="chart-dot" cx="${sx(i)}" cy="${sy(d.score)}" r="4"><title>Score: ${d.score}</title></circle>`).join('')}
    ${labels}
    <line class="chart-axis" x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${H-pad.bottom}"/>
    <line class="chart-axis" x1="${pad.left}" y1="${H-pad.bottom}" x2="${W-pad.right}" y2="${H-pad.bottom}"/>
  </svg>`;
}

function renderReactionChart(history) {
  const wrap = document.getElementById('chart-reaction');
  const data = history.filter(s =>
    (s.exercise === 'arrow_reaction') && s.detail && s.detail.includes('avg reaction')
  ).slice(0, 20).reverse();

  if (data.length < 2) {
    wrap.innerHTML = '<div class="chart-empty">Play Arrow Reaction to see your reaction time trend.</div>';
    return;
  }

  const W = wrap.offsetWidth || 500, H = 180;
  const pad = { top: 20, right: 20, bottom: 40, left: 55 };

  const rts = data.map(s => {
    const m = s.detail.match(/avg reaction (\d+)ms/);
    return m ? parseInt(m[1]) : null;
  }).filter(Boolean);

  if (rts.length < 2) { wrap.innerHTML = '<div class="chart-empty">Not enough reaction data yet.</div>'; return; }

  const maxR = Math.max(...rts), minR = Math.max(0, Math.min(...rts) - 20);
  const sx = (i) => pad.left + i * (W - pad.left - pad.right) / (rts.length - 1);
  const sy = (v) => pad.top + (1 - (v - minR) / (maxR - minR + 50)) * (H - pad.top - pad.bottom);

  const pts = rts.map((v, i) => `${sx(i)},${sy(v)}`).join(' ');
  const areaPts = `${sx(0)},${H - pad.bottom} ${pts} ${sx(rts.length-1)},${H - pad.bottom}`;

  wrap.innerHTML = `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="rtGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4fc3f7" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#4fc3f7" stop-opacity="0"/>
    </linearGradient></defs>
    ${[0,0.5,1].map(t => {
      const v = Math.round(minR + t * (maxR - minR));
      const y = sy(v);
      return `<line class="chart-grid-line" x1="${pad.left}" y1="${y}" x2="${W-pad.right}" y2="${y}"/>
              <text class="chart-label" x="${pad.left-8}" y="${y+4}" text-anchor="end">${v}ms</text>`;
    }).join('')}
    <polyline points="${areaPts}" fill="url(#rtGrad)" style="opacity:0.3"/>
    <polyline points="${pts}" fill="none" stroke="#4fc3f7" stroke-width="2"/>
    ${rts.map((v,i)=>`<circle cx="${sx(i)}" cy="${sy(v)}" r="4" fill="#4fc3f7"><title>${v}ms</title></circle>`).join('')}
    <line class="chart-axis" x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${H-pad.bottom}"/>
    <line class="chart-axis" x1="${pad.left}" y1="${H-pad.bottom}" x2="${W-pad.right}" y2="${H-pad.bottom}"/>
  </svg><div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.5rem">Lower is better — faster reactions</div>`;
}

function renderDailyChart(history) {
  const wrap = document.getElementById('chart-daily');
  if (!history.length) {
    wrap.innerHTML = '<div class="chart-empty">No training data yet.</div>';
    return;
  }

  // Last 14 days
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    const secs = history.filter(s => new Date(s.ts).toDateString() === key).reduce((sum, s) => sum + (s.duration || 0), 0);
    days.push({ label: `${d.getDate()}/${d.getMonth()+1}`, mins: Math.min(10, secs / 60) });
  }

  const W = wrap.offsetWidth || 700, H = 160;
  const pad = { top: 20, right: 20, bottom: 35, left: 40 };
  const barW = (W - pad.left - pad.right) / days.length - 4;

  const bars = days.map((d, i) => {
    const x = pad.left + i * ((W - pad.left - pad.right) / days.length);
    const barH = (d.mins / 10) * (H - pad.top - pad.bottom);
    const y = H - pad.bottom - barH;
    const isDone = d.mins >= 10;
    return `<rect x="${x + 2}" y="${y}" width="${barW}" height="${Math.max(2, barH)}" rx="3"
      fill="${isDone ? 'var(--accent)' : 'var(--accent)55'}" opacity="${d.mins > 0 ? 0.85 : 0.15}">
      <title>${d.label}: ${d.mins.toFixed(1)} min</title></rect>
    <text class="chart-label" x="${x + barW/2 + 2}" y="${H - 10}" text-anchor="middle">${i % 3 === 0 ? d.label : ''}</text>`;
  }).join('');

  wrap.innerHTML = `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <line class="chart-grid-line" x1="${pad.left}" y1="${pad.top}" x2="${W-pad.right}" y2="${pad.top}"/>
    <text class="chart-label" x="${pad.left-8}" y="${pad.top+4}" text-anchor="end">10m</text>
    <text class="chart-label" x="${pad.left-8}" y="${H-pad.bottom+4}" text-anchor="end">0</text>
    ${bars}
    <line class="chart-axis" x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${H-pad.bottom}"/>
    <line class="chart-axis" x1="${pad.left}" y1="${H-pad.bottom}" x2="${W-pad.right}" y2="${H-pad.bottom}"/>
  </svg>`;
}

// ─── SETTINGS PAGE ────────────────────────────────────────────────
function renderSettings() {
  const user = Auth.currentUser();
  if (!user) return;

  document.getElementById('set-username').textContent = user.username;
  document.getElementById('set-sessions').textContent = user.sessions.length;
  document.getElementById('set-since').textContent = new Date(user.createdAt).toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'});

  const diffWrap = document.getElementById('set-diff-progress');
  const exIds = ['peripheral_flash', 'arrow_reaction', 'number_scatter'];
  diffWrap.innerHTML = exIds.map(id => {
    const ex = EXERCISES.find(e => e.id === id);
    const diffs = DIFFICULTIES[id];
    const unlocked = Auth.getUnlockedLevel(id);
    const pips = diffs.map((d, i) => {
      const cls = i < unlocked ? 'done' : i === unlocked ? 'current' : '';
      return `<div class="diff-pip ${cls}" title="${d.label}"></div>`;
    }).join('');
    return `<div class="diff-progress-row">
      <span class="diff-progress-name">${ex.icon} ${ex.name}</span>
      <div class="diff-progress-status">${pips}</div>
    </div>`;
  }).join('');
}

// ─── AUTH SETUP ───────────────────────────────────────────────────
function setupAuth() {
  let mode = 'login';
  const errorEl  = document.getElementById('login-error');
  const titleEl  = document.getElementById('login-title');
  const submitEl = document.getElementById('login-submit');
  const toggleEl = document.getElementById('login-toggle-text');

  function rebindToggle() {
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
      rebindToggle();
    });
  }
  rebindToggle();

  document.getElementById('login-form-el').addEventListener('submit', e => {
    e.preventDefault();
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    errorEl.classList.remove('show');
    const result = mode === 'login' ? Auth.login(user, pass) : Auth.register(user, pass);
    if (!result.ok) { errorEl.textContent = result.msg; errorEl.classList.add('show'); }
    else onLogin();
  });
}

function onLogin() {
  showPage('dashboard');
  renderDashboard();
  Timer.reset();
  document.getElementById('nav-username').textContent = Auth.currentUser().username;
}

function setupNav() {
  document.getElementById('nav-logo-link').addEventListener('click', () => {
    if (Auth.currentKey()) goToDashboard();
  });

  document.getElementById('nav-logout').addEventListener('click', () => {
    Timer.reset();
    if (currentGame) { currentGame.cleanup(); currentGame = null; }
    Auth.logout();
    showPage('login');
  });

  document.getElementById('nav-pause-btn').addEventListener('click', () => Timer.toggle());

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      const page = link.dataset.page;
      if (page === 'dashboard') { goToDashboard(); }
      else if (page === 'progress') { showPage('progress'); renderProgress(); }
      else if (page === 'settings') { showPage('settings'); renderSettings(); }
    });
  });
}

function setupSessionOver() {
  document.getElementById('session-over-close').addEventListener('click', () => {
    document.getElementById('session-over').classList.remove('show');
    goToDashboard();
  });
}

function setupPausedOverlay() {
  document.getElementById('paused-resume-btn').addEventListener('click', () => Timer.resume());
}

function setupSettings() {
  document.getElementById('set-reset-btn').addEventListener('click', () => {
    if (confirm('Reset ALL your training data? This cannot be undone.')) {
      Auth.resetData();
      renderSettings();
      renderDashboard();
    }
  });
}

// ─── INIT ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupAuth();
  setupNav();
  setupSessionOver();
  setupPausedOverlay();
  setupSettings();
  Timer.render();

  if (Auth.currentKey() && Auth.currentUser()) onLogin();
  else showPage('login');
});
