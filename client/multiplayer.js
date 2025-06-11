const socket = io("https://your-backend-url.onrender.com"); // Replace with live Render link
let roomID = "";

function createRoom() {
  roomID = document.getElementById("roomID").value;
  if (roomID) socket.emit("createRoom", roomID);
}

function joinRoom() {
  roomID = document.getElementById("roomID").value;
  if (roomID) socket.emit("joinRoom", roomID);
}

socket.on("roomUpdate", (players) => {
  document.getElementById("playersList").innerText = `Players: ${players.length}`;
});

function rollDice() {
  const value = Math.floor(Math.random() * 6) + 1;
  socket.emit("rollDice", { roomID, value });
}

socket.on("diceRolled", (value) => {
  document.getElementById("dice-result").innerText = `🎲 ${value}`;
});
