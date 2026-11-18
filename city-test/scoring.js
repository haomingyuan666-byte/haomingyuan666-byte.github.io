(() => {
  "use strict";

  function scoreQuiz(config, answers) {
    const { questions, results, scoring } = config;
    if (!Array.isArray(answers) || answers.length !== questions.length) {
      throw new RangeError("答案数量必须与题目数量一致");
    }

    const scores = Object.fromEntries(Object.keys(results).map(id => [id, 0]));
    questions.forEach(({ options }, index) => {
      const choice = answers[index];
      if (!Number.isInteger(choice) || choice < 0 || choice >= options.length) {
        throw new RangeError(`第 ${index + 1} 题的选项无效`);
      }
      const { primary, secondary } = options[choice];
      scores[primary] += scoring.primaryPoints;
      scores[secondary] += scoring.secondaryPoints;
    });

    // 从优先级最高的结果开始，只在分数严格更高时替换。
    const resultId = scoring.priority.reduce((winner, id) =>
      scores[id] > scores[winner] ? id : winner
    );
    return { resultId, scores };
  }

  if (typeof module === "object" && module.exports) {
    module.exports = { scoreQuiz };
  } else {
    globalThis.quizScoring = { scoreQuiz };
  }
})();
