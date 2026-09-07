/* ============================================================
   데모 5-B — 트랜스포머: 어텐션 전체 그림 + 멀티헤드
   여러 개의 어텐션 '헤드'가 각각 다른 관계(참조/문법/수식)를 잡아낸다.
   실제 트랜스포머의 대표적 패턴을 본떠 만든 예시 행렬.
   ============================================================ */
(function () {
  "use strict";
  const sentEl = document.getElementById("attnSentence");
  const canvas = document.getElementById("attnCanvas");
  const gridEl = document.getElementById("attnGrid");
  if (!sentEl || !canvas) return;
  const ctx = canvas.getContext("2d");

  // "동물이 길을 건너지 않았다. 그것은 너무 피곤했기 때문이다." — '그것은'이 '동물이'를 가리킨다.
  const tokens = ["동물이", "길을", "건너지", "않았다", "그것은", "너무", "피곤했기", "때문이다"];

  // 헤드별 원시 가중치 (행 i = 주목 주체, 열 j = 주목 대상). 소프트맥스로 정규화.
  const rawHeads = [
    // 헤드 1 · 지시·참조 (대명사가 가리키는 대상)
    [
      [0.8, 0.3, 0.6, 0.3, 1.2, 0.2, 0.3, 0.2],
      [0.4, 1.0, 0.5, 0.3, 0.3, 0.2, 0.2, 0.2],
      [2.4, 0.6, 0.6, 0.5, 0.4, 0.2, 0.3, 0.3],
      [1.6, 0.3, 1.0, 0.6, 0.3, 0.2, 0.3, 0.3],
      [3.2, 0.3, 0.3, 0.2, 0.5, 0.2, 1.4, 0.3],
      [0.4, 0.2, 0.2, 0.2, 0.2, 0.6, 2.6, 0.4],
      [2.4, 0.2, 0.3, 0.4, 1.9, 0.6, 0.7, 0.4],
      [1.4, 0.2, 0.3, 0.5, 0.6, 0.3, 2.6, 0.7],
    ],
    // 헤드 2 · 주어–동사 (문법 구조)
    [
      [0.6, 0.5, 3.0, 0.8, 0.6, 0.2, 0.3, 0.2],
      [0.5, 0.6, 3.0, 0.6, 0.3, 0.2, 0.2, 0.2],
      [2.6, 2.4, 0.6, 0.8, 0.3, 0.2, 0.3, 0.3],
      [0.6, 0.4, 3.0, 0.6, 0.3, 0.2, 0.3, 0.4],
      [0.5, 0.3, 0.6, 0.5, 0.4, 0.2, 3.0, 0.3],
      [0.3, 0.2, 0.2, 0.2, 0.2, 0.5, 2.4, 0.3],
      [0.8, 0.2, 0.3, 0.4, 2.6, 0.5, 0.6, 0.4],
      [0.5, 0.3, 0.6, 1.8, 0.4, 0.3, 2.0, 0.6],
    ],
    // 헤드 3 · 수식·이유 (정도부사·인과)
    [
      [1.0, 0.3, 0.6, 0.4, 0.4, 0.2, 0.6, 0.3],
      [0.3, 1.0, 0.6, 0.3, 0.3, 0.2, 0.2, 0.2],
      [0.6, 0.6, 0.6, 2.2, 0.3, 0.2, 0.4, 0.6],
      [0.4, 0.3, 1.4, 0.6, 0.3, 0.2, 0.6, 2.2],
      [0.5, 0.3, 0.4, 0.6, 0.6, 0.4, 2.2, 0.6],
      [0.2, 0.2, 0.2, 0.2, 0.2, 0.6, 3.0, 0.3],
      [0.8, 0.2, 0.3, 0.5, 0.5, 2.2, 0.7, 1.6],
      [0.4, 0.3, 0.5, 1.6, 0.4, 0.6, 2.6, 0.7],
    ],
  ];

  const softmaxRows = (raw) => raw.map((row) => {
    const ex = row.map((v) => Math.exp(v));
    const sum = ex.reduce((a, b) => a + b, 0);
    return ex.map((v) => v / sum);
  });

  let headIdx = 0;
  let A = softmaxRows(rawHeads[0]);
  let active = 0;
  const n = tokens.length;

  // --- 문장 토큰 렌더 ---
  const tokEls = tokens.map((t, i) => {
    const span = document.createElement("span");
    span.className = "attn-token";
    span.textContent = t;
    span.dataset.i = i;
    span.addEventListener("mouseenter", () => setActive(i));
    span.addEventListener("click", () => setActive(i));
    sentEl.appendChild(span);
    return span;
  });

  // --- 열지도 셀 생성 (한 번) ---
  gridEl.style.gridTemplateColumns = `minmax(52px,auto) repeat(${n}, 1fr)`;
  const short = tokens.map((t) => (t.length > 3 ? t.slice(0, 3) : t));
  const corner = document.createElement("div"); corner.className = "hcorner"; gridEl.appendChild(corner);
  short.forEach((t) => { const d = document.createElement("div"); d.className = "hlabel"; d.textContent = t; gridEl.appendChild(d); });
  const cellRefs = [];
  for (let i = 0; i < n; i++) {
    const lab = document.createElement("div"); lab.className = "hlabel"; lab.textContent = short[i];
    lab.style.justifyContent = "flex-end"; lab.style.paddingRight = "6px";
    gridEl.appendChild(lab);
    cellRefs[i] = [];
    for (let j = 0; j < n; j++) {
      const c = document.createElement("div"); c.className = "hcell";
      gridEl.appendChild(c);
      cellRefs[i][j] = c;
    }
  }

  function paintHeatmap() {
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = A[i][j], c = cellRefs[i][j];
      c.style.background = `rgba(85,214,196,${(v * 0.9).toFixed(3)})`;
      c.textContent = v > 0.28 ? Math.round(v * 100) : "";
      c.title = `${tokens[i]} → ${tokens[j]} : ${Math.round(v * 100)}%`;
    }
  }

  function setActive(i) {
    active = i;
    tokEls.forEach((el, k) => { el.classList.toggle("active", k === i); el.classList.remove("target"); });
    let bestJ = -1, best = -1;
    for (let j = 0; j < n; j++) if (j !== i && A[i][j] > best) { best = A[i][j]; bestJ = j; }
    if (bestJ >= 0) tokEls[bestJ].classList.add("target");
    for (let r = 0; r < n; r++) for (let j = 0; j < n; j++) {
      cellRefs[r][j].style.outline = r === i ? "1px solid rgba(242,181,68,0.55)" : "none";
    }
    drawLines();
  }

  // --- 헤드 전환 ---
  const headBtns = document.querySelectorAll("#attnHeads button");
  headBtns.forEach((b) => b.addEventListener("click", () => {
    headBtns.forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    headIdx = Number(b.dataset.head);
    A = softmaxRows(rawHeads[headIdx]);
    paintHeatmap();
    setActive(active);
  }));

  // --- 연결선 ---
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawLines();
  }
  function centerOf(el, wrapRect) {
    const r = el.getBoundingClientRect();
    return { x: r.left - wrapRect.left + r.width / 2, y: r.top - wrapRect.top + r.height / 2 };
  }
  function drawLines() {
    const wrap = canvas.parentElement.getBoundingClientRect();
    ctx.clearRect(0, 0, wrap.width, wrap.height);
    if (active === null) return;
    const from = centerOf(tokEls[active], wrap);
    for (let j = 0; j < n; j++) {
      if (j === active) continue;
      const w_ = A[active][j];
      if (w_ < 0.04) continue;
      const to = centerOf(tokEls[j], wrap);
      const midY = Math.min(from.y, to.y) - 26 - w_ * 30;
      const cx = (from.x + to.x) / 2;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo(cx, midY, to.x, to.y);
      const alpha = 0.12 + w_ * 0.85;
      ctx.strokeStyle = `rgba(242,181,68,${alpha.toFixed(3)})`;
      ctx.lineWidth = 1 + w_ * 9; ctx.lineCap = "round"; ctx.stroke();
      ctx.beginPath(); ctx.arc(to.x, to.y, 2 + w_ * 5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(85,214,196,${(0.3 + w_ * 0.6).toFixed(3)})`; ctx.fill();
    }
  }

  window.addEventListener("resize", resize);
  window.addEventListener("scroll", () => { if (active !== null) drawLines(); }, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
  setTimeout(resize, 300);
  paintHeatmap();
  resize();
  setActive(4);
})();
