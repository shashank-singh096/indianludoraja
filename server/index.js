const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const rooms = {}; // roomId -> game state

function createNewGame() {
  return {
    players: [],             // socket IDs
    turn: "red",
    tokens: { red: 0, yellow: 0 }
  };
}

io.on("connection", (socket) => {
  socket.on("createRoom", (roomId) => {
    rooms[roomId] = createNewGame();
    rooms[roomId].players.push({ id: socket.id, color: "red" });
    socket.join(roomId);
    socket.emit("roomJoined", { color: "red", message: `Room ${roomId} created.` });
  });

  socket.on("joinRoom", (roomId) => {
    const game = rooms[roomId];
    if (!game || game.players.length >= 2) {
      return socket.emit("roomJoined", { color: null, message: "Room full or invalid." });
    }
    game.players.push({ id: socket.id, color: "yellow" });
    socket.join(roomId);
    // Notify
    io.to(roomId).emit("gameStart", { turn: game.turn });
  });

  socket.on("roll", (roomId) => {
    const game = rooms[roomId];
    if (!game) return;
    const dice = Math.ceil(Math.random() * 6);
    io.to(roomId).emit("diceResult", { value: dice, turn: game.turn });
  });

  socket.on("move", ({ roomId, color, pos }) => {
    const game = rooms[roomId];
    if (!game) return;
    game.tokens[color] = pos;
    io.to(roomId).emit("moveUpdate", { tokens: game.tokens });
  });

  socket.on("endTurn", (roomId) => {
    const game = rooms[roomId];
    if (!game) return;
    game.turn = game.turn === "red" ? "yellow" : "red";
    io.to(roomId).emit("turnUpdate", game.turn);
  });

  socket.on("reset", (roomId) => {
    const game = rooms[roomId];
    if (!game) return;
    game.tokens = { red: 0, yellow: 0 };
    game.turn = "red";
    io.to(roomId).emit("resetGame", { turn: "red" });
  });

  socket.on("disconnect", () => {
    for (const [roomId, game] of Object.entries(rooms)) {
      game.players = game.players.filter(p => p.id !== socket.id);
      if (game.players.length === 0) delete rooms[roomId];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running on port", PORT));

