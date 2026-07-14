/* ============================================================
   재사용 신경망 시각화 — canvas.net-canvas 를 모두 애니메이션.
   data-layers="3,6,6,4,2" 형태로 층별 뉴런 수 지정.
   신호가 입력층 → 출력층으로 층층이 전파되는 모습을 보여준다.
   ============================================================ */
(function () {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvases = document.querySelectorAll("canvas.net-canvas");
  if (!canvases.length) return;

  canvases.forEach((canvas) => {
    const ctx = canvas.getContext("2d");
    const layers = (canvas.dataset.layers || "3,5,5,2").split(",").map(Number);
    let W = 0, H = 0, pos = [], pulses = [], frame = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pos = layers.map((n, li) => {
        const x = W * (0.09 + 0.82 * (layers.length === 1 ? 0.5 : li / (layers.length - 1)));
        const arr = [];
        for (let i = 0; i < n; i++) arr.push({ x, y: H * ((i + 1) / (n + 1)) });
        return arr;
      });
    }

    function colOf(li) {
      if (li === 0) return "85,214,196";                 // 입력층 · 시안
      if (li === layers.length - 1) return "242,181,68";  // 출력층 · 앰버
      return "111,220,160";                               // 은닉층 · 그린
    }

    function spawn() {
      const from = Math.floor(Math.random() * layers[0]);
      const to = Math.floor(Math.random() * layers[1]);
      pulses.push({ li: 0, from, to, t: 0 });
    }

    function step() {
      frame++;
      if (frame % 20 === 0 && pulses.length < 28) spawn();
      const next = [];
      for (const p of pulses) {
        p.t += 0.04;
        if (p.t >= 1) {
          if (p.li < layers.length - 2) {
            const to = Math.floor(Math.random() * layers[p.li + 2]);
            next.push({ li: p.li + 1, from: p.to, to, t: 0 });
          }
        } else next.push(p);
      }
      pulses = next;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      // 연결선
      for (let li = 0; li < layers.length - 1; li++) {
        for (const a of pos[li]) for (const b of pos[li + 1]) {
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = "rgba(226,232,255,0.06)"; ctx.lineWidth = 1; ctx.stroke();
        }
      }
      // 신호 펄스
      for (const p of pulses) {
        const a = pos[p.li][p.from], b = pos[p.li + 1] && pos[p.li + 1][p.to];
        if (!a || !b) continue;
        const x = a.x + (b.x - a.x) * p.t, y = a.y + (b.y - a.y) * p.t;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = "rgba(242,181,68," + (0.08 + 0.18 * (1 - Math.abs(0.5 - p.t) * 2)) + ")";
        ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,242,210,0.95)";
        ctx.shadowBlur = 10; ctx.shadowColor = "rgba(242,181,68,0.9)"; ctx.fill(); ctx.shadowBlur = 0;
      }
      // 뉴런
      for (let li = 0; li < layers.length; li++) {
        const col = colOf(li);
        for (const nd of pos[li]) {
          ctx.beginPath(); ctx.arc(nd.x, nd.y, 7, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(" + col + ",0.18)"; ctx.fill();
          ctx.lineWidth = 1.6; ctx.strokeStyle = "rgba(" + col + ",0.9)"; ctx.stroke();
        }
      }
    }

    function loop() { step(); draw(); requestAnimationFrame(loop); }

    window.addEventListener("resize", resize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
    resize();
    if (reduce) draw(); else loop();
  });
})();
