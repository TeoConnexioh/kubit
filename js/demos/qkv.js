/* ============================================================
   데모 5-A — 어텐션 작동 원리 (Query · Key · Value)
   각 토큰의 Q 벡터와 다른 토큰의 K 벡터를 비교해 주목도를 계산한다.
   화면의 질문 문장과 특징 이름은 사람이 붙인 설명용 비유다.
   개념 전달을 위해 직접 설계한 작은 특징 벡터로 계산.
   ============================================================ */
(function () {
  "use strict";
  const picker = document.getElementById("qkvPicker");
  const queryEl = document.getElementById("qkvQuery");
  const rowsEl = document.getElementById("qkvRows");
  const explainEl = document.getElementById("qkvExplain");
  if (!picker || !rowsEl) return;

  // "동물이 길을 건너지 않았다. 그것은 너무 피곤했기 때문이다."
  const tokens = ["동물이", "길을", "건너지", "않았다", "그것은", "너무", "피곤했기", "때문이다"];
  // 특징 축: [명사, 동사, 상태, 지시·이유, 생물]
  const K = {
    "그것은": [0.3, 0, 0, 1, 0], "동물이": [1, 0, 0, 0, 1], "길을": [1, 0, 0, 0, 0],
    "건너지": [0, 1, 0, 0, 0], "않았다": [0, 1, 0, 0.2, 0], "너무": [0, 0, 1, 0, 0],
    "피곤했기": [0, 0, 1, 0, 0], "때문이다": [0, 0, 0.3, 0.8, 0],
  };
  const Q = {
    "그것은": [0.5, 0, 0, 0, 1], "동물이": [0, 1, 0, 0, 0], "길을": [0, 1, 0, 0, 0],
    "건너지": [1, 0, 0, 0, 0.3], "않았다": [0, 1, 0, 0, 0], "너무": [0, 0, 1, 0, 0],
    "피곤했기": [0.3, 0, 0, 0, 1], "때문이다": [0, 0.2, 1, 0, 0],
  };
  const keyLabel = {
    "그것은": "지시어", "동물이": "명사·생물", "길을": "명사", "건너지": "동사",
    "않았다": "동사(부정)", "너무": "정도", "피곤했기": "상태", "때문이다": "이유",
  };
  const queryText = {
    "그것은": "나는 누구를 가리키지? (살아 있는 것)", "동물이": "나는 무엇을 했지?",
    "길을": "무엇을 하는 대상이지?", "건너지": "누가·무엇을 건너지?",
    "않았다": "무슨 동작을 부정하지?", "너무": "무엇이 그렇게 심하지?",
    "피곤했기": "누가 피곤하지?", "때문이다": "무엇 때문이지?",
  };

  const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
  let sel = 0;

  // 선택 칩
  const chips = tokens.map((t, i) => {
    const b = document.createElement("button");
    b.className = "qkv-chip"; b.textContent = t;
    b.addEventListener("click", () => select(i));
    picker.appendChild(b);
    return b;
  });

  function select(i) {
    sel = i;
    chips.forEach((chip, index) => {
      chip.classList.toggle("sel", index === i);
      chip.setAttribute("aria-pressed", String(index === i));
    });
    const wi = tokens[i], qi = Q[wi];

    // 다른 단어와의 매칭 점수
    const scores = tokens.map((wj, j) => (j === i ? -1 : dot(qi, K[wj])));
    const maxScore = Math.max(...scores.filter((s) => s >= 0), 0.001);
    // 소프트맥스(주목도 %)
    const exps = scores.map((s) => (s < 0 ? 0 : Math.exp(s * 1.6)));
    const sum = exps.reduce((a, b) => a + b, 0) || 1;
    const attn = exps.map((e) => e / sum);

    queryEl.innerHTML =
      `<span class="qkv-cardtag">비교 기준 · Query</span>` +
      `<div class="qkv-cardbody"><b>${wi}</b><code class="qkv-vector">Q = [${qi.join(", ")}]</code>` +
      `<span class="qkv-analogy">설명용 비유: “${queryText[wi]}”</span></div>`;

    // 행들
    let topJ = -1, topA = -1;
    attn.forEach((a, j) => { if (j !== i && a > topA) { topA = a; topJ = j; } });
    rowsEl.innerHTML = "";
    tokens.forEach((wj, j) => {
      if (j === i) return;
      const row = document.createElement("div");
      row.className = "qkv-row" + (j === topJ ? " top" : "");
      const w = Math.max(3, (scores[j] / maxScore) * 100);
      row.innerHTML =
        `<span class="qkv-word">${wj}</span>` +
        `<span class="qkv-key">K · ${keyLabel[wj]}</span>` +
        `<span class="qkv-bar"><span style="width:${w.toFixed(0)}%"></span></span>` +
        `<span class="qkv-pct">${Math.round(attn[j] * 100)}%</span>`;
      rowsEl.appendChild(row);
    });

    explainEl.innerHTML =
      `이 예시에서는 <b>${wi}</b>의 Q와 <b class="hl">${tokens[topJ]}</b>의 K가 가장 잘 맞아 ` +
      `주목도가 <b>${Math.round(topA * 100)}%</b>로 가장 높습니다. ` +
      `실제 트랜스포머는 이렇게 정한 비율대로 <strong>V(Value)의 정보를 섞습니다.</strong>`;
  }

  select(4);
})();
