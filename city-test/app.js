(() => {
  "use strict";

  const DISCLAIMER = "本测试为趣味娱乐内容，非专业心理测评，结果仅供娱乐参考。";
  const WRONG_CODE = "口令不对，看看小红书订单消息里那串字符";
  const FONT_STACK = 'system-ui, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
  const registry = globalThis.quizConfigs;
  const testId = new URLSearchParams(location.search).get("test");
  const config = registry[testId] ?? Object.values(registry).find(test => test.isDefault);
  const app = document.querySelector("#app");
  let answers = [];
  let questionIndex = 0;

  document.title = config.title;
  document.querySelector('meta[name="theme-color"]').content = config.theme.background;
  for (const [key, value] of Object.entries(config.theme)) {
    document.documentElement.style.setProperty(`--${key}`, value);
  }

  function show(template, fields, focus = true) {
    const view = document.getElementById(`${template}-view`).content.cloneNode(true);
    for (const [field, value] of Object.entries(fields)) {
      view.querySelector(`[data-${field}]`).textContent = value;
    }
    app.replaceChildren(view);
    window.scrollTo(0, 0);
    if (focus) app.querySelector("h1").focus({ preventScroll: true });
  }

  function showHome() {
    show("home", {
      category: config.category,
      title: config.title,
      subtitle: config.subtitle,
      disclaimer: DISCLAIMER,
    }, false);

    if (config.titleBreakAt) {
      const before = document.createElement("span");
      const after = document.createElement("span");
      before.textContent = config.title.slice(0, config.titleBreakAt);
      after.textContent = config.title.slice(config.titleBreakAt);
      app.querySelector("[data-title]").replaceChildren(before, document.createElement("wbr"), after);
    }

    const form = app.querySelector("form");
    const input = app.querySelector("#access-code");
    const error = app.querySelector("#access-error");
    input.addEventListener("input", () => {
      input.removeAttribute("aria-invalid");
      error.textContent = "";
    });
    form.addEventListener("submit", event => {
      event.preventDefault();
      if (input.value.trim() === config.accessCode) {
        startQuiz();
      } else {
        input.setAttribute("aria-invalid", "true");
        error.textContent = WRONG_CODE;
        input.focus();
      }
    });
  }

  function startQuiz() {
    answers = Array(config.questions.length);
    questionIndex = 0;
    showQuestion();
  }

  function showQuestion() {
    const index = questionIndex;
    const { prompt, options } = config.questions[index];
    const step = `第 ${index + 1}/${config.questions.length} 题`;
    show("question", { category: config.category, step, prompt });

    const progress = app.querySelector("progress");
    progress.max = config.questions.length;
    progress.value = index + 1;
    progress.setAttribute("aria-label", `答题进度，${step}`);

    const target = app.querySelector("[data-options]");
    options.forEach(({ text }, choice) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option";
      button.setAttribute("aria-pressed", String(answers[index] === choice));

      const letter = document.createElement("span");
      letter.className = "option-letter";
      letter.setAttribute("aria-hidden", "true");
      letter.textContent = "ABCD"[choice];
      const label = document.createElement("span");
      label.textContent = text;
      button.append(letter, label);
      button.addEventListener("click", () => {
        answers[index] = choice;
        if (index + 1 === config.questions.length) {
          const { resultId } = globalThis.quizScoring.scoreQuiz(config, answers);
          showResult(config.results[resultId]);
        } else {
          questionIndex = index + 1;
          showQuestion();
        }
      });
      target.append(button);
    });

    const previous = app.querySelector(".previous");
    previous.hidden = index === 0;
    previous.addEventListener("click", () => {
      questionIndex = index - 1;
      showQuestion();
    });
  }

  function showResult(result) {
    show("result", {
      "result-label": config.resultLabel,
      name: result.name,
      verdict: result.verdict,
      "explanation-label": config.explanationLabel,
      explanation: result.explanation,
      "strength-label": config.strengthLabel,
      strength: result.strength,
      "reminder-label": config.reminderLabel,
      reminder: result.reminder,
      disclaimer: DISCLAIMER,
    });

    app.querySelector(".result-hero").style.setProperty("--result-color", result.color);
    const keywords = app.querySelector("[data-keywords]");
    for (const keyword of result.keywords) {
      const item = document.createElement("li");
      item.textContent = keyword;
      keywords.append(item);
    }

    app.querySelector("[data-retry]").addEventListener("click", startQuiz);
    app.querySelector("[data-generate]").addEventListener("click", () => {
      try {
        showPoster(result, createPoster(result));
      } catch (error) {
        app.querySelector("[data-poster-error]").textContent = "海报暂时生成失败，请再试一次。";
        console.error(error);
      }
    });
  }

  function showPoster(result, dataUrl) {
    show("poster", {});
    const image = app.querySelector(".poster-image");
    image.src = dataUrl;
    image.alt = `${config.title} · ${result.name}分享海报`;
    const download = app.querySelector("[data-download]");
    download.href = dataUrl;
    download.download = `${config.id}-${result.name}.png`;
    app.querySelector("[data-back]").addEventListener("click", () => showResult(result));
  }

  function createPoster(result) {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1440;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 不可用");
    const theme = config.theme;
    const left = 82;
    const width = 916;

    function text(value, x, y, size, weight, color, maxWidth) {
      context.font = `${weight} ${size}px ${FONT_STACK}`;
      context.fillStyle = color;
      context.fillText(value, x, y, maxWidth);
    }

    function filledRect(x, y, w, h, color) {
      context.fillStyle = color;
      context.fillRect(x, y, w, h);
    }

    filledRect(0, 0, canvas.width, canvas.height, theme.surface);
    context.strokeStyle = theme.line;
    context.lineWidth = 2;
    context.strokeRect(38, 38, 1004, 1364);
    filledRect(left, 102, 16, 16, result.color);
    text(config.category, 115, 124, 30, 700, theme.accent, 850);
    text(config.title, left, 205, 57, 800, theme.ink, width);

    filledRect(left, 260, width, 526, theme.deep);
    filledRect(left, 260, width, 7, theme.highlight);
    context.save();
    context.beginPath();
    context.rect(left, 267, width, 519);
    context.clip();
    context.strokeStyle = theme.highlight;
    context.lineWidth = 2;
    context.globalAlpha = 0.35;
    for (const radius of [111, 147, 184, 256]) {
      context.beginPath();
      context.arc(795, 440, radius, 0, 2 * Math.PI);
      context.stroke();
    }
    context.beginPath();
    context.moveTo(572, 440);
    context.lineTo(1000, 440);
    context.moveTo(795, 249);
    context.lineTo(795, 640);
    context.stroke();
    context.globalAlpha = 1;
    context.fillStyle = theme.highlight;
    context.beginPath();
    context.moveTo(795, 346);
    context.quadraticCurveTo(802, 433, 889, 440);
    context.quadraticCurveTo(802, 447, 795, 534);
    context.quadraticCurveTo(788, 447, 701, 440);
    context.quadraticCurveTo(788, 433, 795, 346);
    context.fill();
    context.beginPath();
    context.arc(795, 440, 12, 0, 2 * Math.PI);
    context.fillStyle = theme.deep;
    context.fill();
    context.restore();

    text(config.resultLabel, 133, 559, 34, 700, theme.highlight, 500);
    text(result.name, 126, 705, 134, 800, theme.surface, 810);
    filledRect(133, 737, 92, 8, theme.highlight);

    let line = "";
    let y = 893;
    const verdictSize = 48;
    const lineWidth = width - verdictSize;
    context.font = `700 ${verdictSize}px ${FONT_STACK}`;
    for (const character of result.verdict) {
      const joiningMark = "，。！？：；、）”》".includes(character);
      if (line && !joiningMark && context.measureText(line + character).width > lineWidth) {
        const clauseEnd = Math.max(line.lastIndexOf("，"), line.lastIndexOf("；")) + 1;
        const lineEnd = clauseEnd >= line.length / 2 ? clauseEnd : line.length;
        text(line.slice(0, lineEnd), left, y, verdictSize, 700, theme.ink, width);
        y += 69;
        line = line.slice(lineEnd);
      }
      line += character;
    }
    text(line, left, y, verdictSize, 700, theme.ink, width);

    const chipGap = 14;
    const chipWidth = (width - chipGap * (result.keywords.length - 1)) / result.keywords.length;
    result.keywords.forEach((keyword, index) => {
      const x = left + (chipWidth + chipGap) * index;
      filledRect(x, 1110, chipWidth, 66, theme.soft);
      filledRect(x, 1110, 5, 66, result.color);
      text(keyword, x + 25, 1154, 32, 700, result.color, chipWidth - 44);
    });

    filledRect(left, 1287, width, 2, theme.line);
    text(config.poster.footer, left, 1343, 28, 500, theme.muted, width * .49);
    context.textAlign = "right";
    text(config.poster.watermark, left + width, 1343, 28, 700, theme.accent, width * .49);

    const dataUrl = canvas.toDataURL("image/png");
    if (!dataUrl.startsWith("data:image/png;base64,")) throw new Error("PNG 导出失败");
    return dataUrl;
  }

  showHome();
})();
