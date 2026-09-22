/* ============================================================
   집합 모형 — AI ⊃ 기계학습 ⊃ 딥러닝 ⊃ 트랜스포머 ⊃ LLM
   각 층/칩을 누르면 설명과 해당 챕터를 보여준다.
   ============================================================ */
(function () {
  "use strict";
  const diagram = document.getElementById("setDiagram");
  const info = document.getElementById("setInfo");
  if (!diagram || !info) return;

  const C = {
    ai: "#8f8cf0", ml: "#55d6c4", dl: "#6fdca0", tf: "#f2b544", llm: "#f6f2e8",
    supervised: "#55d6c4", unsupervised: "#55d6c4", rl: "#55d6c4",
  };

  const DATA = {
    ai: {
      title: "인공지능 (AI)",
      desc: "사진을 알아보고, 말을 이해하고, 판단하는 일을 컴퓨터로 구현하는 분야입니다. 데이터로 배우는 방법뿐 아니라 사람이 규칙을 직접 적는 방법도 포함합니다.",
      chapter: "이 강의에서 다루는 범위", link: null,
    },
    ml: {
      title: "기계학습 (Machine Learning)",
      desc: "규칙을 일일이 적는 대신 데이터로 모델을 학습시키는 방법입니다. 사진과 정답을 보여 주며 고양이를 구별하게 하는 것이 한 예입니다.",
      chapter: "챕터 03 · 기계학습", link: "#ml",
    },
    dl: {
      title: "딥러닝 (신경망)",
      desc: "신경망의 층을 깊게 쌓아서 학습시키는 방법입니다. 앞 층에서 계산한 결과를 다음 층이 받아 다시 계산합니다. 사진, 소리, 언어 등 여러 데이터에 사용합니다.",
      chapter: "챕터 02 · 뉴런과 학습", link: "#neuron",
    },
    tf: {
      title: "트랜스포머 (Transformer)",
      desc: "신경망 구조의 한 종류입니다. 어텐션으로 문장 안에서 어떤 부분을 얼마나 참고할지 계산합니다. 여기서는 언어를 다루는 예로 살펴봅니다.",
      chapter: "챕터 05 · 트랜스포머", link: "#transformer",
    },
    llm: {
      title: "LLM (대규모 언어 모델)",
      desc: "많은 텍스트로 학습한 대규모 언어 모델입니다. ChatGPT·Claude·Gemini 같은 서비스의 대화 기능에 쓰입니다. 이 그림은 트랜스포머 기반 LLM을 기준으로 그렸습니다.",
      chapter: "챕터 06 · LLM", link: "#llm",
    },
    supervised: {
      title: "지도학습",
      desc: "'정답이 붙은' 데이터로 배우는 방식. 고양이 사진에 '고양이'라는 답을 달아 보여주는 식입니다. 챕터 02의 뉴런 데모와 챕터 03의 '직선 맞히기'가 대표적인 예입니다.",
      chapter: "기계학습의 한 방식 · 챕터 03", link: "#ml",
    },
    unsupervised: {
      title: "비지도학습",
      desc: "정답표 없이 데이터의 구조나 패턴을 찾는 방법입니다. 구매 기록이 비슷한 고객을 몇 그룹으로 묶는 작업을 예로 들 수 있습니다.",
      chapter: "기계학습의 한 방식", link: null,
    },
    rl: {
      title: "강화학습",
      desc: "행동한 결과로 받은 보상을 보고 다음 행동을 개선하는 방법입니다. 챕터 04에서는 미로의 목표에 도착하면 보상을 줍니다.",
      chapter: "기계학습의 한 방식 · 챕터 04", link: "#rl",
    },
  };

  const layers = Array.from(diagram.querySelectorAll(".set-layer"));
  const chips = Array.from(diagram.querySelectorAll(".set-chips span"));
  const all = layers.concat(chips);

  const el = (k) => info.querySelector(`[data-k="${k}"]`);
  const linkEl = el("link");

  function select(key, focusEl) {
    all.forEach((n) => n.classList.remove("sel"));
    if (focusEl) focusEl.classList.add("sel");
    const d = DATA[key];
    if (!d) return;
    el("title").textContent = d.title;
    el("desc").textContent = d.desc;
    el("chapter").textContent = d.chapter;
    info.style.setProperty("--info-c", C[key] || "var(--ink)");
    if (d.link) { linkEl.setAttribute("href", d.link); linkEl.classList.remove("hidden"); }
    else { linkEl.classList.add("hidden"); }
    info.querySelector(".setmap-info-tag").textContent = "선택됨";
  }

  layers.forEach((l) => l.addEventListener("click", (e) => { e.stopPropagation(); select(l.dataset.key, l); }));
  chips.forEach((c) => c.addEventListener("click", (e) => { e.stopPropagation(); select(c.dataset.key, c); }));

  // 기본 선택: 인공지능
  const aiLayer = layers.find((l) => l.dataset.key === "ai");
  select("ai", aiLayer);
})();
