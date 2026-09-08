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
      desc: "보고, 듣고, 판단하고, 말하는 것처럼 사람이 하던 지적인 일을 기계가 흉내 내게 하는 모든 기술을 통틀어 부르는 말. 규칙을 사람이 직접 짜 넣던 옛날 방식까지 포함하는, 가장 바깥의 울타리입니다.",
      chapter: "이 강의 전체의 무대", link: null,
    },
    ml: {
      title: "기계학습 (Machine Learning)",
      desc: "AI 중에서도 '규칙을 사람이 넣지 않고, 데이터를 보며 스스로 배우는' 갈래입니다. 오늘날 우리가 AI라 부르는 것의 대부분이 여기에 속합니다.",
      chapter: "챕터 03 · 기계학습", link: "#ml",
    },
    dl: {
      title: "딥러닝 (신경망)",
      desc: "기계학습을 구현하는 방법 중 하나. 뇌의 뉴런을 본뜬 신경망을 여러 겹(deep) 쌓아, 사진·소리·언어처럼 복잡한 데이터의 패턴을 잡아냅니다.",
      chapter: "챕터 02 · 뉴런과 학습", link: "#neuron",
    },
    tf: {
      title: "트랜스포머 (Transformer)",
      desc: "딥러닝 신경망의 한 종류. '어텐션(서로 주목하기)'이라는 아이디어로 문장 속 단어들의 관계를 파악해, 특히 언어를 다루는 데 강력합니다.",
      chapter: "챕터 05 · 트랜스포머", link: "#transformer",
    },
    llm: {
      title: "LLM (대규모 언어 모델)",
      desc: "트랜스포머를 인터넷 규모의 글로, 수천억 개의 가중치(파라미터)로 키운 것. ChatGPT·Claude·Gemini 같은 생성형 AI 서비스의 바탕이 되는 모델이 여기 속합니다. 오늘날의 LLM은 거의 전부 트랜스포머 계열이라 이 지도에서는 가장 안쪽에 두었습니다.",
      chapter: "챕터 06 · LLM", link: "#llm",
    },
    supervised: {
      title: "지도학습",
      desc: "'정답이 붙은' 데이터로 배우는 방식. 고양이 사진에 '고양이'라는 답을 달아 보여주는 식입니다. 챕터 02의 뉴런 데모와 챕터 03의 '직선 맞히기'가 대표적인 예입니다.",
      chapter: "기계학습의 한 방식 · 챕터 03", link: "#ml",
    },
    unsupervised: {
      title: "비지도학습",
      desc: "정답 없이, 데이터 속에 숨은 무리와 패턴을 스스로 찾아내는 방식. 예를 들어 '비슷한 성향의 고객끼리 자동으로 묶기' 같은 일에 쓰입니다.",
      chapter: "기계학습의 한 방식", link: null,
    },
    rl: {
      title: "강화학습",
      desc: "정답 대신 '보상'으로 배우는 방식. 잘하면 점수를 주어, 시행착오를 거치며 최선의 행동을 익힙니다. 챕터 04의 미로 속 에이전트가 그 예입니다.",
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
