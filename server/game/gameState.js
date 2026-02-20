const { createDeck, shuffle, dealCards } = require("./cards");
const { evaluateHand, compareHands } = require("./rules");

const MAX_PLAYERS = 5;

function createInitialRoomState(roomId) {
  return {
    id: roomId,
    players: [],
    deck: [],
    pot: 0,
    stage: "waiting_players",
    lastResult: null,
    ante: 10,
    betStep: 20,
    round: 0,
    currentPlayerIndex: null,
    actionsCountInRound: 0,
  };
}

function addPlayerToRoom(state, playerName) {
  if (state.players.length >= MAX_PLAYERS) {
    return { state, player: null };
  }
  const idNumber = state.players.length + 1;
  const playerId = `p${idNumber}`;
  const player = {
    id: playerId,
    name: playerName || `玩家${idNumber}`,
    hand: [],
    hasFolded: false,
    lastAction: null,
    chips: 1000,
  };
  const players = state.players.concat(player);
  const nextState = {
    ...state,
    players,
  };
  return { state: nextState, player };
}

function startNewRound(state) {
  if (!state.players || state.players.length < 2) {
    return state;
  }
  const deck = shuffle(createDeck());
  const { playersHands, remainingDeck } = dealCards(deck, state.players.length, 3);
  const ante = state.ante || 10;
  let pot = 0;
  const players = state.players.map((p, idx) => {
    const hand = playersHands[idx];
    const pay = Math.min(ante, p.chips);
    const chips = p.chips - pay;
    pot += pay;
    return {
      ...p,
      hand,
      hasFolded: false,
      lastAction: null,
      chips,
    };
  });
  return {
    ...state,
    players,
    deck: remainingDeck,
    pot,
    stage: "betting",
    lastResult: null,
    round: (state.round || 0) + 1,
    currentPlayerIndex: 0,
    actionsCountInRound: 0,
  };
}

function resolveShowdown(baseState, players, pot) {
  const activePlayers = players.filter((p) => !p.hasFolded);
  if (activePlayers.length === 0) {
    return {
      ...baseState,
      players,
      pot,
      stage: "round_finished",
      lastResult: {
        winnerId: null,
        reason: "所有人都弃牌，本局流局",
      },
      currentPlayerIndex: null,
      actionsCountInRound: 0,
    };
  }
  if (activePlayers.length === 1) {
    const winner = activePlayers[0];
    const updatedPlayers = players.map((p) => {
      if (p.id === winner.id) {
        return {
          ...p,
          chips: p.chips + pot,
        };
      }
      return p;
    });
    return {
      ...baseState,
      players: updatedPlayers,
      pot: 0,
      stage: "round_finished",
      lastResult: {
        winnerId: winner.id,
        reason: "其余玩家全部弃牌",
        winnerHand: winner.hand,
        winnerEval: evaluateHand(winner.hand),
      },
      currentPlayerIndex: null,
      actionsCountInRound: 0,
    };
  }
  const ranked = activePlayers
    .map((p) => ({
      player: p,
      eval: evaluateHand(p.hand),
    }))
    .sort((a, b) => compareHands(a.player.hand, b.player.hand) * -1);
  const winnerEntry = ranked[0];
  const updatedPlayers = players.map((p) => {
    if (p.id === winnerEntry.player.id) {
      return {
        ...p,
        chips: p.chips + pot,
      };
    }
    return p;
  });
  return {
    ...baseState,
    players: updatedPlayers,
    pot: 0,
    stage: "round_finished",
    lastResult: {
      winnerId: winnerEntry.player.id,
      reason: "摊牌比较点数胜出",
      winnerHand: winnerEntry.player.hand,
      winnerEval: winnerEntry.eval,
    },
    currentPlayerIndex: null,
    actionsCountInRound: 0,
  };
}

function findNextActivePlayerIndex(players, fromIndex) {
  if (!players.length) return null;
  const count = players.length;
  for (let offset = 1; offset < count + 1; offset += 1) {
    const idx = (fromIndex + offset) % count;
    const p = players[idx];
    if (!p.hasFolded) {
      return idx;
    }
  }
  return null;
}

function applyPlayerAction(state, playerId, action) {
  if (state.stage !== "betting") {
    return state;
  }
  const currentIndex = state.currentPlayerIndex;
  if (currentIndex == null) {
    return state;
  }
  const currentPlayer = state.players[currentIndex];
  if (!currentPlayer || currentPlayer.id !== playerId) {
    return state;
  }
  const betStep = state.betStep || 20;
  let pot = state.pot;
  const players = state.players.map((p, idx) => {
    if (idx !== currentIndex) {
      return p;
    }
    if (action === "FOLD") {
      return {
        ...p,
        hasFolded: true,
        lastAction: "FOLD",
      };
    }
    if (action === "RAISE") {
      const pay = Math.min(betStep, p.chips);
      const chips = p.chips - pay;
      pot += pay;
      return {
        ...p,
        hasFolded: false,
        lastAction: "RAISE",
        chips,
      };
    }
    return {
      ...p,
      hasFolded: false,
      lastAction: "STAY",
    };
  });
  const actionsCountInRound = (state.actionsCountInRound || 0) + 1;
  const activePlayers = players.filter((p) => !p.hasFolded);
  if (activePlayers.length <= 1) {
    return resolveShowdown(state, players, pot);
  }
  if (actionsCountInRound >= players.length) {
    return resolveShowdown(
      {
        ...state,
        actionsCountInRound,
      },
      players,
      pot,
    );
  }
  const nextIndex = findNextActivePlayerIndex(players, currentIndex);
  return {
    ...state,
    players,
    pot,
    currentPlayerIndex: nextIndex,
    actionsCountInRound,
  };
}

module.exports = {
  createInitialRoomState,
  addPlayerToRoom,
  startNewRound,
  applyPlayerAction,
};
