/* ============================================================
   히어로 배경 — 부유하는 뉴런 성좌
   ============================================================ */
(function () {
  "use strict";
  const canvas = document.getElementById("heroCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, nodes = [], raf = null;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(64, Math.round((W * H) / 22000));
    nodes = [];
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
        r: 1 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        warm: Math.random() > 0.5,
      });
    }
  }

  let t = 0;
  function frame() {
    t += 0.01;
    ctx.clearRect(0, 0, W, H);
    // 연결선
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d < 140) {
          const al = (1 - d / 140) * 0.16;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(120,180,200,${al})`;
          ctx.lineWidth = 1; ctx.stroke();
        }
      }
    }
    // 노드
    for (const n of nodes) {
      if (!reduce) { n.x += n.vx; n.y += n.vy; }
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
      const pulse = 0.6 + 0.4 * Math.sin(t * 2 + n.phase);
      const col = n.warm ? "242,181,68" : "85,214,196";
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r * (1 + pulse * 0.3), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${col},${0.35 + pulse * 0.4})`;
      ctx.shadowBlur = 8; ctx.shadowColor = `rgba(${col},0.6)`;
      ctx.fill(); ctx.shadowBlur = 0;
    }
    raf = requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();
  frame();
})();
