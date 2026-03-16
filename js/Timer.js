// ─── SESSION TIMER (10 min cap) ────────────────────────────────────
const MAX_SESSION = 10 * 60; // 600 seconds

const Timer = {
  elapsed: 0,
  running: false,
  _interval: null,
  _sessionStart: null,
  _exStart: null,

  start() {
    if (this.running) return;
    this.running = true;
    this._sessionStart = this._sessionStart || Date.now();
    this._exStart = Date.now();
    this._interval = setInterval(() => {
      this.elapsed++;
      this.render();
      if (this.elapsed >= MAX_SESSION) {
        this.stop();
        showSessionOver();
      }
    }, 1000);
  },

  stop() {
    this.running = false;
    clearInterval(this._interval);
    this._interval = null;
  },

  reset() {
    this.stop();
    this.elapsed = 0;
    this._sessionStart = null;
    this._exStart = null;
    this.render();
  },

  exerciseDuration() {
    if (!this._exStart) return 0;
    return Math.round((Date.now() - this._exStart) / 1000);
  },

  markExerciseStart() {
    this._exStart = Date.now();
  },

  remaining() {
    return Math.max(0, MAX_SESSION - this.elapsed);
  },

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
      display.classList.toggle('warn', rem <= 60);
    }
  }
};
