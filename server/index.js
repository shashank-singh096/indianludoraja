const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*"
  }
});

// Basic test socket event
io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

app.get("/", (req, res) => {
  res.send("Indian Ludo Raja backend is running!");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
