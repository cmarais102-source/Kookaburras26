// ─── SESSION TIMER (10 min cap, with pause/resume) ─────────────────
const MAX_SESSION = 10 * 60;

const Timer = {
  elapsed: 0,
  running: false,
  paused: false,
  _interval: null,
  _exStart: null,
  _exElapsed: 0,

  start() {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this._exStart = this._exStart || Date.now();
    this._interval = setInterval(() => {
      this.elapsed++;
      this.render();
      if (this.elapsed >= MAX_SESSION) {
        this.stop();
        showSessionOver();
      }
    }, 1000);
    this._updatePauseBtn();
  },

  pause() {
    if (!this.running) return;
    this.running = false;
    this.paused = true;
    clearInterval(this._interval);
    this._interval = null;
    // Accumulate exercise time
    if (this._exStart) {
      this._exElapsed += Math.round((Date.now() - this._exStart) / 1000);
      this._exStart = null;
    }
    this._updatePauseBtn();
    document.getElementById('paused-overlay').classList.add('show');
  },

  resume() {
    if (this.running) return;
    this.paused = false;
    this._exStart = Date.now();
    document.getElementById('paused-overlay').classList.remove('show');
    this.start();
  },

  toggle() {
    if (this.running) this.pause();
    else this.resume();
  },

  stop() {
    this.running = false;
    clearInterval(this._interval);
    this._interval = null;
    this._updatePauseBtn();
  },

  reset() {
    this.stop();
    this.elapsed = 0;
    this.paused = false;
    this._exStart = null;
    this._exElapsed = 0;
    document.getElementById('paused-overlay').classList.remove('show');
    this.render();
    this._updatePauseBtn();
  },

  exerciseDuration() {
    let total = this._exElapsed;
    if (this._exStart) total += Math.round((Date.now() - this._exStart) / 1000);
    return total;
  },

  markExerciseStart() {
    this._exStart = Date.now();
    this._exElapsed = 0;
  },

  remaining() { return Math.max(0, MAX_SESSION - this.elapsed); },

  fmt(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  },

  render() {
    const rem = this.remaining();
    const display = document.getElementById('nav-time-display');
    if (display) {
      display.textContent = this.fmt(rem);
      display.classList.toggle('warn', rem <= 60 && rem > 0);
    }
  },

  _updatePauseBtn() {
    const btn = document.getElementById('nav-pause-btn');
    if (btn) btn.textContent = this.running ? '⏸' : '▶';
    const cdBtn = document.getElementById('countdown-pause-btn');
    if (cdBtn) cdBtn.textContent = this.running ? '⏸ Pause Session' : '▶ Resume Session';
  }
};
