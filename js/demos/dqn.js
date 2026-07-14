/* ============================================================
   데모 4-보너스 — 같은 미로를 '신경망'으로 풀기
   표(Q-테이블) 대신 작은 신경망이 두뇌.
   입력: 현재 위치(행,열) → 출력: 상·하·좌·우 각 방향의 '선호 점수'.
   학습은 경사하강(역전파). 좋은 방향은 가치반복으로 미리 구해 정답으로 사용.
   ============================================================ */
(function () {
  "use strict";
  const mazeCanvas = document.getElementById("dqnMaze");
  const netCanvas = document.getElementById("dqnNetCanvas");
  if (!mazeCanvas || !netCanvas) return;
  const mctx = mazeCanvas.getContext("2d");
  const nctx = netCanvas.getContext("2d");

  // --- 미로 (RL 데모와 동일) ---
  const COLS = 6, ROWS = 6;
  const GOAL = { c: 5, r: 0 };
  const PITS = [{ c: 2, r: 1 }, { c: 3, r: 3 }, { c: 1, r: 2 }, { c: 4, r: 4 }];
  const WALLS = [{ c: 2, r: 2 }, { c: 3, r: 2 }];
  const DIRS = [{ dc: 0, dr: -1 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }, { dc: 1, dr: 0 }]; // 상하좌우
  const ARROW = ["↑", "↓", "←", "→"];
  const GAMMA = 0.92, STEP_R = -0.03;

  const isPit = (c, r) => PITS.some((p) => p.c === c && p.r === r);
  const isWall = (c, r) => WALLS.some((p) => p.c === c && p.r === r);
  const isGoal = (c, r) => GOAL.c === c && GOAL.r === r;
  const isTerminal = (c, r) => isGoal(c, r) || isPit(c, r);

  // --- 가치반복으로 '가장 좋은 방향' 계산 (학습 정답) ---
  const trainCells = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++)
    if (!isWall(c, r) && !isTerminal(c, r)) trainCells.push({ c, r });

  function qOf(c, r, a, V) {
    let nc = c + DIRS[a].dc, nr = r + DIRS[a].dr;
    if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS || isWall(nc, nr)) { nc = c; nr = r; }
    if (isGoal(nc, nr)) return 1;
    if (isPit(nc, nr)) return -1;
    return STEP_R + GAMMA * V[nr * COLS + nc];
  }
  const Vstar = new Array(COLS * ROWS).fill(0);
  for (let it = 0; it < 300; it++) for (const { c, r } of trainCells) {
    let best = -Infinity;
    for (let a = 0; a < 4; a++) best = Math.max(best, qOf(c, r, a, Vstar));
    Vstar[r * COLS + c] = best;
  }
  const optimalA = {};
  for (const { c, r } of trainCells) {
    const q = [0, 1, 2, 3].map((a) => qOf(c, r, a, Vstar));
    optimalA[r * COLS + c] = q.indexOf(Math.max(...q));
  }

  const inp = (c, r) => [(c / (COLS - 1)) * 2 - 1, (r / (ROWS - 1)) * 2 - 1];
  const X = trainCells.map(({ c, r }) => inp(c, r));
  const T = trainCells.map(({ c, r }) => optimalA[r * COLS + c]); // 정답 방향 인덱스

  // --- 소형 MLP (2 → 24 → 24 → 4), ReLU 은닉 · 소프트맥스 출력 ---
  const SIZES = [2, 24, 24, 4];
  let net;
  function initNet() {
    net = { W: [], B: [], sizes: SIZES };
    for (let l = 0; l < SIZES.length - 1; l++) {
      const out = SIZES[l + 1], ins = SIZES[l], scale = Math.sqrt(2 / ins), w = [];
      for (let o = 0; o < out; o++) {
        const row = [];
        for (let i = 0; i < ins; i++) row.push((Math.random() * 2 - 1) * scale);
        w.push(row);
      }
      net.W.push(w); net.B.push(new Array(out).fill(0));
    }
  }
  function forward(x) {
    const a = [x.slice()], z = [];
    for (let l = 0; l < net.W.length; l++) {
      const out = net.W[l].length, zl = new Array(out), al = new Array(out), prev = a[l];
      for (let o = 0; o < out; o++) {
        let s = net.B[l][o]; const row = net.W[l][o];
        for (let i = 0; i < row.length; i++) s += row[i] * prev[i];
        zl[o] = s; al[o] = (l < net.W.length - 1) ? Math.max(0, s) : s;
      }
      z.push(zl); a.push(al);
    }
    return { a, z };
  }
  function softmax(v) {
    const m = Math.max(...v), e = v.map((x) => Math.exp(x - m));
    const s = e.reduce((a, b) => a + b, 0);
    return e.map((x) => x / s);
  }
  const policy = (c, r) => softmax(forward(inp(c, r)).a[net.W.length]); // 방향별 선호 확률

  function trainEpoch(lr) {
    const gW = net.W.map((w) => w.map((r) => r.map(() => 0)));
    const gB = net.B.map((b) => b.map(() => 0));
    let loss = 0;
    for (let n = 0; n < X.length; n++) {
      const { a, z } = forward(X[n]);
      const L = net.W.length, sm = softmax(a[L]), t = T[n];
      loss += -Math.log(sm[t] + 1e-9);
      let delta = sm.map((p, k) => p - (k === t ? 1 : 0)); // 소프트맥스+교차엔트로피 기울기
      for (let l = L - 1; l >= 0; l--) {
        const prev = a[l];
        for (let o = 0; o < net.W[l].length; o++) {
          gB[l][o] += delta[o];
          for (let i = 0; i < prev.length; i++) gW[l][o][i] += delta[o] * prev[i];
        }
        if (l > 0) {
          const nd = new Array(net.sizes[l]).fill(0);
          for (let i = 0; i < net.sizes[l]; i++) {
            let s = 0;
            for (let o = 0; o < net.W[l].length; o++) s += net.W[l][o][i] * delta[o];
            nd[i] = z[l - 1][i] > 0 ? s : 0;
          }
          delta = nd;
        }
      }
    }
    const N = X.length;
    for (let l = 0; l < net.W.length; l++)
      for (let o = 0; o < net.W[l].length; o++) {
        net.B[l][o] -= lr * gB[l][o] / N;
        for (let i = 0; i < net.W[l][o].length; i++) net.W[l][o][i] -= lr * gW[l][o][i] / N;
      }
    return loss / N;
  }

  // --- 상태 ---
  const S = { epoch: 0, loss: 0, lossHist: [], sel: { c: 0, r: ROWS - 1 } };
  function reset() { initNet(); S.epoch = 0; S.loss = 0; S.lossHist = []; updateReadout(); }

  const setK = (k, v) => { const el = document.querySelector(`#demo-dqn [data-k="${k}"]`); if (el) el.textContent = v; };
  function accuracy() {
    let ok = 0;
    for (const { c, r } of trainCells) {
      const p = policy(c, r);
      if (p.indexOf(Math.max(...p)) === optimalA[r * COLS + c]) ok++;
    }
    return ok / trainCells.length;
  }
  function updateReadout() {
    setK("epoch", S.epoch);
    setK("loss", S.loss.toFixed(3));
    setK("acc", Math.round(accuracy() * 100) + "%");
  }

  // --- 미로 그리기 ---
  let MW = 0, MH = 0, cell = 0, ox = 0, oy = 0; const GAP = 5;
  function resizeMaze() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = mazeCanvas.getBoundingClientRect();
    MW = r.width; MH = r.height;
    mazeCanvas.width = MW * dpr; mazeCanvas.height = MH * dpr; mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const size = Math.min(MW, MH) - 20;
    cell = (size - GAP * (COLS - 1)) / COLS;
    ox = (MW - size) / 2; oy = (MH - size) / 2;
  }
  function probColor(p) {
    const t = Math.max(0, (p - 0.25) / 0.75); // 0.25(무지)~1(확신)
    return `rgb(${Math.round(20 + t * 70)},${Math.round(24 + t * 176)},${Math.round(36 + t * 114)})`;
  }
  function cellXY(c, r) { return { x: ox + c * (cell + GAP), y: oy + r * (cell + GAP) }; }
  function roundRect(ctx, x, y, w, h, rad) {
    ctx.beginPath(); ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad); ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad); ctx.arcTo(x, y, x + w, y, rad); ctx.closePath();
  }
  function drawMaze() {
    mctx.clearRect(0, 0, MW, MH);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const { x, y } = cellXY(c, r);
      let fill = "#141824", best = -1;
      if (isWall(c, r)) fill = "#05070b";
      else if (!isTerminal(c, r)) { const p = policy(c, r); best = p.indexOf(Math.max(...p)); fill = probColor(Math.max(...p)); }
      mctx.fillStyle = fill; roundRect(mctx, x, y, cell, cell, 6); mctx.fill();
      if (S.sel.c === c && S.sel.r === r) { mctx.lineWidth = 2.5; mctx.strokeStyle = "#55d6c4"; mctx.stroke(); }

      mctx.textAlign = "center"; mctx.textBaseline = "middle";
      if (isGoal(c, r)) { mctx.fillStyle = "#f2b544"; mctx.font = `700 ${cell * 0.44}px 'Gowun Batang'`; mctx.fillText("★", x + cell / 2, y + cell / 2); }
      else if (isPit(c, r)) { mctx.fillStyle = "#ec6a6a"; mctx.font = `700 ${cell * 0.4}px 'Gowun Batang'`; mctx.fillText("✕", x + cell / 2, y + cell / 2); }
      else if (!isWall(c, r)) { mctx.fillStyle = "rgba(246,242,232,0.85)"; mctx.font = `${cell * 0.4}px 'IBM Plex Sans KR'`; mctx.fillText(ARROW[best], x + cell / 2, y + cell / 2 + 1); }
      mctx.textBaseline = "alphabetic";
    }
  }

  // --- 신경망 그리기 ---
  const VIS = [2, 5, 5, 4];
  let NW = 0, NH = 0, pos = [];
  function resizeNet() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = netCanvas.getBoundingClientRect();
    NW = r.width; NH = r.height;
    netCanvas.width = NW * dpr; netCanvas.height = NH * dpr; nctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pos = VIS.map((n, li) => {
      const x = 46 + (NW - 132) * (li / (VIS.length - 1));
      const arr = [];
      for (let i = 0; i < n; i++) arr.push({ x, y: 34 + (NH - 62) * ((i + 0.5) / n) });
      return arr;
    });
  }
  function drawNet() {
    nctx.clearRect(0, 0, NW, NH);
    for (let li = 0; li < VIS.length - 1; li++)
      for (const a of pos[li]) for (const b of pos[li + 1]) {
        nctx.beginPath(); nctx.moveTo(a.x, a.y); nctx.lineTo(b.x, b.y);
        nctx.strokeStyle = "rgba(226,232,255,0.07)"; nctx.lineWidth = 1; nctx.stroke();
      }
    const p = policy(S.sel.c, S.sel.r);
    for (let li = 1; li < VIS.length - 1; li++)
      for (const nd of pos[li]) {
        nctx.beginPath(); nctx.arc(nd.x, nd.y, 6, 0, Math.PI * 2);
        nctx.fillStyle = "rgba(111,220,160,0.18)"; nctx.fill();
        nctx.strokeStyle = "rgba(111,220,160,0.8)"; nctx.lineWidth = 1.4; nctx.stroke();
      }
    const inLabels = ["열", "행"];
    pos[0].forEach((nd, i) => {
      nctx.beginPath(); nctx.arc(nd.x, nd.y, 8, 0, Math.PI * 2);
      nctx.fillStyle = "rgba(85,214,196,0.2)"; nctx.fill();
      nctx.strokeStyle = "#55d6c4"; nctx.lineWidth = 1.6; nctx.stroke();
      nctx.fillStyle = "#8b8a82"; nctx.font = "11px 'IBM Plex Sans KR'"; nctx.textAlign = "right"; nctx.textBaseline = "middle";
      nctx.fillText(inLabels[i], nd.x - 13, nd.y);
    });
    const best = p.indexOf(Math.max(...p));
    pos[VIS.length - 1].forEach((nd, i) => {
      const isBest = i === best;
      nctx.beginPath(); nctx.arc(nd.x, nd.y, 11, 0, Math.PI * 2);
      nctx.fillStyle = isBest ? "rgba(242,181,68,0.35)" : "rgba(242,181,68,0.1)";
      if (isBest) { nctx.shadowBlur = 14; nctx.shadowColor = "rgba(242,181,68,0.8)"; }
      nctx.fill(); nctx.shadowBlur = 0;
      nctx.strokeStyle = "#f2b544"; nctx.lineWidth = 1.6; nctx.stroke();
      nctx.fillStyle = isBest ? "#f6f2e8" : "#b7b3a8"; nctx.font = "600 13px 'IBM Plex Sans KR'"; nctx.textAlign = "center"; nctx.textBaseline = "middle";
      nctx.fillText(ARROW[i], nd.x, nd.y);
      nctx.fillStyle = isBest ? "#f2b544" : "#7c7a72"; nctx.font = "10px 'IBM Plex Mono'"; nctx.textAlign = "left";
      nctx.fillText(Math.round(p[i] * 100) + "%", nd.x + 16, nd.y);
    });
    nctx.textBaseline = "alphabetic";
    nctx.fillStyle = "#7c7a72"; nctx.font = "10px 'IBM Plex Mono'"; nctx.textAlign = "center";
    nctx.fillText("입력·위치", pos[0][0].x, 16);
    nctx.fillText("출력·방향 선호", pos[VIS.length - 1][0].x, 16);
  }

  // --- 손실 곡선 ---
  const lossCanvas = document.getElementById("dqnLoss");
  const lctx = lossCanvas && lossCanvas.getContext("2d");
  function drawLoss() {
    if (!lctx) return;
    const r = lossCanvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (lossCanvas.width !== Math.round(r.width * dpr)) { lossCanvas.width = r.width * dpr; lossCanvas.height = r.height * dpr; lctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    const w = r.width, h = r.height;
    lctx.clearRect(0, 0, w, h);
    if (S.lossHist.length < 2) return;
    const maxL = Math.max(...S.lossHist, 0.05), pad = 6;
    lctx.beginPath();
    S.lossHist.forEach((v, i) => {
      const x = pad + (i / (S.lossHist.length - 1)) * (w - pad * 2);
      const y = h - pad - (v / maxL) * (h - pad * 2);
      i === 0 ? lctx.moveTo(x, y) : lctx.lineTo(x, y);
    });
    lctx.strokeStyle = "#f2b544"; lctx.lineWidth = 2; lctx.stroke();
    lctx.lineTo(w - pad, h - pad); lctx.lineTo(pad, h - pad); lctx.closePath();
    lctx.fillStyle = "rgba(242,181,68,0.12)"; lctx.fill();
  }

  function raf() { drawMaze(); drawNet(); drawLoss(); requestAnimationFrame(raf); }

  // --- 학습 ---
  let timer = null;
  const trainBtn = document.getElementById("dqnTrain");
  function stopTrain() { if (timer) clearInterval(timer); timer = null; trainBtn.textContent = "경사하강 학습 ▶"; trainBtn.classList.remove("running"); }
  trainBtn.addEventListener("click", () => {
    if (timer) { stopTrain(); return; }
    trainBtn.textContent = "정지 ■"; trainBtn.classList.add("running");
    timer = setInterval(() => {
      for (let i = 0; i < 20; i++) S.loss = trainEpoch(0.15);
      S.epoch += 20;
      S.lossHist.push(S.loss); if (S.lossHist.length > 220) S.lossHist.shift();
      updateReadout();
      if (S.epoch > 6000 || accuracy() === 1) { setTimeout(stopTrain, 300); }
    }, 40);
  });
  document.getElementById("dqnReset").addEventListener("click", () => { stopTrain(); reset(); });

  mazeCanvas.addEventListener("click", (e) => {
    const r = mazeCanvas.getBoundingClientRect();
    const cx = e.clientX - r.left, cy = e.clientY - r.top;
    for (let rr = 0; rr < ROWS; rr++) for (let cc = 0; cc < COLS; cc++) {
      const { x, y } = cellXY(cc, rr);
      if (cx >= x && cx <= x + cell && cy >= y && cy <= y + cell && !isWall(cc, rr) && !isTerminal(cc, rr)) S.sel = { c: cc, r: rr };
    }
  });

  function resizeAll() { resizeMaze(); resizeNet(); }
  window.addEventListener("resize", resizeAll);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(resizeAll);
  resizeAll(); reset(); raf();
})();
