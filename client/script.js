console.log("IndianLudoRaja frontend loaded");

const socket = io("https://indianludoraja.onrender.com");

function createRoom() {
  const room = prompt("Enter Room Name:");
  if (room) {
    socket.emit("createRoom", room);
  }
}

function joinRoom() {
  const room = prompt("Enter Room Name to Join:");
  if (room) {
    socket.emit("joinRoom", room);
  }
}

socket.on("message", (msg) => {
  console.log("Server:", msg);
  document.getElementById("game").innerHTML = `<p>${msg}</p>`;
});
