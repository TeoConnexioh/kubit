/* ============================================================
   데모 4-B — LLM의 핵심: 다음 단어 예측
   지금까지의 문장을 보고 다음에 올 단어를 확률로 제시.
   후보를 이어 붙이면 문장이 완성된다 = LLM이 글을 쓰는 방식.
   ============================================================ */
(function () {
  "use strict";
  const sentEl = document.getElementById("nextSentence");
  const candEl = document.getElementById("nextCandidates");
  if (!sentEl || !candEl) return;

  const START = ["나는", "오늘", "아침에"];

  // 마지막 단어 → 다음 단어 후보 분포 (직접 설계한 예시 언어 모델)
  const MODEL = {
    "아침에": [["커피를", 0.5], ["창문을", 0.28], ["서둘러", 0.22]],
    "커피를": [["마시며", 0.5], ["마시고", 0.3], ["내리며", 0.2]],
    "창문을": [["열고", 0.6], ["열자", 0.4]],
    "서둘러": [["집을", 0.55], ["준비를", 0.45]],
    "마시며": [["하루를", 0.5], ["뉴스를", 0.3], ["생각에", 0.2]],
    "마시고": [["집을", 0.5], ["회사로", 0.3], ["다시", 0.2]],
    "내리며": [["향을", 0.6], ["여유를", 0.4]],
    "열고": [["바깥을", 0.6], ["공기를", 0.4]],
    "열자": [["찬바람이", 0.7], ["햇살이", 0.3]],
    "집을": [["나섰다", 0.7], ["나와", 0.3]],
    "준비를": [["마쳤다", 0.65], ["하고", 0.35]],
    "하루를": [["시작했다", 0.8], ["열었다", 0.2]],
    "뉴스를": [["확인했다", 0.7], ["살폈다", 0.3]],
    "생각에": [["잠겼다", 0.75], ["빠졌다", 0.25]],
    "회사로": [["향했다", 0.8], ["갔다", 0.2]],
    "다시": [["잠들었다", 0.5], ["나섰다", 0.5]],
    "향을": [["음미했다", 0.7], ["맡았다", 0.3]],
    "여유를": [["즐겼다", 0.8], ["누렸다", 0.2]],
    "바깥을": [["내다봤다", 0.7], ["바라봤다", 0.3]],
    "공기를": [["마셨다", 0.8], ["들이쉬었다", 0.2]],
    "찬바람이": [["불어왔다", 0.8], ["스며들었다", 0.2]],
    "햇살이": [["비쳤다", 0.8], ["쏟아졌다", 0.2]],
    "나와": [["길을", 0.6], ["버스를", 0.4]],
    "하고": [["나섰다", 0.7], ["떠났다", 0.3]],
    "길을": [["걸었다", 0.7], ["나섰다", 0.3]],
    "버스를": [["탔다", 0.8], ["기다렸다", 0.2]],
  };

  let toks = START.slice();
  let freshIdx = -1; // 방금 추가된 토큰 강조용

  function candidates() {
    const last = toks[toks.length - 1];
    return MODEL[last] ? MODEL[last].slice().sort((a, b) => b[1] - a[1]) : [];
  }

  function renderSentence() {
    sentEl.innerHTML = "";
    toks.forEach((t, i) => {
      const span = document.createElement("span");
      span.textContent = t + " ";
      if (i === freshIdx) span.className = "fresh";
      sentEl.appendChild(span);
    });
    const done = candidates().length === 0;
    if (!done) {
      const cur = document.createElement("span"); cur.className = "cursor"; sentEl.appendChild(cur);
    } else {
      const dot = document.createElement("span"); dot.textContent = "."; sentEl.appendChild(dot);
    }
  }

  function renderCandidates() {
    candEl.innerHTML = "";
    const cands = candidates();
    if (cands.length === 0) {
      const d = document.createElement("div");
      d.className = "next-done";
      d.textContent = "✓ 문장 완성 — 모델이 '여기서 끝'이라고 판단했습니다.";
      candEl.appendChild(d);
      return;
    }
    cands.forEach((c, idx) => {
      const [word, p] = c;
      const row = document.createElement("div");
      row.className = "cand" + (idx === 0 ? " top" : "");
      row.innerHTML =
        `<span class="cand-word">${word}</span>` +
        `<span class="cand-bar"><span style="width:${Math.round(p * 100)}%"></span></span>` +
        `<span class="cand-pct">${Math.round(p * 100)}%</span>`;
      row.addEventListener("click", () => pick(word));
      candEl.appendChild(row);
    });
  }

  function pick(word) {
    toks.push(word);
    freshIdx = toks.length - 1;
    render();
  }

  function sampleWord() {
    const cands = candidates();
    if (cands.length === 0) return null;
    const doSample = document.getElementById("nextSample").checked;
    if (!doSample) return cands[0][0]; // 항상 1순위 (greedy)
    // 확률에 비례해 추출
    let rnd = Math.random(), acc = 0;
    for (const [w, p] of cands) { acc += p; if (rnd <= acc) return w; }
    return cands[cands.length - 1][0];
  }

  function render() { renderSentence(); renderCandidates(); }

  // --- 버튼 ---
  let autoTimer = null;
  const autoBtn = document.getElementById("nextAuto");
  autoBtn.addEventListener("click", () => {
    if (autoTimer) { stopAuto(); return; }
    autoBtn.textContent = "정지 ■"; autoBtn.classList.add("running");
    autoTimer = setInterval(() => {
      const w = sampleWord();
      if (!w) { stopAuto(); return; }
      pick(w);
      if (candidates().length === 0) stopAuto();
    }, 520);
  });
  function stopAuto() {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = null; autoBtn.textContent = "자동으로 이어쓰기 ▶"; autoBtn.classList.remove("running");
  }
  document.getElementById("nextReset").addEventListener("click", () => {
    stopAuto(); toks = START.slice(); freshIdx = -1; render();
  });

  render();
})();
