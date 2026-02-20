const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const { RoomManager } = require("./roomManager");

const app = express();
const port = process.env.PORT || 4000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const roomManager = new RoomManager();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/rooms", (req, res) => {
  const { playerName } = req.body || {};
  const result = roomManager.createRoom(playerName);
  res.json({
    roomId: result.state.id,
    playerId: result.player.id,
    state: result.state,
  });
});

app.get("/rooms/:roomId", (req, res) => {
  const room = roomManager.getRoom(req.params.roomId);
  if (!room) {
    res.status(404).json({ error: "房间不存在" });
    return;
  }
  res.json({ state: room });
});

app.post("/rooms/:roomId/join", (req, res) => {
  const { playerName } = req.body || {};
  const result = roomManager.joinRoom(req.params.roomId, playerName);
  if (!result) {
    res.status(400).json({ error: "房间不存在或人数已满" });
    return;
  }
  res.json({
    roomId: req.params.roomId,
    playerId: result.player.id,
    state: result.state,
  });
});

app.post("/rooms/:roomId/start", (req, res) => {
  const room = roomManager.startRound(req.params.roomId);
  if (!room) {
    res.status(404).json({ error: "房间不存在" });
    return;
  }
  if (room.stage !== "betting") {
    res.status(400).json({ error: "玩家数量不足，无法开始" });
    return;
  }
  res.json({ state: room });
});

app.post("/rooms/:roomId/action", (req, res) => {
  const { playerId, action } = req.body || {};
  const room = roomManager.applyPlayerAction(req.params.roomId, playerId, action);
  if (!room) {
    res.status(404).json({ error: "房间不存在" });
    return;
  }
  res.json({ state: room });
});

function emitRoomSnapshot(roomId) {
  const state = roomManager.getRoom(roomId);
  if (!state) {
    return;
  }
  io.to(roomId).emit("room_snapshot", {
    roomId,
    state,
  });
}

io.on("connection", (socket) => {
  let currentRoomId = null;
  let currentPlayerId = null;

  socket.on("join_room", (payload) => {
    const data = payload || {};
    let roomId = data.roomId;
    const playerName = data.playerName;

    let result;
    if (roomId) {
      result = roomManager.joinRoom(roomId, playerName);
      if (!result) {
        socket.emit("error_message", { message: "房间不存在或人数已满" });
        return;
      }
    } else {
      const created = roomManager.createRoom(playerName);
      roomId = created.state.id;
      result = created;
    }

    currentRoomId = roomId;
    currentPlayerId = result.player.id;

    socket.join(roomId);

    emitRoomSnapshot(roomId);

    socket.emit("joined_room", {
      roomId,
      playerId: currentPlayerId,
    });
  });

  socket.on("rejoin_room", (payload) => {
    const data = payload || {};
    const roomId = data.roomId;
    const playerId = data.playerId;
    if (!roomId || !playerId) {
      socket.emit("error_message", { message: "房间号或玩家ID缺失" });
      return;
    }
    const state = roomManager.getRoom(roomId);
    if (!state) {
      socket.emit("error_message", { message: "房间不存在" });
      return;
    }
    const exists = state.players.some((p) => p.id === playerId);
    if (!exists) {
      socket.emit("error_message", { message: "玩家不在房间中" });
      return;
    }

    currentRoomId = roomId;
    currentPlayerId = playerId;
    socket.join(roomId);

    socket.emit("room_snapshot", {
      roomId,
      state,
    });
  });

  socket.on("start_round", (payload) => {
    const data = payload || {};
    const roomId = data.roomId || currentRoomId;
    if (!roomId) {
      socket.emit("error_message", { message: "房间号缺失" });
      return;
    }
    const room = roomManager.startRound(roomId);
    if (!room) {
      socket.emit("error_message", { message: "房间不存在" });
      return;
    }
    if (room.stage !== "betting") {
      socket.emit("error_message", { message: "玩家数量不足，无法开始" });
      return;
    }
    emitRoomSnapshot(roomId);
  });

  socket.on("player_action", (payload) => {
    const data = payload || {};
    const roomId = data.roomId || currentRoomId;
    const playerId = data.playerId || currentPlayerId;
    const action = data.action;
    if (!roomId || !playerId || !action) {
      socket.emit("error_message", { message: "参数不完整" });
      return;
    }
    const room = roomManager.applyPlayerAction(roomId, playerId, action);
    if (!room) {
      socket.emit("error_message", { message: "房间不存在" });
      return;
    }
    emitRoomSnapshot(roomId);
  });

  socket.on("leave_room", () => {
    if (currentRoomId) {
      socket.leave(currentRoomId);
    }
    currentRoomId = null;
    currentPlayerId = null;
  });

  socket.on("heartbeat", (payload) => {
    const ts = payload && typeof payload.ts === "number" ? payload.ts : Date.now();
    socket.emit("pong", { ts });
  });

  socket.on("disconnect", () => {
    if (currentRoomId) {
      socket.leave(currentRoomId);
    }
    currentRoomId = null;
    currentPlayerId = null;
  });
});

server.listen(port, () => {
  console.log(`ZhaJinHua server listening on http://localhost:${port}`);
});
