const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // 11:J, 12:Q, 13:K, 14:A
const SUITS = [0, 1, 2, 3]; // 0♠ 1♥ 2♣ 3♦

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

function shuffle(deck) {
  const arr = deck.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function dealCards(deck, playerCount, cardsPerPlayer = 3) {
  const playersHands = [];
  let index = 0;
  for (let p = 0; p < playerCount; p += 1) {
    const hand = [];
    for (let c = 0; c < cardsPerPlayer; c += 1) {
      hand.push(deck[index]);
      index += 1;
    }
    playersHands.push(hand);
  }
  const remainingDeck = deck.slice(index);
  return { playersHands, remainingDeck };
}

function cardToString(card) {
  const rankMap = {
    11: "J",
    12: "Q",
    13: "K",
    14: "A",
  };
  const suitMap = {
    0: "♠",
    1: "♥",
    2: "♣",
    3: "♦",
  };
  const rankStr = rankMap[card.rank] || String(card.rank);
  const suitStr = suitMap[card.suit] || "?";
  return `${suitStr}${rankStr}`;
}

module.exports = {
  RANKS,
  SUITS,
  createDeck,
  shuffle,
  dealCards,
  cardToString,
};

