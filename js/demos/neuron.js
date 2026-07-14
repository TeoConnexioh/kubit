/* ============================================================
   데모 1 — 뉴런 한 개의 학습 (퍼셉트론)
   입력 A, B → 가중치 → 출력 뉴런. 학습으로 가중치가 조정된다.
   ============================================================ */
(function () {
  "use strict";
  const canvas = document.getElementById("neuronCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // --- 상태 ---
  const S = {
    wa: 0, wb: 0, bias: 0, // 실제 가중치
    dwa: 0, dwb: 0, dbias: 0, // 화면에 부드럽게 따라오는 표시용
    inA: 1, inB: 1,
    rule: "AND",
    lr: 0.15,
    acc: 0,
    pulse: 0, // 학습 순간 반짝임
  };

  const target = (a, b) => (S.rule === "AND" ? (a && b ? 1 : 0) : (a || b ? 1 : 0));
  const raw = (a, b) => S.wa * a + S.wb * b + S.bias;
  const predict = (a, b) => (raw(a, b) > 0 ? 1 : 0);

  function accuracy() {
    let ok = 0;
    for (const [a, b] of [[0, 0], [0, 1], [1, 0], [1, 1]]) if (predict(a, b) === target(a, b)) ok++;
    return ok / 4;
  }

  // 무작위 표본 하나로 퍼셉트론 갱신
  let sampleIdx = 0;
  const samples = [[0, 0], [0, 1], [1, 0], [1, 1]];
  function trainStep() {
    const [a, b] = samples[sampleIdx % 4];
    sampleIdx++;
    const err = target(a, b) - predict(a, b);
    S.wa += S.lr * err * a;
    S.wb += S.lr * err * b;
    S.bias += S.lr * err;
    S.acc = accuracy();
    S.pulse = 1;
    updateReadout();
  }

  function reset() {
    S.wa = (Math.sin(sampleIdx * 12.9) * 0.4); // 살짝 무작위한 초기값 (Math.random 미사용)
    S.wb = (Math.cos(sampleIdx * 7.7) * 0.4);
    S.bias = 0.1;
    S.acc = accuracy();
    updateReadout();
  }

  // --- 판독부 ---
  const readout = document.getElementById("neuronReadout");
  const setK = (k, v) => { const el = readout.querySelector(`[data-k="${k}"]`); if (el) el.textContent = v; };
  function updateReadout() {
    setK("wa", S.wa.toFixed(2));
    setK("wb", S.wb.toFixed(2));
    setK("bias", S.bias.toFixed(2));
    const out = predict(S.inA, S.inB);
    setK("out", out ? "예 (발화)" : "아니오");
    setK("acc", Math.round(S.acc * 100) + "%");
    const el = readout.querySelector('[data-k="out"]');
    if (el) el.style.color = out ? "var(--amber)" : "var(--ink-mute)";
    const accEl = readout.querySelector('[data-k="acc"]');
    if (accEl) accEl.style.color = S.acc === 1 ? "var(--good)" : "var(--cyan)";
  }

  // --- 그리기 ---
  let W = 0, H = 0;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function node(x, y, radius, fill, glow) {
    if (glow > 0) {
      ctx.save();
      ctx.shadowBlur = 30 * glow; ctx.shadowColor = "rgba(242,181,68,0.9)";
    }
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill; ctx.fill();
    if (glow > 0) ctx.restore();
    ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(236,231,219,0.25)"; ctx.stroke();
  }

  function edge(x1, y1, x2, y2, weight, active) {
    const mag = Math.min(Math.abs(weight), 2);
    const thickness = 1 + mag * 5;
    const pos = weight >= 0;
    const alpha = 0.25 + Math.min(mag / 2, 1) * 0.6;
    const col = pos
      ? `rgba(242,181,68,${active ? alpha : alpha * 0.5})`
      : `rgba(85,214,196,${active ? alpha : alpha * 0.5})`;
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.lineWidth = thickness; ctx.strokeStyle = col;
    ctx.lineCap = "round";
    if (active && S.pulse > 0) { ctx.shadowBlur = 16 * S.pulse; ctx.shadowColor = col; }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function draw() {
    // 표시 가중치를 실제값으로 부드럽게 이동
    S.dwa += (S.wa - S.dwa) * 0.15;
    S.dwb += (S.wb - S.dwb) * 0.15;
    S.dbias += (S.bias - S.dbias) * 0.15;
    S.pulse *= 0.92;

    ctx.clearRect(0, 0, W, H);

    const ax = W * 0.24, ay = H * 0.30;
    const bx = W * 0.24, by = H * 0.70;
    const ox = W * 0.72, oy = H * 0.50;
    const rIn = 26, rOut = 40;

    // 연결선 (뒤에)
    edge(ax, ay, ox, oy, S.dwa, S.inA === 1);
    edge(bx, by, ox, oy, S.dwb, S.inB === 1);

    // 라벨: 가중치 값
    ctx.font = "500 13px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "rgba(236,231,219,0.65)"; ctx.textAlign = "center";
    ctx.fillText(S.dwa.toFixed(2), (ax + ox) / 2, (ay + oy) / 2 - 12);
    ctx.fillText(S.dwb.toFixed(2), (bx + ox) / 2, (by + oy) / 2 + 20);

    // 입력 노드
    node(ax, ay, rIn, S.inA ? "rgba(242,181,68,0.18)" : "rgba(30,36,52,0.9)", S.inA ? 0.5 : 0);
    node(bx, by, rIn, S.inB ? "rgba(242,181,68,0.18)" : "rgba(30,36,52,0.9)", S.inB ? 0.5 : 0);

    ctx.font = "600 18px 'IBM Plex Mono', monospace";
    ctx.fillStyle = S.inA ? "var(--amber)" : "#6b7080";
    ctx.fillStyle = S.inA ? "#f2b544" : "#6b7080";
    ctx.fillText(String(S.inA), ax, ay + 6);
    ctx.fillStyle = S.inB ? "#f2b544" : "#6b7080";
    ctx.fillText(String(S.inB), bx, by + 6);

    ctx.font = "400 12px 'IBM Plex Sans KR', sans-serif";
    ctx.fillStyle = "#8b8a82";
    ctx.fillText("입력 A", ax, ay - rIn - 12);
    ctx.fillText("입력 B", bx, by + rIn + 22);

    // 출력 뉴런
    const out = predict(S.inA, S.inB);
    node(ox, oy, rOut, out ? "rgba(242,181,68,0.22)" : "rgba(27,33,48,0.95)", out ? 0.7 : 0.05);
    ctx.font = "700 22px 'Gowun Batang', serif";
    ctx.fillStyle = out ? "#f6f2e8" : "#7c7a72";
    ctx.textAlign = "center";
    ctx.fillText(out ? "예" : "아니오", ox, oy + 7);
    ctx.font = "400 12px 'IBM Plex Sans KR', sans-serif";
    ctx.fillStyle = "#8b8a82";
    ctx.fillText("출력 뉴런", ox, oy - rOut - 12);

    // 문턱값 표시
    ctx.font = "400 11px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "#7c7a72";
    ctx.fillText("문턱 " + S.dbias.toFixed(2), ox, oy + rOut + 22);

    requestAnimationFrame(draw);
  }

  // --- 컨트롤 ---
  const inABtn = document.getElementById("inA");
  const inBBtn = document.getElementById("inB");
  function refreshToggle(btn, val) {
    btn.classList.toggle("on", val === 1);
    btn.classList.toggle("off", val === 0);
    btn.querySelector("b").textContent = val;
  }
  inABtn.addEventListener("click", () => { S.inA = S.inA ? 0 : 1; refreshToggle(inABtn, S.inA); updateReadout(); });
  inBBtn.addEventListener("click", () => { S.inB = S.inB ? 0 : 1; refreshToggle(inBBtn, S.inB); updateReadout(); });

  document.querySelectorAll("#neuronRule button").forEach((b) => {
    b.addEventListener("click", () => {
      document.querySelectorAll("#neuronRule button").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      S.rule = b.dataset.rule;
      S.acc = accuracy();
      updateReadout();
    });
  });

  document.getElementById("neuronStep").addEventListener("click", trainStep);

  let autoTimer = null;
  const autoBtn = document.getElementById("neuronAuto");
  autoBtn.addEventListener("click", () => {
    if (autoTimer) { stopAuto(); return; }
    autoBtn.textContent = "정지 ■"; autoBtn.classList.add("running");
    autoTimer = setInterval(() => {
      trainStep();
      if (S.acc === 1) { // 정답에 도달하면 몇 번 더 돌고 멈춤
        setTimeout(stopAuto, 600);
      }
    }, 260);
  });
  function stopAuto() {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = null;
    autoBtn.textContent = "자동 학습 ▶"; autoBtn.classList.remove("running");
  }

  document.getElementById("neuronReset").addEventListener("click", () => { stopAuto(); reset(); });

  // --- 시작 ---
  refreshToggle(inABtn, S.inA);
  refreshToggle(inBBtn, S.inB);
  window.addEventListener("resize", resize);
  resize(); reset(); draw();
})();
