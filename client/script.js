// ----- socket setup -----
const socket = io("https://indianludoraja.onrender.com"); // <— your Render URL
let playerColor = null;        // 'red' or 'yellow'
let myTurn = false;
let currentDice = 0;
let roomId = "";

const COLORS = { red: "#e74c3c", yellow: "#f1c40f" };
const TOKEN_RADIUS = 15;

// board path (0‑57) simplified — array of [x,y] tile centres on 15x15 canvas grid
const path = [];
(function buildPath() {
  const grid = 40;            // each square 40×40 px
  const baseX = 7, baseY = 13; // start for red
  // Straight line demo path round the board
  for (let i = 0; i < 58; i++) {
    const x = (i % 15);
    const y = Math.floor(i / 15);
    path.push([grid * (x + 1), grid * (y + 1)]);
  }
})();

let tokens = { red: 0, yellow: 0 }; // position index per colour

// ----- DOM shortcuts -----
const $ = (id) => document.getElementById(id);
const ctx = $("board").getContext("2d");

// -------------- Lobby ----------------
function createRoom() {
  roomId = $("room").value || Math.floor(10000 + Math.random() * 90000).toString();
  socket.emit("createRoom", roomId);
}
function joinRoom() {
  roomId = $("room").value;
  if (!roomId) return alert("Enter a room ID first");
  socket.emit("joinRoom", roomId);
}

// -------------- Game flow ------------
$("board").addEventListener("click", () => {
  if (!myTurn || currentDice === 0) return;
  moveToken(playerColor);
  socket.emit("move", { roomId, color: playerColor, pos: tokens[playerColor] });
});

function rollDice() {
  if (!myTurn) return;
  socket.emit("roll", roomId);
}

function moveToken(col) {
  tokens[col] = Math.min(tokens[col] + currentDice, 57);
  currentDice = 0;
  myTurn = false;
  drawBoard();
  socket.emit("endTurn", roomId);
  checkWin();
}

function playAgain() {
  socket.emit("reset", roomId);
}

// -------------- Drawing --------------
function drawBoard() {
  ctx.clearRect(0, 0, 600, 600);
  // tiles
  ctx.strokeStyle = "#ccc";
  for (let i = 0; i < 15; i++) {
    ctx.beginPath();
    ctx.moveTo(40, 40 + i * 40);
    ctx.lineTo(600 - 40, 40 + i * 40);
    ctx.moveTo(40 + i * 40, 40);
    ctx.lineTo(40 + i * 40, 600 - 40);
    ctx.stroke();
  }
  // tokens
  Object.entries(tokens).forEach(([col, pos]) => {
    const [x, y] = path[pos];
    ctx.fillStyle = COLORS[col];
    ctx.beginPath();
    ctx.arc(x, y, TOKEN_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.stroke();
  });
}

// -------------- Socket events --------
socket.on("roomJoined", ({ color, message }) => {
  playerColor = color;
  $("lobbyMsg").innerText = message;
});
socket.on("gameStart", ({ turn }) => {
  $("lobby").classList.add("hidden");
  $("game").classList.remove("hidden");
  $("info").innerText = "";
  tokens = { red: 0, yellow: 0 };
  drawBoard();
  setTurn(turn);
});
socket.on("diceResult", ({ value, turn }) => {
  $("diceVal").innerText = value;
  currentDice = value;
  setTurn(turn);
});
socket.on("moveUpdate", ({ tokens: tkns }) => {
  tokens = tkns;
  drawBoard();
});
socket.on("turnUpdate", (turn) => setTurn(turn));
socket.on("win", (winner) => {
  $("info").innerText = (winner === playerColor) ? "🎉 You Win!" : "You Lose!";
  $("againBtn").classList.remove("hidden");
});
socket.on("resetGame", ({ turn }) => {
  tokens = { red: 0, yellow: 0 };
  $("againBtn").classList.add("hidden");
  $("diceVal").innerText = "";
  $("info").innerText = "";
  drawBoard();
  setTurn(turn);
});

function setTurn(turnColor) {
  myTurn = turnColor === playerColor;
  $("diceBtn").disabled = !myTurn;
  $("info").innerText = myTurn ? "Your turn" : "Opponent's turn";
}

drawBoard();

