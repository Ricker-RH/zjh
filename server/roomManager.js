const {
  createInitialRoomState,
  addPlayerToRoom,
  startNewRound,
  applyPlayerAction,
} = require("./game/gameState");

class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.nextRoomId = 1;
  }

  createRoom(humanPlayerName) {
    const id = String(this.nextRoomId);
    this.nextRoomId += 1;
    const initial = createInitialRoomState(id);
    const { state, player } = addPlayerToRoom(initial, humanPlayerName);
    this.rooms.set(id, state);
    return { state, player };
  }

  getRoom(id) {
    return this.rooms.get(id) || null;
  }

  startRound(id) {
    const state = this.getRoom(id);
    if (!state) return null;
    const updated = startNewRound(state);
    this.rooms.set(id, updated);
    return updated;
  }

  joinRoom(id, playerName) {
    const state = this.getRoom(id);
    if (!state) return null;
    const result = addPlayerToRoom(state, playerName);
    if (!result.player) {
      return null;
    }
    this.rooms.set(id, result.state);
    return result;
  }

  applyPlayerAction(id, playerId, action) {
    const state = this.getRoom(id);
    if (!state) return null;
    const updated = applyPlayerAction(state, playerId, action);
    this.rooms.set(id, updated);
    return updated;
  }
}

module.exports = {
  RoomManager,
};
