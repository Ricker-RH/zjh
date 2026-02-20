const HAND_TYPES = {
  HIGH_CARD: 0,
  PAIR: 1,
  STRAIGHT: 2,
  FLUSH: 3,
  STRAIGHT_FLUSH: 4,
  TRIPLE: 5,
};

const HAND_TYPE_NAMES = {
  [HAND_TYPES.HIGH_CARD]: "单张",
  [HAND_TYPES.PAIR]: "对子",
  [HAND_TYPES.STRAIGHT]: "顺子",
  [HAND_TYPES.FLUSH]: "金花",
  [HAND_TYPES.STRAIGHT_FLUSH]: "顺金",
  [HAND_TYPES.TRIPLE]: "豹子",
};

function sortByRankDesc(hand) {
  return hand.slice().sort((a, b) => b.rank - a.rank);
}

function isFlush(hand) {
  return hand[0].suit === hand[1].suit && hand[1].suit === hand[2].suit;
}

function isStraight(sortedHand) {
  const ranks = sortedHand.map((c) => c.rank);

  if (ranks[0] === 14 && ranks[1] === 3 && ranks[2] === 2) {
    return true;
  }

  return ranks[0] - 1 === ranks[1] && ranks[1] - 1 === ranks[2];
}

function evaluateHand(hand) {
  const sorted = sortByRankDesc(hand);
  const ranks = sorted.map((c) => c.rank);

  const counts = {};
  for (const r of ranks) {
    counts[r] = (counts[r] || 0) + 1;
  }
  const uniqueRanks = Object.keys(counts).map((x) => parseInt(x, 10));
  uniqueRanks.sort((a, b) => b - a);

  const flush = isFlush(sorted);
  const straight = isStraight(sorted);

  let type = HAND_TYPES.HIGH_CARD;
  let keyRanks = [];

  if (uniqueRanks.length === 1) {
    type = HAND_TYPES.TRIPLE;
    keyRanks = [uniqueRanks[0]];
  } else if (flush && straight) {
    type = HAND_TYPES.STRAIGHT_FLUSH;
    let top = ranks[0];
    if (ranks[0] === 14 && ranks[1] === 3 && ranks[2] === 2) {
      top = 3;
    }
    keyRanks = [top];
  } else if (flush) {
    type = HAND_TYPES.FLUSH;
    keyRanks = ranks.slice();
  } else if (straight) {
    type = HAND_TYPES.STRAIGHT;
    let top = ranks[0];
    if (ranks[0] === 14 && ranks[1] === 3 && ranks[2] === 2) {
      top = 3;
    }
    keyRanks = [top];
  } else if (uniqueRanks.length === 2) {
    type = HAND_TYPES.PAIR;
    const pairRank = uniqueRanks.find((r) => counts[r] === 2);
    const kicker = uniqueRanks.find((r) => counts[r] === 1);
    keyRanks = [pairRank, kicker];
  } else {
    type = HAND_TYPES.HIGH_CARD;
    keyRanks = ranks.slice();
  }

  const strengthScore =
    type * 1000 + keyRanks[0] * 50 + (keyRanks[1] || 0) * 2 + (keyRanks[2] || 0);

  return {
    type,
    typeName: HAND_TYPE_NAMES[type],
    keyRanks,
    strengthScore,
  };
}

function compareHands(handA, handB) {
  const evalA = evaluateHand(handA);
  const evalB = evaluateHand(handB);
  if (evalA.type !== evalB.type) {
    return evalA.type > evalB.type ? 1 : -1;
  }
  const len = Math.max(evalA.keyRanks.length, evalB.keyRanks.length);
  for (let i = 0; i < len; i += 1) {
    const ra = evalA.keyRanks[i] || 0;
    const rb = evalB.keyRanks[i] || 0;
    if (ra !== rb) {
      return ra > rb ? 1 : -1;
    }
  }
  return 0;
}

module.exports = {
  HAND_TYPES,
  HAND_TYPE_NAMES,
  evaluateHand,
  compareHands,
};

