/* ============================================================
   발표 모드 — 한 화면에 한 블록씩, 화살표로 넘기는 슬라이드
   · 본문 블록을 슬라이드 단위로 감싸고(.slide) 하나만 보여 준다
   · 문단·카드는 조각(.fragment)으로 지정해 한 번에 하나씩 드러낸다
   · 키: → / Space / PageDown 다음 · ← / PageUp 이전 · Home / End
         F 전체화면 · S 또는 Esc 스크롤 보기 전환 · P 발표 모드 전환
   · 주소의 #s12 로 슬라이드 위치를 기억한다
   ============================================================ */
(function () {
  "use strict";
  const root = document.documentElement;
  const main = document.querySelector("main");
  if (!main) return;

  // --- 슬라이드가 되는 블록 ---
  const SLIDE_SEL = [
    "#hero", ".chapter-head", ".slide-group", ".split", ".prose", "figure.demo", "figure.bio-neuron",
    ".aside-note", ".net-figure", ".rl-brain", ".mystery", ".why-parallel", ".pipeline", ".stack",
    ".sc-fig", ".finetune > .ft-head", ".ft-case", ".lora-fig", ".ft-prose",
    ".incontext > .ft-head", ".icl-steps", ".incontext > .cmp-table-wrap", ".limits-grid", ".limits-close",
  ].join(",");
  // --- 슬라이드 안에서 하나씩 드러나는 조각 ---
  const FRAG_SEL = [
    ".prose > p", ".split > .card", ".stack-item", ".limit-card", ".ft-card", ".scale-fact", ".pipe-step",
    ".aside-note > p", ".mystery > p", ".rl-brain-note > p", ".ft-case > p", ".ft-case > .ft-compare",
    ".wp-col", ".bio-map > div", ".limits-close > p", ".ft-head > p", ".net-head > p",
  ].join(",");

  let all = Array.from(main.querySelectorAll(SLIDE_SEL));
  all = all.filter((el) => !all.some((o) => o !== el && o.contains(el)));

  const slides = all.map((el, i) => {
    const wrap = document.createElement("div");
    wrap.className = "slide";
    wrap.dataset.index = i;
    const section = el.closest("section");
    wrap.dataset.section = section ? section.id : "";
    if (el.classList.contains("chapter-head") || el.id === "hero") wrap.classList.add("slide-title");
    if (el.matches("figure.demo")) wrap.classList.add("slide-demo");
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);
    // 조각 지정 (2개 이상일 때만)
    const frags = Array.from(el.querySelectorAll(FRAG_SEL)).filter((f) => !f.closest("figure.demo"));
    if (frags.length >= 2 && !el.matches("#hero")) frags.forEach((f) => f.classList.add("fragment"));
    wrap._frags = frags.length >= 2 ? frags : [];
    return wrap;
  });

  const navLabel = {};
  document.querySelectorAll(".chapter-nav a[data-nav]").forEach((a) => { navLabel[a.getAttribute("href").slice(1)] = a.dataset.label; });

  // --- HUD ---
  const hud = document.createElement("div");
  hud.className = "hud";
  hud.innerHTML =
    `<div class="hud-progress"><span id="hudBar"></span></div>` +
    `<div class="hud-row">` +
    `<span class="hud-chapter" id="hudChapter"></span>` +
    `<span class="hud-count" id="hudCount"></span>` +
    `<span class="hud-btns">` +
    `<button type="button" data-act="prev" title="이전 (←)">‹</button>` +
    `<button type="button" data-act="next" title="다음 (→ / Space)">›</button>` +
    `<button type="button" data-act="full" title="전체화면 (F)">⛶</button>` +
    `<button type="button" data-act="scroll" title="스크롤로 읽기 (S)">스크롤 보기</button>` +
    `</span></div>`;
  document.body.appendChild(hud);
  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button"; toggleBtn.className = "present-toggle"; toggleBtn.textContent = "▶ 발표 모드";
  toggleBtn.title = "슬라이드처럼 한 장씩 보기 (P)";
  document.body.appendChild(toggleBtn);

  let cur = 0;
  const isPresent = () => root.classList.contains("present");

  function fragState(i) {
    const fr = slides[i]._frags;
    return fr.filter((f) => f.classList.contains("shown")).length;
  }
  function setFrags(i, n) {
    slides[i]._frags.forEach((f, k) => f.classList.toggle("shown", k < n));
  }

  function show(i, opts = {}) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    const prev = cur; cur = i;
    slides.forEach((s, k) => {
      s.classList.toggle("active", k === i);
      s.classList.toggle("past", k < i);
    });
    // 뒤로 돌아온 슬라이드는 조각을 모두 보이게, 앞으로 온 슬라이드는 첫 조각만
    if (opts.allFrags || i < prev) setFrags(i, slides[i]._frags.length);
    else setFrags(i, Math.min(1, slides[i]._frags.length));
    slides[i].querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
    slides[i].scrollTop = 0;

    const secId = slides[i].dataset.section;
    document.querySelectorAll(".chapter-nav a").forEach((a) => a.classList.toggle("current", a.getAttribute("href") === "#" + secId));
    const ch = document.getElementById("hudChapter"); if (ch) ch.textContent = navLabel[secId] || "";
    const ct = document.getElementById("hudCount"); if (ct) ct.textContent = `${i + 1} / ${slides.length}`;
    const bar = document.getElementById("hudBar"); if (bar) bar.style.width = ((i + 1) / slides.length * 100) + "%";
    if (isPresent()) history.replaceState(null, "", location.pathname + location.search + "#s" + (i + 1));
    // 캔버스 데모가 새 크기를 반영하도록
    window.dispatchEvent(new Event("resize"));
  }

  function next() {
    const fr = slides[cur]._frags;
    const n = fragState(cur);
    if (n < fr.length) { setFrags(cur, n + 1); return; }
    if (cur < slides.length - 1) show(cur + 1);
  }
  function prev() {
    const n = fragState(cur);
    if (n > 1) { setFrags(cur, n - 1); return; }
    if (cur > 0) show(cur - 1, { allFrags: true });
  }

  function slideOfElement(el) {
    const w = el && el.closest ? el.closest(".slide") : null;
    if (w) return Number(w.dataset.index);
    // 섹션 id → 그 섹션의 첫 슬라이드
    const sec = el && el.closest ? el.closest("section") : null;
    if (sec) { const k = slides.findIndex((s) => s.dataset.section === sec.id); if (k >= 0) return k; }
    return 0;
  }

  // --- 모드 전환 ---
  function enterPresent(fromEl) {
    root.classList.add("present");
    const q = new URLSearchParams(location.search); q.set("mode", "present");
    history.replaceState(null, "", location.pathname + "?" + q + location.hash);
    show(fromEl != null ? slideOfElement(fromEl) : cur, { allFrags: true });
  }
  function exitPresent() {
    const target = slides[cur];
    root.classList.remove("present");
    const q = new URLSearchParams(location.search); q.set("mode", "scroll");
    history.replaceState(null, "", location.pathname + "?" + q);
    document.querySelectorAll(".fragment").forEach((f) => f.classList.add("shown"));
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
    window.dispatchEvent(new Event("resize"));
    requestAnimationFrame(() => target.firstElementChild.scrollIntoView({ block: "start" }));
  }

  // --- 입력 ---
  document.addEventListener("keydown", (e) => {
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (e.key === "p" || e.key === "P") { isPresent() ? exitPresent() : enterPresent(currentScrollBlock()); return; }
    if (!isPresent()) return;
    switch (e.key) {
      case "ArrowRight": case " ": case "PageDown": case "Enter": e.preventDefault(); next(); break;
      case "ArrowLeft": case "PageUp": case "Backspace": e.preventDefault(); prev(); break;
      case "Home": e.preventDefault(); show(0); break;
      case "End": e.preventDefault(); show(slides.length - 1, { allFrags: true }); break;
      case "f": case "F": toggleFull(); break;
      case "s": case "S": case "Escape": if (!document.fullscreenElement) exitPresent(); break;
    }
  });
  hud.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    ({ prev, next, full: toggleFull, scroll: exitPresent })[b.dataset.act]();
  });
  toggleBtn.addEventListener("click", () => enterPresent(currentScrollBlock()));
  function toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
  }
  // 스크롤 모드에서 화면 중앙에 있는 블록 → 발표 모드 진입 지점
  function currentScrollBlock() {
    const mid = window.innerHeight / 2;
    let best = null, bd = Infinity;
    slides.forEach((s) => {
      const r = s.getBoundingClientRect();
      const d = Math.abs((r.top + r.bottom) / 2 - mid);
      if (d < bd) { bd = d; best = s; }
    });
    return best;
  }

  // 챕터 내비·본문 링크: 발표 모드에서는 해당 슬라이드로 점프
  document.querySelectorAll("a[data-nav]").forEach((a) => {
    a.addEventListener("click", (e) => {
      if (!isPresent()) return;
      e.preventDefault(); e.stopImmediatePropagation();
      const target = document.querySelector(a.getAttribute("href"));
      if (a.classList.contains("cta")) { next(); return; }
      show(slideOfElement(target), { allFrags: true });
    }, true);
  });
  const cta = document.querySelector(".cta span");
  if (cta && isPresent()) cta.textContent = "시작하기";

  // --- 시작 ---
  const m = location.hash.match(/^#s(\d+)$/);
  const start = m ? Number(m[1]) - 1 : 0;
  if (isPresent()) show(start, { allFrags: false });
  else { document.querySelectorAll(".fragment").forEach((f) => f.classList.add("shown")); }
})();
