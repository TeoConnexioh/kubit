/* ============================================================
   데모 3 — 강화학습: 그리드월드 Q-러닝
   에이전트가 시행착오로 목표(★)를 찾고 함정(✕)을 피하는 법을 배운다.
   ============================================================ */
(function () {
  "use strict";
  const canvas = document.getElementById("rlCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const COLS = 6, ROWS = 6;
  const START = { c: 0, r: ROWS - 1 };
  const GOAL = { c: COLS - 1, r: 0 };
  const PITS = [ { c: 2, r: 1 }, { c: 3, r: 3 }, { c: 1, r: 2 }, { c: 4, r: 4 } ];
  const WALLS = [ { c: 2, r: 2 }, { c: 3, r: 2 } ];

  // 행동: 0=상 1=하 2=좌 3=우
  const DIRS = [ { dc: 0, dr: -1 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }, { dc: 1, dr: 0 } ];
  const ALPHA = 0.4, GAMMA = 0.92;

  const S = {
    Q: null,
    agent: { c: START.c, r: START.r },
    episode: 0, stepCount: 0, epStep: 0,
    epsilon: 0.9,
    lastReward: null,
    successes: 0, attempts: 0,
    running: false, showArrows: true,
  };

  const key = (c, r) => r * COLS + c;
  const isPit = (c, r) => PITS.some((p) => p.c === c && p.r === r);
  const isWall = (c, r) => WALLS.some((p) => p.c === c && p.r === r);
  const isGoal = (c, r) => GOAL.c === c && GOAL.r === r;

  function initQ() {
    S.Q = [];
    for (let i = 0; i < COLS * ROWS; i++) S.Q.push([0, 0, 0, 0]);
  }

  function reset() {
    initQ();
    S.agent = { c: START.c, r: START.r };
    S.episode = 0; S.stepCount = 0; S.epStep = 0;
    S.epsilon = 0.9; S.lastReward = null;
    S.successes = 0; S.attempts = 0;
    updateReadout();
  }

  function bestAction(c, r) {
    const q = S.Q[key(c, r)];
    let bi = 0;
    for (let i = 1; i < 4; i++) if (q[i] > q[bi]) bi = i;
    return bi;
  }

  function chooseAction(c, r) {
    if (Math.random() < S.epsilon) return Math.floor(Math.random() * 4);
    return bestAction(c, r);
  }

  // 한 스텝 진행 (애니메이션용). 에피소드 종료 시 true 반환
  function step() {
    const { c, r } = S.agent;
    const a = chooseAction(c, r);
    let nc = c + DIRS[a].dc, nr = r + DIRS[a].dr;
    // 벽 밖 또는 장애물이면 제자리
    if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS || isWall(nc, nr)) { nc = c; nr = r; }

    let reward = -0.03, terminal = false;
    if (isGoal(nc, nr)) { reward = 1; terminal = true; }
    else if (isPit(nc, nr)) { reward = -1; terminal = true; }

    // Q 갱신
    const q = S.Q[key(c, r)];
    const nq = S.Q[key(nc, nr)];
    const future = terminal ? 0 : Math.max(nq[0], nq[1], nq[2], nq[3]);
    q[a] += ALPHA * (reward + GAMMA * future - q[a]);

    S.agent = { c: nc, r: nr };
    S.stepCount++; S.epStep++;

    if (terminal || S.epStep > 80) {
      S.attempts++;
      if (terminal && reward === 1) S.successes++;
      S.lastReward = terminal ? reward : 0;
      S.episode++;
      S.epsilon = Math.max(0.05, S.epsilon * 0.96); // 점차 탐험 줄이기
      S.agent = { c: START.c, r: START.r };
      S.epStep = 0;
      updateReadout();
      return true;
    }
    return false;
  }

  function runEpisodeInstant() {
    let done = false, guard = 0;
    while (!done && guard++ < 200) done = step();
    updateReadout();
  }

  // --- 판독 ---
  const setK = (k, v) => { const el = document.querySelector(`#demo-rl [data-k="${k}"]`); if (el) el.textContent = v; };
  function updateReadout() {
    setK("episode", S.episode);
    setK("reward", S.lastReward === null ? "—" : (S.lastReward > 0 ? "+" + S.lastReward.toFixed(2) : S.lastReward.toFixed(2)));
    setK("steps", S.stepCount);
    const rate = S.attempts ? Math.round((S.successes / S.attempts) * 100) : 0;
    setK("success", rate + "%");
    const rEl = document.querySelector('#demo-rl [data-k="reward"]');
    if (rEl) rEl.style.color = S.lastReward > 0 ? "var(--good)" : (S.lastReward < 0 ? "var(--bad)" : "var(--ink-mute)");
  }

  // --- 그리기 ---
  let W = 0, H = 0, cell = 0, ox = 0, oy = 0, GAP = 5;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const size = Math.min(W, H) - 40;
    cell = (size - GAP * (COLS - 1)) / COLS;
    ox = (W - size) / 2; oy = (H - size) / 2;
  }

  function valueColor(v) {
    // v: 대략 -1 ~ 1
    if (v >= 0) {
      const t = Math.min(v / 1, 1);
      const rr = Math.round(20 + t * (242 - 20));
      const gg = Math.round(24 + t * (181 - 24));
      const bb = Math.round(36 + t * (68 - 36));
      return `rgb(${rr},${gg},${bb})`;
    } else {
      const t = Math.min(-v / 1, 1);
      const rr = Math.round(20 + t * (140 - 20));
      const gg = Math.round(24 - t * 6);
      const bb = Math.round(36 - t * 6);
      return `rgb(${Math.max(0,rr)},${Math.max(0,gg)},${Math.max(0,bb)})`;
    }
  }

  function cellRect(c, r) { return { x: ox + c * (cell + GAP), y: oy + r * (cell + GAP) }; }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const { x, y } = cellRect(c, r);
        let fill;
        if (isWall(c, r)) fill = "#05070b";
        else {
          const q = S.Q[key(c, r)];
          const v = Math.max(q[0], q[1], q[2], q[3]);
          fill = valueColor(v);
        }
        ctx.fillStyle = fill;
        roundRect(x, y, cell, cell, 6); ctx.fill();

        if (isGoal(c, r)) { emoji("★", x, y, "#f2b544"); }
        else if (isPit(c, r)) { emoji("✕", x, y, "#ec6a6a"); }
        else if (c === START.c && r === START.r) {
          ctx.fillStyle = "rgba(236,231,219,0.35)"; ctx.font = "400 11px 'IBM Plex Sans KR'"; ctx.textAlign = "center";
          ctx.fillText("출발", x + cell / 2, y + cell - 8);
        }

        // 방향 화살표
        if (S.showArrows && !isWall(c, r) && !isGoal(c, r) && !isPit(c, r)) {
          const q = S.Q[key(c, r)];
          const maxv = Math.max(q[0], q[1], q[2], q[3]);
          if (maxv > 0.01) drawArrow(x + cell / 2, y + cell / 2, bestAction(c, r), maxv);
        }
      }
    }

    // 에이전트
    const a = cellRect(S.agent.c, S.agent.r);
    ctx.beginPath();
    ctx.arc(a.x + cell / 2, a.y + cell / 2, cell * 0.26, 0, Math.PI * 2);
    ctx.fillStyle = "#55d6c4";
    ctx.shadowBlur = 18; ctx.shadowColor = "rgba(85,214,196,0.8)"; ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = "#0a0c12"; ctx.lineWidth = 2; ctx.stroke();

    requestAnimationFrame(draw);
  }

  function roundRect(x, y, w, h, rad) {
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }
  function emoji(ch, x, y, color) {
    ctx.fillStyle = color; ctx.font = "700 " + Math.round(cell * 0.44) + "px 'Gowun Batang', serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(ch, x + cell / 2, y + cell / 2);
    ctx.textBaseline = "alphabetic";
  }
  function drawArrow(cx, cy, dir, strength) {
    const len = cell * 0.22;
    const d = DIRS[dir];
    const ex = cx + d.dc * len, ey = cy + d.dr * len;
    const alpha = 0.3 + Math.min(strength, 1) * 0.6;
    ctx.strokeStyle = `rgba(236,231,219,${alpha})`; ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - d.dc * len, cy - d.dr * len); ctx.lineTo(ex, ey); ctx.stroke();
    // 화살촉
    const ang = Math.atan2(d.dr, d.dc);
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - 6 * Math.cos(ang - 0.4), ey - 6 * Math.sin(ang - 0.4));
    ctx.lineTo(ex - 6 * Math.cos(ang + 0.4), ey - 6 * Math.sin(ang + 0.4));
    ctx.closePath(); ctx.fill();
  }

  // --- 버튼 ---
  document.getElementById("rlEpisode").addEventListener("click", () => {
    // 애니메이션으로 한 에피소드
    if (S.running) return;
    const iv = setInterval(() => { if (step()) clearInterval(iv); }, 55);
  });

  let autoTimer = null;
  const autoBtn = document.getElementById("rlAuto");
  autoBtn.addEventListener("click", () => {
    if (autoTimer) { stopAuto(); return; }
    S.running = true;
    autoBtn.textContent = "정지 ■"; autoBtn.classList.add("running");
    // 애니메이션 속도로 여러 스텝. 학습이 진행되면 빨라짐.
    autoTimer = setInterval(() => {
      const speed = S.episode < 12 ? 1 : (S.episode < 40 ? 3 : 8);
      for (let i = 0; i < speed; i++) step();
      if (S.episode > 120) stopAuto();
    }, 40);
  });
  function stopAuto() {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = null; S.running = false;
    autoBtn.textContent = "자동 학습 ▶"; autoBtn.classList.remove("running");
  }

  document.getElementById("rlReset").addEventListener("click", () => { stopAuto(); reset(); });
  document.getElementById("rlArrows").addEventListener("change", (e) => { S.showArrows = e.target.checked; });

  window.addEventListener("resize", resize);
  resize(); reset(); draw();
})();
