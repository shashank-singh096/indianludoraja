console.log("IndianLudoRaja frontend loaded");

const socket = io("https://indianludoraja.onrender.com"); // Render backend ka URL

// Room banane ka logic
function createRoom() {
  const room = prompt("Enter Room Name:");
  if (room) {
    socket.emit("createRoom", room);
  }
}

// Room join karne ka logic
function joinRoom() {
  const room = prompt("Enter Room Name to Join:");
  if (room) {
    socket.emit("joinRoom", room);
  }
}

// Server se message receive
socket.on("message", (msg) => {
  console.log("Server:", msg);
  alert(msg); // test alert
});

// Buttons add karne ke liye
document.body.innerHTML += `
  <button onclick="createRoom()">Create Room</button>
  <button onclick="joinRoom()">Join Room</button>
`;
