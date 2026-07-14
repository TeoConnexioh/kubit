/* ============================================================
   메인 — 내비 하이라이트 · 스크롤 진행바 · 등장 애니메이션 · 부드러운 이동
   ============================================================ */
(function () {
  "use strict";

  // --- 부드러운 스크롤 (data-nav 링크) ---
  document.querySelectorAll("a[data-nav]").forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const target = document.querySelector(id);
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: "smooth", block: "start" }); }
    });
  });

  // --- 스크롤 진행바 ---
  const bar = document.getElementById("progressBar");
  function onScroll() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const p = max > 0 ? (h.scrollTop / max) * 100 : 0;
    if (bar) bar.style.width = p + "%";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // --- 현재 챕터 내비 하이라이트 ---
  const navLinks = Array.from(document.querySelectorAll(".chapter-nav a[data-nav]"));
  const linkById = {};
  navLinks.forEach((a) => { linkById[a.getAttribute("href").slice(1)] = a; });
  const sections = navLinks.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);

  const navObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((ent) => {
        if (ent.isIntersecting) {
          navLinks.forEach((l) => l.classList.remove("current"));
          const link = linkById[ent.target.id];
          if (link) link.classList.add("current");
        }
      });
    },
    { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
  );
  sections.forEach((s) => navObs.observe(s));

  // --- 등장 애니메이션 ---
  const revealObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((ent) => {
        if (ent.isIntersecting) { ent.target.classList.add("in"); revealObs.unobserve(ent.target); }
      });
    },
    { threshold: 0.15 }
  );
  document.querySelectorAll(".reveal").forEach((el) => revealObs.observe(el));

  // 히어로 요소는 즉시 등장
  window.addEventListener("load", () => {
    document.querySelectorAll(".hero .reveal").forEach((el) => el.classList.add("in"));
  });
  // load 이벤트를 놓쳤을 때 대비
  setTimeout(() => document.querySelectorAll(".hero .reveal").forEach((el) => el.classList.add("in")), 200);
})();
