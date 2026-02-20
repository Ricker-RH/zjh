const assert = require("assert");
const { evaluateHand, HAND_TYPES, compareHands } = require("../game/rules");

function makeCard(rank, suit) {
  return { rank, suit };
}

function testTriple() {
  const hand = [makeCard(9, 0), makeCard(9, 1), makeCard(9, 2)];
  const result = evaluateHand(hand);
  assert.strictEqual(result.type, HAND_TYPES.TRIPLE);
}

function testStraightFlushBeatsFlush() {
  const straightFlush = [makeCard(5, 0), makeCard(4, 0), makeCard(3, 0)];
  const flush = [makeCard(14, 1), makeCard(10, 1), makeCard(8, 1)];
  const cmp = compareHands(straightFlush, flush);
  assert.strictEqual(cmp, 1);
}

function testPairVsHighCard() {
  const pair = [makeCard(7, 0), makeCard(7, 1), makeCard(3, 2)];
  const highCard = [makeCard(14, 0), makeCard(9, 1), makeCard(4, 2)];
  const cmp = compareHands(pair, highCard);
  assert.strictEqual(cmp, 1);
}

function runAll() {
  testTriple();
  testStraightFlushBeatsFlush();
  testPairVsHighCard();
  console.log("All ZhaJinHua rule tests passed");
}

runAll();

