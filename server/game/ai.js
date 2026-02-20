const { HAND_TYPES, evaluateHand } = require("./rules");

function normalizeStrength(strengthScore) {
  const minScore = HAND_TYPES.HIGH_CARD * 1000 + 2 * 50;
  const maxScore = HAND_TYPES.TRIPLE * 1000 + 14 * 50;
  const clamped = Math.min(Math.max(strengthScore, minScore), maxScore);
  return (clamped - minScore) / (maxScore - minScore);
}

function decideActionForHand(hand) {
  const evalResult = evaluateHand(hand);
  const s = normalizeStrength(evalResult.strengthScore);

  const r = Math.random();

  if (s > 0.8) {
    if (r < 0.1) {
      return { action: "FOLD", reason: "强牌诈唬弃牌" };
    }
    if (r < 0.6) {
      return { action: "STAY", reason: "强牌稳跟" };
    }
    return { action: "RAISE", reason: "强牌加注" };
  }

  if (s > 0.5) {
    if (r < 0.2) {
      return { action: "FOLD", reason: "中等牌选择观望弃牌" };
    }
    if (r < 0.8) {
      return { action: "STAY", reason: "中等牌跟注" };
    }
    return { action: "RAISE", reason: "中等牌试探性加注" };
  }

  if (r < 0.6) {
    return { action: "FOLD", reason: "弱牌理性弃牌" };
  }
  return { action: "STAY", reason: "弱牌偶尔拼一把" };
}

module.exports = {
  decideActionForHand,
};

