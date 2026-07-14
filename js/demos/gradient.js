/* ============================================================
   데모 2 — 기계학습: 경사하강 (선형회귀)
   점들을 가장 잘 지나는 직선 찾기. 오차를 줄이는 방향으로 한 걸음씩.
   ============================================================ */
(function () {
  "use strict";
  const canvas = document.getElementById("mlCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const lossCanvas = document.getElementById("mlLossCanvas");
  const lctx = lossCanvas.getContext("2d");

  const DOMAIN = 10; // x,y 범위 0~10
  // 내부적으로는 중심화 좌표(x - 평균)에서 직선을 다룬다: predict = a*(x-mx) + b.
  // 이렇게 하면 기울기/절편 방향이 서로 얽히지 않아(지형이 둥글어져) 경사하강이
  // 실제 최소제곱해로 빠르고 정확하게 수렴한다. 화면에 보이는 기울기/절편은 변환해 표시.
  const S = {
    pts: [],
    a: 0.1, b: 5, // 중심화 기울기 a, 평균점에서의 값 b
    mx: 5, // x 평균
    lr: 0.06, steps: 0,
    lossHist: [],
    dragging: null, // 'p1' | 'p2'
  };

  // 화면 표시용 파라미터 ↔ 내부 파라미터 변환
  const dispSlope = () => S.a;
  const dispIntercept = () => S.b - S.a * S.mx; // x=0 에서의 값
  function setLine(slope, intercept) { S.a = slope; S.b = slope * S.mx + intercept; }

  function genPoints() {
    S.pts = [];
    const trueSlope = 0.55 + Math.random() * 0.5;
    const trueB = 1.2 + Math.random() * 2;
    let sumx = 0;
    for (let i = 0; i < 12; i++) {
      const x = 0.6 + (i / 11) * (DOMAIN - 1.2);
      const y = trueSlope * x + trueB + (Math.random() - 0.5) * 2.4;
      S.pts.push({ x, y: Math.max(0.3, Math.min(DOMAIN - 0.3, y)) });
      sumx += x;
    }
    S.mx = sumx / S.pts.length;
    setLine(0.1, 8.5); // 일부러 나쁜 초기 직선
    S.steps = 0; S.lossHist = [];
    pushLoss();
    updateReadout();
  }

  const predict = (x) => S.a * (x - S.mx) + S.b;
  function loss() {
    let s = 0;
    for (const p of S.pts) { const e = predict(p.x) - p.y; s += e * e; }
    return s / S.pts.length;
  }
  function pushLoss() { S.lossHist.push(loss()); if (S.lossHist.length > 200) S.lossHist.shift(); }

  function gradStep() {
    let gA = 0, gB = 0;
    for (const p of S.pts) {
      const e = predict(p.x) - p.y;
      gA += 2 * e * (p.x - S.mx); gB += 2 * e;
    }
    gA /= S.pts.length; gB /= S.pts.length;
    S.a -= S.lr * gA;
    S.b -= S.lr * gB;
    S.steps++;
    pushLoss();
    updateReadout();
  }

  // --- 좌표 변환 ---
  let W = 0, H = 0, PAD = 44;
  const toPx = (x) => PAD + (x / DOMAIN) * (W - PAD * 1.4);
  const toPy = (y) => H - PAD - (y / DOMAIN) * (H - PAD * 1.6);
  const fromPx = (px) => ((px - PAD) / (W - PAD * 1.4)) * DOMAIN;
  const fromPy = (py) => ((H - PAD - py) / (H - PAD * 1.6)) * DOMAIN;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    r = lossCanvas.getBoundingClientRect();
    lossCanvas.width = r.width * dpr; lossCanvas.height = r.height * dpr; lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // 격자
    ctx.strokeStyle = "rgba(226,232,255,0.05)"; ctx.lineWidth = 1;
    for (let i = 0; i <= DOMAIN; i += 2) {
      ctx.beginPath(); ctx.moveTo(toPx(i), toPy(0)); ctx.lineTo(toPx(i), toPy(DOMAIN)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(toPx(0), toPy(i)); ctx.lineTo(toPx(DOMAIN), toPy(i)); ctx.stroke();
    }
    // 축 라벨
    ctx.fillStyle = "#7c7a72"; ctx.font = "400 11px 'IBM Plex Sans KR'"; ctx.textAlign = "center";
    ctx.fillText("공부 시간 →", W / 2, H - 12);
    ctx.save(); ctx.translate(14, H / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText("시험 점수 →", 0, 0); ctx.restore();

    // 잔차(오차) 선
    for (const p of S.pts) {
      ctx.beginPath();
      ctx.moveTo(toPx(p.x), toPy(p.y));
      ctx.lineTo(toPx(p.x), toPy(predict(p.x)));
      ctx.strokeStyle = "rgba(236,106,106,0.45)"; ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
    }

    // 직선
    const x1 = 0, x2 = DOMAIN;
    ctx.beginPath();
    ctx.moveTo(toPx(x1), toPy(predict(x1)));
    ctx.lineTo(toPx(x2), toPy(predict(x2)));
    ctx.strokeStyle = "#f2b544"; ctx.lineWidth = 3;
    ctx.shadowBlur = 12; ctx.shadowColor = "rgba(242,181,68,0.5)"; ctx.stroke(); ctx.shadowBlur = 0;

    // 드래그 손잡이
    for (const hx of [x1 + 0.4, x2 - 0.4]) {
      ctx.beginPath(); ctx.arc(toPx(hx), toPy(predict(hx)), 8, 0, Math.PI * 2);
      ctx.fillStyle = "#0a0c12"; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = "#f2b544"; ctx.stroke();
    }

    // 데이터 점
    for (const p of S.pts) {
      ctx.beginPath(); ctx.arc(toPx(p.x), toPy(p.y), 5.5, 0, Math.PI * 2);
      ctx.fillStyle = "#55d6c4"; ctx.fill();
      ctx.strokeStyle = "rgba(10,12,18,0.9)"; ctx.lineWidth = 1.5; ctx.stroke();
    }

    drawLoss();
    requestAnimationFrame(draw);
  }

  function drawLoss() {
    const w = lossCanvas.getBoundingClientRect().width;
    const h = lossCanvas.getBoundingClientRect().height;
    lctx.clearRect(0, 0, w, h);
    if (S.lossHist.length < 2) return;
    const maxL = Math.max(...S.lossHist, 0.1);
    const pad = 6;
    lctx.beginPath();
    S.lossHist.forEach((v, i) => {
      const x = pad + (i / (S.lossHist.length - 1)) * (w - pad * 2);
      const y = h - pad - (v / maxL) * (h - pad * 2);
      i === 0 ? lctx.moveTo(x, y) : lctx.lineTo(x, y);
    });
    lctx.strokeStyle = "#55d6c4"; lctx.lineWidth = 2; lctx.stroke();
    // 채우기
    lctx.lineTo(w - pad, h - pad); lctx.lineTo(pad, h - pad); lctx.closePath();
    lctx.fillStyle = "rgba(85,214,196,0.12)"; lctx.fill();
  }

  // --- 판독 ---
  const readEls = document.querySelectorAll("#demo-ml .readout b");
  const setK = (k, v) => { const el = document.querySelector(`#demo-ml [data-k="${k}"]`); if (el) el.textContent = v; };
  function updateReadout() {
    setK("slope", dispSlope().toFixed(2));
    setK("intercept", dispIntercept().toFixed(2));
    setK("loss", loss().toFixed(2));
    setK("steps", S.steps);
  }

  // --- 드래그 인터랙션 ---
  function pointerPos(e) {
    const r = canvas.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { cx, cy };
  }
  function onDown(e) {
    const { cx, cy } = pointerPos(e);
    const h1 = { x: toPx(0.4), y: toPy(predict(0.4)) };
    const h2 = { x: toPx(DOMAIN - 0.4), y: toPy(predict(DOMAIN - 0.4)) };
    const d1 = Math.hypot(cx - h1.x, cy - h1.y);
    const d2 = Math.hypot(cx - h2.x, cy - h2.y);
    if (d1 < 22 && d1 <= d2) S.dragging = "p1";
    else if (d2 < 22) S.dragging = "p2";
    if (S.dragging) e.preventDefault();
  }
  function onMove(e) {
    if (!S.dragging) return;
    e.preventDefault();
    const { cx, cy } = pointerPos(e);
    const yVal = Math.max(-2, Math.min(DOMAIN + 2, fromPy(cy)));
    let slope, intercept;
    if (S.dragging === "p1") {
      // 좌측 끝 고정 x=0.4, y 변경 → 절편/기울기 재계산 (우측 끝 유지)
      const xR = DOMAIN - 0.4, yR = predict(xR);
      const xL = 0.4;
      slope = (yR - yVal) / (xR - xL);
      intercept = yVal - slope * xL;
    } else {
      const xL = 0.4, yL = predict(xL);
      const xR = DOMAIN - 0.4;
      slope = (yVal - yL) / (xR - xL);
      intercept = yL - slope * xL;
    }
    setLine(slope, intercept);
    S.lossHist = []; pushLoss(); updateReadout();
  }
  function onUp() { S.dragging = null; }

  canvas.addEventListener("mousedown", onDown);
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
  canvas.addEventListener("touchstart", onDown, { passive: false });
  canvas.addEventListener("touchmove", onMove, { passive: false });
  canvas.addEventListener("touchend", onUp);

  // --- 버튼 ---
  document.getElementById("mlStep").addEventListener("click", gradStep);
  let timer = null;
  const autoBtn = document.getElementById("mlAuto");
  autoBtn.addEventListener("click", () => {
    if (timer) { stop(); return; }
    autoBtn.textContent = "정지 ■"; autoBtn.classList.add("running");
    timer = setInterval(() => {
      const before = loss();
      gradStep();
      // 오차가 거의 안 줄면(최소점 도달) 멈춤
      if (before - loss() < 1e-5 || S.steps > 600) stop();
    }, 55);
  });
  function stop() { if (timer) clearInterval(timer); timer = null; autoBtn.textContent = "경사하강 시작 ▶"; autoBtn.classList.remove("running"); }
  document.getElementById("mlReset").addEventListener("click", () => { stop(); genPoints(); });

  window.addEventListener("resize", resize);
  resize(); genPoints(); draw();

  // 검증용 훅 (window.__mlTest 가 미리 참일 때만 노출; 평상시 비활성)
  if (window.__mlTest) window.__mlTest = { S, loss, gradStep, dispSlope, dispIntercept };
})();
