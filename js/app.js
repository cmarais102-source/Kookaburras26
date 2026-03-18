// ─── APP ──────────────────────────────────────────────────────────
let currentGame = null;

// ── Page routing ─────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const p=document.getElementById('page-'+id);
  if(p) p.classList.add('active');
  const nav=document.getElementById('nav');
  if(id==='login'||id==='admin') nav.classList.remove('visible');
  else {
    nav.classList.add('visible');
    document.querySelectorAll('.nav-link').forEach(l=>l.classList.toggle('active',l.dataset.page===id));
  }
}

function showSessionOver() {
  Timer.stop();
  if(currentGame){currentGame.cleanup();currentGame=null;}
  document.getElementById('session-over').classList.add('show');
}

// ── Toast ─────────────────────────────────────────────────────────
function toast(msg, colour) {
  const t=document.getElementById('unlock-toast');
  t.textContent=msg; t.style.borderColor=colour||'var(--gold)'; t.style.color=colour||'var(--gold)';
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3500);
}

// ── Result screen ─────────────────────────────────────────────────
function showResult(exId, score, level, detail, passed, accuracy) {
  if(currentGame) currentGame.cleanup();
  const duration = Timer.exerciseDuration();
  const levelUp  = Auth.saveSession({exercise:exId, score, level, detail, passed, accuracy, duration, ts:Date.now()});

  if(levelUp) {
    const ex=EXERCISES.find(e=>e.id===levelUp.exercise);
    setTimeout(()=>toast(`🔓 Level up! ${ex?ex.name:''} → Level ${levelUp.newLevel}`),600);
  }

  const consecutive = Auth.getConsecutive(exId);
  const best        = Auth.getBest(exId, level);
  const isNew       = best===score && score>0;
  const cfg         = getLevel(exId, level);
  const maxAcc      = Auth.getMaxAccessible();
  const userLevel   = Auth.getUserLevel(exId);

  // Progress ring (consecutive passes out of 3)
  const ringPct = Math.round((consecutive/3)*100);
  const ring    = `<div class="consec-ring" title="${consecutive}/3 consecutive passes">
    <svg viewBox="0 0 44 44" width="44" height="44">
      <circle cx="22" cy="22" r="18" fill="none" stroke="var(--border)" stroke-width="4"/>
      <circle cx="22" cy="22" r="18" fill="none" stroke="${passed?'var(--accent)':'var(--warn)'}"
        stroke-width="4" stroke-dasharray="${2*Math.PI*18}"
        stroke-dashoffset="${2*Math.PI*18*(1-ringPct/100)}"
        stroke-linecap="round" transform="rotate(-90 22 22)"/>
      <text x="22" y="27" text-anchor="middle" font-size="13" font-weight="700"
        fill="${passed?'var(--accent)':'var(--warn)'}">${consecutive}/3</text>
    </svg>
    <div style="font-size:0.65rem;color:var(--text-muted);margin-top:0.2rem">passes</div>
  </div>`;

  const passMsg = passed
    ? (consecutive>=3 && levelUp ? '✅ Level cleared!' : `✅ Pass ${consecutive}/3 — keep going!`)
    : `❌ ${accuracy}% — need ${cfg?cfg.passAccuracy:0}% to pass`;

  const arena=document.getElementById('game-arena');
  arena.innerHTML=`
    <div class="result-panel">
      <div style="display:flex;align-items:center;justify-content:center;gap:1.5rem;margin-bottom:0.5rem">
        <div>
          <h2>${isNew?'🏆 NEW BEST':'Round Complete'}</h2>
          <div class="result-score">${score}</div>
        </div>
        ${ring}
      </div>
      <div class="result-detail">${detail}</div>
      <div class="result-detail" style="color:${passed?'var(--accent)':'var(--warn)'};font-weight:600">${passMsg}</div>
      ${best?`<div class="result-detail" style="color:var(--text-muted)">Best at Level ${level}: ${best}</div>`:''}
      <div class="result-actions">
        <button class="btn-primary" onclick="launchLevel('${exId}',${level})">Play Again</button>
        <button class="btn-secondary" onclick="goToDashboard()">Dashboard</button>
        ${userLevel<maxAcc?`<button class="btn-secondary" onclick="openLevelPicker('${exId}')">Change Level</button>`:''}
      </div>
    </div>`;
}

function goToDashboard() {
  if(currentGame){currentGame.cleanup();currentGame=null;}
  showPage('dashboard'); renderDashboard();
}

// ── Level picker ──────────────────────────────────────────────────
function openLevelPicker(exId) {
  const ex       = EXERCISES.find(e=>e.id===exId);
  const maxAcc   = Auth.getMaxAccessible();
  const curLevel = Auth.getUserLevel(exId);
  const consec   = Auth.getConsecutive(exId);
  showPage('exercise');
  document.getElementById('ex-page-title').textContent=ex.name;
  const arena=document.getElementById('game-arena');

  let html='<div class="level-picker">';
  html+=`<p style="font-size:0.85rem;color:var(--text-dim);margin-bottom:1.5rem">
    You are on Level <strong style="color:var(--accent)">${curLevel}</strong> &nbsp;·&nbsp;
    Max accessible: <strong style="color:var(--gold)">${maxAcc}</strong> &nbsp;·&nbsp;
    <span style="color:var(--gold)">${consec}/3</span> consecutive passes on current level
  </p>`;

  for(let stage=1; stage<=8; stage++) {
    const stageStart=(stage-1)*STAGE_SIZE+1;
    const stageEnd=stage*STAGE_SIZE;
    const stageUnlocked=stageStart<=maxAcc;
    html+=`<div class="level-stage${stageUnlocked?'':' locked'}">
      <div class="level-stage-title">Stage ${stage} — Levels ${stageStart}–${stageEnd}${stageUnlocked?'':'  🔒'}</div>
      <div class="level-stage-grid">`;

    for(let lvl=stageStart; lvl<=stageEnd; lvl++) {
      const locked = lvl > maxAcc;
      const isCur  = lvl === curLevel;
      const isDone = lvl < curLevel;
      const cfg    = getLevel(exId, lvl);

      // Bottom content: tick if done, pips if current, label if upcoming
      let bottom = '';
      if(isDone) {
        bottom = `<span class="level-tick">✓</span>`;
      } else if(isCur) {
        bottom = `<div class="lp-pips">
          ${[0,1,2].map(i=>`<div class="lp-pip${consec>i?' done':''}"></div>`).join('')}
        </div>`;
      } else {
        bottom = `<span class="level-label">${cfg?cfg.label:''}</span>`;
      }

      html+=`<button
        class="level-btn${locked?' locked':''}${isCur?' current':''}${isDone?' done':''}"
        ${locked?'disabled':''}
        onclick="launchLevel('${exId}',${lvl})"
        title="${cfg?cfg.label+' · '+cfg.passAccuracy+'% to pass':''}"
        style="--lc:${levelColour(lvl)}">
        <span class="level-num">${lvl}</span>
        ${bottom}
      </button>`;
    }
    html+='</div></div>';
  }
  html+='</div>';

  arena.innerHTML=`
    <div style="width:100%;overflow-y:auto;max-height:calc(100vh - 200px)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
        <div class="ex-page-title">${ex.icon} ${ex.name} — Choose Level</div>
        <button class="btn-back" onclick="goToDashboard()">← Back</button>
      </div>
      ${html}
    </div>`;
}

function launchLevel(exId, level) {
  const ex  = EXERCISES.find(e=>e.id===exId);
  const cfg = getLevel(exId, level);
  if(!cfg) return;
  document.getElementById('ex-page-title').textContent=`${ex.name} — Level ${level}`;
  const arena=document.getElementById('game-arena');
  showPage('exercise');
  Timer.markExerciseStart();
  if(!Timer.running) Timer.start();

  // Countdown
  arena.innerHTML=`<div id="countdown-overlay" class="show">
    <div id="cd-level" style="font-size:1rem;font-weight:700;color:var(--gold);letter-spacing:0.1em;margin-bottom:0.5rem">
      LEVEL ${level} · ${cfg.label.toUpperCase()} · ${cfg.passAccuracy}% NEEDED
    </div>
    <span id="countdown-num">3</span>
    <button id="countdown-pause-btn" onclick="Timer.toggle()">⏸ Pause</button>
  </div>`;

  let count=3;
  const numEl=document.getElementById('countdown-num');
  const tick=setInterval(()=>{
    if(Timer.paused) return;
    count--;
    if(count<=0){
      clearInterval(tick);
      document.getElementById('countdown-overlay').classList.remove('show');
      _launchGame(exId, arena, cfg);
    } else {
      numEl.textContent=count;
      numEl.style.animation='none';
      requestAnimationFrame(()=>{ numEl.style.animation='countPop 0.8s ease'; });
    }
  },800);
}

function _launchGame(exId, arena, cfg) {
  switch(exId){
    case 'peripheral_flash': currentGame=GamePeripheralFlash; break;
    case 'arrow_reaction':   currentGame=GameArrowReaction;   break;
    case 'number_scatter':   currentGame=GameNumberScatter;   break;
    case 'shape_counter': currentGame = GameShapeCounter; break;
  }
  if(currentGame) currentGame.init(arena,cfg);
}

// ─── DASHBOARD ────────────────────────────────────────────────────
function renderDashboard() {
  const user=Auth.currentUser(); if(!user) return;
  document.getElementById('dash-name').textContent=user.username;
  document.getElementById('dash-date').textContent=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  const todaySecs=Auth.getTodaySeconds();
  document.getElementById('stat-today').textContent=Math.floor(todaySecs/60);
  document.getElementById('stat-streak').textContent=Auth.getStreakDays();
  document.getElementById('stat-sessions').textContent=user.sessions.length;

  const pct=Math.min(100,(todaySecs/600)*100);
  document.getElementById('session-progress').style.width=pct+'%';
  document.getElementById('progress-used').textContent=`${Math.floor(todaySecs/60)}m ${todaySecs%60}s used`;
  document.getElementById('progress-left').textContent=`${Math.floor(Math.max(0,600-todaySecs)/60)}m ${Math.max(0,600-todaySecs)%60}s left today`;
  Timer.render();

  const maxAcc=Auth.getMaxAccessible();
  const grid=document.getElementById('exercise-grid'); grid.innerHTML='';
  EXERCISES.forEach(ex=>{
    const best=Auth.getBest(ex.id);
    const lvl=Auth.getUserLevel(ex.id);
    const cfg=getLevel(ex.id,lvl);
    const consec=Auth.getConsecutive(ex.id);
    const card=document.createElement('div');
    card.className='ex-card'+(ex.locked?' locked':'');
    const stageLabel=cfg?`Level ${lvl} · ${cfg.label}`:'';
    const consecBar=ex.locked?'':
      `<div class="consec-bar" title="${consec}/3 consecutive passes needed">
        ${[0,1,2].map(i=>`<div class="consec-pip${consec>i?' done':''}"></div>`).join('')}
        <span style="font-size:0.65rem;color:var(--text-muted)">${consec}/3</span>
      </div>`;
    card.innerHTML=`
      <div class="ex-icon">${ex.icon}</div>
      <div class="ex-name">${ex.name}</div>
      <div class="ex-desc">${ex.desc}</div>
      <div class="ex-meta">
        ${ex.locked?'<span style="color:var(--text-muted);font-size:0.75rem">Coming soon</span>':`
          <span class="diff-badge" style="color:${cfg?levelColour(lvl):'var(--text-muted)'};border-color:${cfg?levelColour(lvl)+'55':'var(--border)'}">
            ${stageLabel}
          </span>
          ${best?`<span class="ex-best">Best: <span>${best}</span></span>`:''}
        `}
      </div>
      ${consecBar}`;
    if(!ex.locked) card.addEventListener('click',()=>openLevelPicker(ex.id));
    grid.appendChild(card);
  });

  // History
  const history=Auth.getHistory(8);
  const tbody=document.getElementById('history-tbody');
  if(!history.length) {
    tbody.innerHTML=`<tr><td colspan="5" style="color:var(--text-muted);text-align:center;padding:1.5rem">No sessions yet — pick an exercise above!</td></tr>`;
  } else {
    tbody.innerHTML=history.map(s=>{
      const ex=EXERCISES.find(e=>e.id===s.exercise);
      const dt=new Date(s.ts);
      return `<tr>
        <td>${dt.toLocaleDateString('en-GB',{day:'numeric',month:'short'})} ${dt.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</td>
        <td>${ex?ex.icon+' '+ex.name:s.exercise}</td>
        <td><span class="diff-badge" style="color:${levelColour(s.level||1)};border-color:${levelColour(s.level||1)+'44'}">L${s.level||1}</span></td>
        <td class="score">${s.score}</td>
        <td style="color:${s.passed?'var(--accent)':'var(--warn)'}">${s.passed?'✓ Pass':'✗ Fail'}</td>
      </tr>`;
    }).join('');
  }
}

// ─── PROGRESS PAGE ────────────────────────────────────────────────
let progressFilter='peripheral_flash';
function renderProgress() {
  const exIds=['peripheral_flash','arrow_reaction','number_scatter'];
  document.getElementById('progress-filter').innerHTML=exIds.map(id=>{
    const ex=EXERCISES.find(e=>e.id===id);
    return `<button class="ex-filter-btn${progressFilter===id?' active':''}" onclick="setProgressFilter('${id}')">${ex.icon} ${ex.name}</button>`;
  }).join('');
  const history=Auth.getHistory();
  _renderScoreChart(history); _renderAccChart(history); _renderDailyChart(history);
}
function setProgressFilter(id){ progressFilter=id; renderProgress(); }

function _svgWrap(content,w,h){ return `<svg class="chart-svg" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${content}</svg>`; }

function _renderScoreChart(history){
  const wrap=document.getElementById('chart-scores');
  const data=history.filter(s=>s.exercise===progressFilter).slice(0,30).reverse();
  if(data.length<2){ wrap.innerHTML='<div class="chart-empty">Play at least 2 sessions to see score trend.</div>'; return; }
  const W=wrap.offsetWidth||600,H=180,pad={t:20,r:20,b:40,l:45};
  const scores=data.map(s=>s.score);
  const maxS=Math.max(...scores),minS=Math.max(0,Math.min(...scores)-5);
  const sx=i=>pad.l+i*(W-pad.l-pad.r)/(data.length-1);
  const sy=v=>pad.t+(1-(v-minS)/(maxS-minS+1))*(H-pad.t-pad.b);
  const pts=data.map((d,i)=>`${sx(i)},${sy(d.score)}`).join(' ');
  const area=`${sx(0)},${H-pad.b} ${pts} ${sx(data.length-1)},${H-pad.b}`;
  const grids=[0,0.25,0.5,0.75,1].map(t=>{
    const v=Math.round(minS+t*(maxS-minS)); const y=sy(v);
    return `<line x1="${pad.l}" y1="${y}" x2="${W-pad.r}" y2="${y}" stroke="var(--border)" stroke-dasharray="4 4" opacity="0.5"/>
            <text x="${pad.l-6}" y="${y+4}" text-anchor="end" font-size="10" fill="var(--text-muted)">${v}</text>`;
  }).join('');
  const labels=data.map((d,i)=>{
    if(i%Math.ceil(data.length/6)!==0&&i!==data.length-1) return '';
    const dt=new Date(d.ts);
    return `<text x="${sx(i)}" y="${H-8}" text-anchor="middle" font-size="10" fill="var(--text-muted)">${dt.getDate()}/${dt.getMonth()+1}</text>`;
  }).join('');
  const dots=data.map((d,i)=>`<circle cx="${sx(i)}" cy="${sy(d.score)}" r="4" fill="${d.passed?'var(--accent)':'var(--warn)'}"><title>L${d.level} Score:${d.score} ${d.passed?'Pass':'Fail'}</title></circle>`).join('');
  wrap.innerHTML=_svgWrap(`<defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#00e676" stop-opacity="0.35"/><stop offset="100%" stop-color="#00e676" stop-opacity="0"/></linearGradient></defs>
    ${grids}<polyline points="${area}" fill="url(#sg)"/>
    <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2"/>
    ${dots}${labels}
    <line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${H-pad.b}" stroke="var(--border)"/>
    <line x1="${pad.l}" y1="${H-pad.b}" x2="${W-pad.r}" y2="${H-pad.b}" stroke="var(--border)"/>`,W,H);
}

function _renderAccChart(history){
  const wrap=document.getElementById('chart-accuracy');
  const data=history.filter(s=>s.exercise===progressFilter&&s.accuracy!=null).slice(0,30).reverse();
  if(data.length<2){ wrap.innerHTML='<div class="chart-empty">Play more sessions to see accuracy trend.</div>'; return; }
  const W=wrap.offsetWidth||600,H=160,pad={t:20,r:20,b:35,l:40};
  const sx=i=>pad.l+i*(W-pad.l-pad.r)/(data.length-1);
  const sy=v=>pad.t+(1-v/100)*(H-pad.t-pad.b);
  const pts=data.map((d,i)=>`${sx(i)},${sy(d.accuracy)}`).join(' ');
  const area=`${sx(0)},${H-pad.b} ${pts} ${sx(data.length-1)},${H-pad.b}`;
  const labels=[0,50,90].map(v=>{
    const y=sy(v);
    return `<line x1="${pad.l}" y1="${y}" x2="${W-pad.r}" y2="${y}" stroke="var(--border)" stroke-dasharray="4 4" opacity="0.4"/>
            <text x="${pad.l-6}" y="${y+4}" text-anchor="end" font-size="10" fill="var(--text-muted)">${v}%</text>`;
  }).join('');
  wrap.innerHTML=_svgWrap(`<defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4fc3f7" stop-opacity="0.3"/><stop offset="100%" stop-color="#4fc3f7" stop-opacity="0"/></linearGradient></defs>
    ${labels}<polyline points="${area}" fill="url(#ag)"/>
    <polyline points="${pts}" fill="none" stroke="#4fc3f7" stroke-width="2"/>
    ${data.map((d,i)=>`<circle cx="${sx(i)}" cy="${sy(d.accuracy)}" r="4" fill="${d.passed?'#4fc3f7':'var(--warn)'}"><title>${d.accuracy}%</title></circle>`).join('')}
    <line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${H-pad.b}" stroke="var(--border)"/>
    <line x1="${pad.l}" y1="${H-pad.b}" x2="${W-pad.r}" y2="${H-pad.b}" stroke="var(--border)"/>`,W,H);
}

function _renderDailyChart(history){
  const wrap=document.getElementById('chart-daily');
  const W=wrap.offsetWidth||700,H=160,pad={t:20,r:20,b:35,l:40};
  const days=[];
  for(let i=13;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    const key=d.toDateString();
    const secs=history.filter(s=>new Date(s.ts).toDateString()===key).reduce((sum,s)=>sum+(s.duration||0),0);
    days.push({label:`${d.getDate()}/${d.getMonth()+1}`,mins:Math.min(10,secs/60)});
  }
  const bw=(W-pad.l-pad.r)/days.length-4;
  const bars=days.map((d,i)=>{
    const x=pad.l+i*((W-pad.l-pad.r)/days.length);
    const bh=(d.mins/10)*(H-pad.t-pad.b); const y=H-pad.b-bh;
    return `<rect x="${x+2}" y="${y}" width="${bw}" height="${Math.max(2,bh)}" rx="3"
      fill="${d.mins>=10?'var(--accent)':'var(--accent)66'}" opacity="${d.mins>0?0.9:0.15}">
      <title>${d.label}: ${d.mins.toFixed(1)}min</title></rect>
      <text x="${x+bw/2+2}" y="${H-8}" text-anchor="middle" font-size="9" fill="var(--text-muted)">${i%3===0?d.label:''}</text>`;
  }).join('');
  wrap.innerHTML=_svgWrap(`<line x1="${pad.l}" y1="${pad.t}" x2="${W-pad.r}" y2="${pad.t}" stroke="var(--border)" stroke-dasharray="4 4" opacity="0.4"/>
    <text x="${pad.l-6}" y="${pad.t+4}" text-anchor="end" font-size="10" fill="var(--text-muted)">10m</text>
    <text x="${pad.l-6}" y="${H-pad.b+4}" text-anchor="end" font-size="10" fill="var(--text-muted)">0</text>
    ${bars}
    <line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${H-pad.b}" stroke="var(--border)"/>
    <line x1="${pad.l}" y1="${H-pad.b}" x2="${W-pad.r}" y2="${H-pad.b}" stroke="var(--border)"/>`,W,H);
}

// ─── SETTINGS PAGE ────────────────────────────────────────────────
function renderSettings(){
  const u=Auth.currentUser(); if(!u) return;
  document.getElementById('set-username').textContent=u.username;
  document.getElementById('set-sessions').textContent=u.sessions.length;
  document.getElementById('set-since').textContent=new Date(u.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
  const exIds=['peripheral_flash','arrow_reaction','number_scatter'];
  document.getElementById('set-levels').innerHTML=exIds.map(id=>{
    const ex=EXERCISES.find(e=>e.id===id);
    const lvl=Auth.getUserLevel(id);
    const consec=Auth.getConsecutive(id);
    const cfg=getLevel(id,lvl);
    return `<div class="settings-row">
      <label>${ex.icon} ${ex.name}</label>
      <span class="val" style="color:${levelColour(lvl)}">Level ${lvl} · ${consec}/3 passes</span>
    </div>`;
  }).join('');
  const maxAcc=Auth.getMaxAccessible();
  document.getElementById('set-max-level').textContent=`Level ${maxAcc} (Stage ${levelStage(maxAcc)})`;
}

// ─── ADMIN PAGE ───────────────────────────────────────────────────
function renderAdmin(){
  const users=Auth.getAllUsers();
  const tbody=document.getElementById('admin-tbody');
  const today=new Date().toDateString();

  tbody.innerHTML=users.map(u=>{
    const todaySecs=u.sessions.filter(s=>new Date(s.ts).toDateString()===today).reduce((sum,s)=>sum+(s.duration||0),0);
    const totalSecs=u.sessions.reduce((sum,s)=>sum+(s.duration||0),0);
    const lastSess=u.sessions.length?new Date(u.sessions[0].ts).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'}):'—';
    const pfLvl=u.levels.peripheral_flash||1, arLvl=u.levels.arrow_reaction||1, nsLvl=u.levels.number_scatter||1;
    const maxAcc=maxAccessibleLevel(u.levels);
    return `<tr>
      <td><strong>${u.username}</strong></td>
      <td>${u.sessions.length}</td>
      <td>${Math.floor(todaySecs/60)}m ${todaySecs%60}s</td>
      <td>${Math.round(totalSecs/60)}m total</td>
      <td>${lastSess}</td>
      <td>
        <span style="color:${levelColour(pfLvl)}">PF:${pfLvl}</span> ·
        <span style="color:${levelColour(arLvl)}">AR:${arLvl}</span> ·
        <span style="color:${levelColour(nsLvl)}">NS:${nsLvl}</span>
      </td>
      <td style="color:var(--gold)">Stage ${levelStage(maxAcc)}</td>
    </tr>`;
  }).join('');

  document.getElementById('admin-user-count').textContent=users.length;
  const todayActive=users.filter(u=>u.sessions.some(s=>new Date(s.ts).toDateString()===today)).length;
  document.getElementById('admin-today-active').textContent=todayActive;
  const totalMin=Math.round(users.reduce((sum,u)=>sum+u.sessions.reduce((s2,s)=>s2+(s.duration||0),0),0)/60);
  document.getElementById('admin-total-mins').textContent=totalMin+'m';
}

// ─── AUTH SETUP ───────────────────────────────────────────────────
function setupAuth(){
  let mode='login';
  const errEl=document.getElementById('login-error');
  const titleEl=document.getElementById('login-title');
  const submitEl=document.getElementById('login-submit');
  const toggleEl=document.getElementById('login-toggle-text');

  function rebind(){
    const lnk=document.getElementById('login-toggle-link');
    if(!lnk) return;
    lnk.onclick=()=>{
      mode=mode==='login'?'register':'login';
      titleEl.textContent=mode==='register'?'Create Account':'Sign In';
      submitEl.textContent=mode==='register'?'Create Account':'Sign In';
      toggleEl.innerHTML=mode==='register'
        ?'Already have an account? <a id="login-toggle-link">Sign in</a>'
        :'New here? <a id="login-toggle-link">Create an account</a>';
      errEl.classList.remove('show'); rebind();
    };
  }
  rebind();

  document.getElementById('login-form-el').addEventListener('submit',e=>{
    e.preventDefault();
    const u=document.getElementById('login-username').value;
    const p=document.getElementById('login-password').value;
    errEl.classList.remove('show');
    const res=mode==='login'?Auth.login(u,p):Auth.register(u,p);
    if(!res.ok){ errEl.textContent=res.msg; errEl.classList.add('show'); }
    else onLogin();
  });
}

function onLogin(){
  const user=Auth.currentUser();
  document.getElementById('nav-username').textContent=user.username;
  showPage('dashboard'); renderDashboard(); Timer.reset();
}

function setupNav(){
  document.getElementById('nav-logo-link').onclick=()=>{ if(Auth.currentKey()) goToDashboard(); };
  document.getElementById('nav-logout').onclick=()=>{
    Timer.reset();
    if(currentGame){currentGame.cleanup();currentGame=null;}
    Auth.logout(); showPage('login');
  };
  document.getElementById('nav-pause-btn').onclick=()=>Timer.toggle();
  document.querySelectorAll('.nav-link').forEach(l=>{
    l.onclick=()=>{
      const pg=l.dataset.page;
      if(pg==='dashboard') goToDashboard();
      else if(pg==='progress'){ showPage('progress'); renderProgress(); }
      else if(pg==='settings'){ showPage('settings'); renderSettings(); }
    };
  });
}

// ── Admin route — check URL hash ──────────────────────────────────
function checkAdminRoute(){
  if(window.location.hash==='#admin'){
    if(Auth.currentKey()===ADMIN_USER.toLowerCase()){
      showPage('admin'); renderAdmin(); return true;
    }
  }
  return false;
}

document.addEventListener('DOMContentLoaded',()=>{
  setupAuth();
  setupNav();
  document.getElementById('session-over-close').onclick=()=>{
    document.getElementById('session-over').classList.remove('show'); goToDashboard();
  };
  document.getElementById('paused-resume-btn').onclick=()=>Timer.resume();
  document.getElementById('set-reset-btn').onclick=()=>{
    if(confirm('Reset ALL your training data? This cannot be undone.')){
      Auth.resetData(); renderSettings(); renderDashboard();
    }
  };
  document.getElementById('admin-refresh').onclick=renderAdmin;

  Timer.render();
  if(Auth.currentKey()&&Auth.currentUser()){
    if(!checkAdminRoute()) onLogin();
  } else {
    showPage('login');
  }

  // Watch for hash change (navigate to #admin)
  window.addEventListener('hashchange',()=>{
    if(!checkAdminRoute()&&Auth.currentKey()) goToDashboard();
  });
});
