/* ============================================================
   챕터 06 — 시계열 차트: 공개된 모델의 가중치 수 · 학습 토큰 수
   두 개의 작은 차트(로그 축). 크기를 밝히지 않은 상용 모델은
   위쪽 띠에 빈 동그라미로 '발표 시점만' 표시한다.
   값은 각 제작사의 논문·기술 보고서에 공개된 것만 사용.
   ============================================================ */
(function () {
  "use strict";
  const host = document.getElementById("scaleChart");
  if (!host) return;

  // 가중치 수 (개). MoE 모델은 전체 가중치 수.
  const PARAMS = [
    { name: "GPT-1", t: 2018.45, v: 1.17e8 },
    { name: "BERT-Large", t: 2018.8, v: 3.4e8 },
    { name: "GPT-2", t: 2019.1, v: 1.5e9 },
    { name: "T5", t: 2019.8, v: 1.1e10 },
    { name: "GPT-3", t: 2020.4, v: 1.75e11, label: true },
    { name: "MT-NLG", t: 2021.8, v: 5.3e11 },
    { name: "Chinchilla", t: 2022.25, v: 7.0e10 },
    { name: "PaLM", t: 2022.3, v: 5.4e11, label: true },
    { name: "BLOOM", t: 2022.55, v: 1.76e11 },
    { name: "Llama 1", t: 2023.15, v: 6.5e10 },
    { name: "Llama 2", t: 2023.55, v: 7.0e10, label: true },
    { name: "Falcon 180B", t: 2023.7, v: 1.8e11 },
    { name: "Mixtral 8x7B", t: 2023.95, v: 4.67e10 },
    { name: "Llama 3.1 405B", t: 2024.55, v: 4.05e11, label: true, pos: "above-end" },
    { name: "DeepSeek-V3", t: 2024.98, v: 6.71e11, label: true, pos: "below-end" },
    { name: "Qwen3-235B", t: 2025.3, v: 2.35e11 },
    { name: "Kimi K2", t: 2025.55, v: 1.0e12, label: true, pos: "above-end" },
  ];
  // 학습 토큰 수 (개)
  const TOKENS = [
    { name: "GPT-3", t: 2020.4, v: 3.0e11, label: true },
    { name: "Chinchilla", t: 2022.25, v: 1.4e12 },
    { name: "PaLM", t: 2022.3, v: 7.8e11, label: true },
    { name: "Llama 1", t: 2023.15, v: 1.4e12 },
    { name: "Llama 2", t: 2023.55, v: 2.0e12, label: true },
    { name: "Llama 3.1 405B", t: 2024.55, v: 1.5e13, label: true },
    { name: "DeepSeek-V3", t: 2024.98, v: 1.48e13 },
    { name: "Qwen3-235B", t: 2025.3, v: 3.6e13, label: true },
    { name: "Kimi K2", t: 2025.55, v: 1.55e13 },
  ];
  // 크기 비공개 상용 모델: 발표 시점만
  const UNDISCLOSED = [
    { name: "ChatGPT", t: 2022.9 },
    { name: "GPT-4", t: 2023.2 },
    { name: "Claude 2", t: 2023.55 },
    { name: "Claude 3", t: 2024.2 },
    { name: "GPT-4o", t: 2024.4 },
    { name: "Claude 4", t: 2025.4 },
    { name: "GPT-5", t: 2025.6 },
  ];

  const C_PUBLIC = "#bd8222";   // 공개 모델 (검증된 다크 모드 단계)
  const C_HIDDEN = "#22998a";   // 비공개 모델 표시
  const INK = "rgba(236,231,219,0.82)", INK_MUTE = "rgba(236,231,219,0.45)", GRID = "rgba(226,232,255,0.08)";

  const W = 900, PAD_L = 74, PAD_R = 28;
  const X0 = 2018, X1 = 2026.2;
  const xOf = (t) => PAD_L + ((t - X0) / (X1 - X0)) * (W - PAD_L - PAD_R);

  const fmtKo = (v) => {
    if (v >= 1e12) return (v / 1e12).toFixed(v % 1e12 === 0 ? 0 : 1).replace(/\.0$/, "") + "조";
    if (v >= 1e8) return Math.round(v / 1e8).toLocaleString("ko-KR") + "억";
    return v.toLocaleString("ko-KR");
  };
  const fmtYear = (t) => {
    const y = Math.floor(t), m = Math.max(1, Math.min(12, Math.round((t - y) * 12) + 1));
    return `${y}년 ${m}월`;
  };

  const svgNS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs, text) => {
    const n = document.createElementNS(svgNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  };

  // --- 툴팁 ---
  const tip = document.createElement("div");
  tip.className = "sc-tip"; tip.hidden = true;
  host.appendChild(tip);
  function showTip(html, evt) {
    tip.innerHTML = html; tip.hidden = false;
    const r = host.getBoundingClientRect();
    let x = evt.clientX - r.left + 14, y = evt.clientY - r.top - 10;
    if (x + 220 > r.width) x = evt.clientX - r.left - 230;
    tip.style.transform = `translate(${x}px, ${y}px)`;
  }
  const hideTip = () => { tip.hidden = true; };

  // --- 패널 하나 그리기 ---
  function panel(svg, opts) {
    const { top, height, data, yMin, yMax, title, unit, strip } = opts;
    const plotTop = top + (strip ? 92 : 44), plotBot = top + height - 30;
    const yOf = (v) => plotBot - ((Math.log10(v) - Math.log10(yMin)) / (Math.log10(yMax) - Math.log10(yMin))) * (plotBot - plotTop);

    // 제목
    svg.appendChild(el("text", { x: PAD_L, y: top + 14, class: "sc-title" }, title));

    // 가로 격자 + y 라벨 (10배 간격)
    for (let e = Math.log10(yMin); e <= Math.log10(yMax) + 1e-9; e++) {
      const v = Math.pow(10, e), y = yOf(v);
      svg.appendChild(el("line", { x1: PAD_L, x2: W - PAD_R, y1: y, y2: y, stroke: GRID, "stroke-width": 1 }));
      svg.appendChild(el("text", { x: PAD_L - 10, y: y + 4, "text-anchor": "end", class: "sc-ylab" }, fmtKo(v)));
    }
    svg.appendChild(el("text", { x: PAD_L - 10, y: plotTop - 10, "text-anchor": "end", class: "sc-unit" }, unit));

    // x 축
    for (let yr = 2018; yr <= 2026; yr++) {
      const x = xOf(yr);
      svg.appendChild(el("line", { x1: x, x2: x, y1: plotBot, y2: plotBot + 5, stroke: INK_MUTE, "stroke-width": 1 }));
      svg.appendChild(el("text", { x, y: plotBot + 20, "text-anchor": "middle", class: "sc-xlab" }, String(yr)));
    }
    svg.appendChild(el("line", { x1: PAD_L, x2: W - PAD_R, y1: plotBot, y2: plotBot, stroke: INK_MUTE, "stroke-width": 1 }));

    // 비공개 띠
    if (strip) {
      const sy = top + 48;
      svg.appendChild(el("line", { x1: PAD_L, x2: W - PAD_R, y1: sy, y2: sy, stroke: GRID, "stroke-width": 1, "stroke-dasharray": "3 4" }));
      svg.appendChild(el("text", { x: PAD_L - 10, y: sy + 4, "text-anchor": "end", class: "sc-ylab", fill: C_HIDDEN }, "비공개"));
      UNDISCLOSED.forEach((d, i) => {
        const x = xOf(d.t);
        const g = el("g", { class: "sc-mark" });
        g.appendChild(el("circle", { cx: x, cy: sy, r: 12, fill: "transparent" }));
        g.appendChild(el("circle", { cx: x, cy: sy, r: 5, fill: "#0a0c12", stroke: C_HIDDEN, "stroke-width": 2 }));
        const ly = i % 2 === 0 ? sy - 13 : sy + 20;
        g.appendChild(el("text", { x, y: ly, "text-anchor": "middle", class: "sc-lab sc-lab-hidden" }, d.name));
        g.addEventListener("mousemove", (e) => showTip(`<b>${d.name}</b><span>${fmtYear(d.t)} 발표</span><span>가중치·학습 데이터 규모 비공개</span>`, e));
        g.addEventListener("mouseleave", hideTip);
        svg.appendChild(g);
      });
    }

    // 추세선(점 연결은 오해를 줄 수 있어 생략) → 점만, 선택적 직접 라벨
    data.forEach((d) => {
      const x = xOf(d.t), y = yOf(d.v);
      const g = el("g", { class: "sc-mark" });
      g.appendChild(el("circle", { cx: x, cy: y, r: 13, fill: "transparent" }));
      g.appendChild(el("circle", { cx: x, cy: y, r: 5.5, fill: C_PUBLIC, stroke: "#0a0c12", "stroke-width": 2 }));
      if (d.label) {
        const pos = d.pos || (x < W - 130 ? "above" : "above-end");
        const end = pos.endsWith("end");
        const below = pos.startsWith("below");
        g.appendChild(el("text", {
          x: end ? x - 10 : x + 10, y: below ? y + 18 : y - 8,
          "text-anchor": end ? "end" : "start", class: "sc-lab",
        }, d.name));
      }
      g.addEventListener("mousemove", (e) => showTip(`<b>${d.name}</b><span>${fmtYear(d.t)}</span><span>${unit}: ${fmtKo(d.v)} 개</span>`, e));
      g.addEventListener("mouseleave", hideTip);
      svg.appendChild(g);
    });
  }

  const H = 690;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "공개된 언어 모델의 가중치 수와 학습 토큰 수를 연도별로 표시한 로그 축 차트" });
  panel(svg, { top: 0, height: 380, data: PARAMS, yMin: 1e8, yMax: 1e13, title: "가중치 수 (세로축 한 칸 = 10배)", unit: "가중치", strip: true });
  panel(svg, { top: 400, height: 290, data: TOKENS, yMin: 1e11, yMax: 1e14, title: "학습에 읽은 글의 양, 토큰 수", unit: "토큰", strip: false });
  host.insertBefore(svg, tip);

  // --- 표 보기(접근성) ---
  const table = document.getElementById("scaleChartTable");
  if (table) {
    const rows = PARAMS.map((p) => {
      const tk = TOKENS.find((t) => t.name === p.name);
      return `<tr><td>${p.name}</td><td>${fmtYear(p.t)}</td><td>${fmtKo(p.v)}</td><td>${tk ? fmtKo(tk.v) : "<span class='na'>미공개</span>"}</td></tr>`;
    }).join("");
    const hid = UNDISCLOSED.map((u) => `<tr><td>${u.name}</td><td>${fmtYear(u.t)}</td><td class="na">비공개</td><td class="na">비공개</td></tr>`).join("");
    table.innerHTML = `<thead><tr><th>모델</th><th>발표</th><th>가중치 수</th><th>학습 토큰</th></tr></thead><tbody>${rows}${hid}</tbody>`;
  }
})();
