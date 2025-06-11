const socket = io("https://indianludoraja.onrender.com");

function createRoom() {
  const roomId = document.getElementById("roomInput").value;
  socket.emit("createRoom", roomId);
}

function joinRoom() {
  const roomId = document.getElementById("roomInput").value;
  socket.emit("joinRoom", roomId);
}

socket.on("roomJoined", (roomId) => {
  document.getElementById("status").innerText = `Joined Room '${roomId}'`;
});

socket.on("gameStart", (roomId) => {
  document.getElementById("status").innerText = `Both players joined Room '${roomId}'. Game will start!`;
});
