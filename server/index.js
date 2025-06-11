const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

let users = {};        // socket.id => name
let rooms = {};        // room => [name1, name2]
let userRoom = {};     // socket.id => room
let coins = {};        // name => coin count

// Login handler
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('login', (name) => {
    users[socket.id] = name;
    coins[name] = coins[name] || 0;
  });

  // Room creation
  socket.on('create', (room) => {
    const name = users[socket.id];
    socket.join(room);
    rooms[room] = [name];
    userRoom[socket.id] = room;
  });

  // Join room
  socket.on('join', (room) => {
    const name = users[socket.id];
    if (!rooms[room]) rooms[room] = [];
    if (rooms[room].length >= 2) return;
    rooms[room].push(name);
    socket.join(room);
    userRoom[socket.id] = room;

    if (rooms[room].length === 2) {
      const turn = rooms[room][Math.floor(Math.random() * 2)];
      io.to(room).emit('roomReady', { room, turn });
    }
  });

  // Quick Match
  socket.on('quick', () => {
    const name = users[socket.id];
    let joined = false;

    for (let r in rooms) {
      if (rooms[r].length === 1) {
        rooms[r].push(name);
        socket.join(r);
        userRoom[socket.id] = r;
        const turn = rooms[r][Math.floor(Math.random() * 2)];
        io.to(r).emit('roomReady', { room: r, turn });
        joined = true;
        break;
      }
    }

    if (!joined) {
      const room = Math.random().toString().slice(2, 8);
      rooms[room] = [name];
      socket.join(room);
      userRoom[socket.id] = room;
    }
  });

  // Dice roll
  socket.on('roll', (data) => {
    const name = users[socket.id];
    coins[name] += Math.ceil(Math.random() * 10);
    io.to(data.room).emit('rollRes', data.v);
    socket.emit('reward', coins[name]);
  });

  // Chat
  socket.on('chat', (data) => {
    const name = users[socket.id];
    io.to(data.room).emit('chat', { sender: name, text: data.text });
  });

  // Leaderboard
  socket.on('getBoards', () => {
    const weekly = topPlayers();
    const monthly = topPlayers(); // Dummy data for now
    const yearly = topPlayers();  // Dummy data for now
    socket.emit('boards', { weekly, monthly, yearly });
  });

  // Voice Chat: WebRTC Signaling
  socket.on('voice-offer', (data) => {
    socket.to(data.room).emit('voice-offer', data);
  });

  socket.on('voice-answer', (data) => {
    socket.to(data.room).emit('voice-answer', data.answer);
  });

  // Disconnect cleanup
  socket.on('disconnect', () => {
    const name = users[socket.id];
    const room = userRoom[socket.id];
    if (room && rooms[room]) {
      rooms[room] = rooms[room].filter(n => n !== name);
      if (rooms[room].length === 0) delete rooms[room];
    }
    delete users[socket.id];
    delete userRoom[socket.id];
  });
});

// Simple leaderboard logic
function topPlayers() {
  return Object.entries(coins)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, c]) => ({ name, coins: c }));
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
