// server/index.js

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

let rooms = {};

io.on("connection", (socket) => {
  console.log(`🟢 User connected: ${socket.id}`);

  socket.on("createRoom", (roomID) => {
    if (!rooms[roomID]) rooms[roomID] = [];
    rooms[roomID].push(socket.id);
    socket.join(roomID);
    io.to(roomID).emit("roomUpdate", rooms[roomID]);
  });

  socket.on("joinRoom", (roomID) => {
    if (!rooms[roomID]) rooms[roomID] = [];
    rooms[roomID].push(socket.id);
    socket.join(roomID);
    io.to(roomID).emit("roomUpdate", rooms[roomID]);
  });

  socket.on("rollDice", ({ roomID, value }) => {
    io.to(roomID).emit("diceRolled", value);
  });

  socket.on("moveToken", ({ roomID, player, token, steps }) => {
    io.to(roomID).emit("tokenMoved", { player, token, steps });
  });

  socket.on("disconnect", () => {
    console.log(`🔴 User disconnected: ${socket.id}`);
    // Remove user from rooms
    for (const roomID in rooms) {
      rooms[roomID] = rooms[roomID].filter(id => id !== socket.id);
      io.to(roomID).emit("roomUpdate", rooms[roomID]);
    }
  });
});

server.listen(3000, () => {
  console.log("✅ Server running on http://localhost:3000");
});
