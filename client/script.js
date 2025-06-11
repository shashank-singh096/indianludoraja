console.log("IndianLudoRaja frontend loaded");

function createRoom() {
  const room = document.getElementById("roomInput").value || Math.floor(100000 + Math.random() * 900000);
  document.getElementById("messageBox").innerHTML = `Room '${room}' created. Waiting for opponent...`;
  // Server emit logic here
}

function joinRoom() {
  const room = document.getElementById("roomInput").value;
  if (room) {
    document.getElementById("messageBox").innerHTML = `Joined Room '${room}'. Waiting for opponent...`;
    // Server emit logic here
  } else {
    alert("Please enter a valid Room ID!");
  }
}

function rollDice() {
  const roll = Math.floor(Math.random() * 6) + 1;
  document.getElementById("diceValue").textContent = roll;
  document.getElementById("turnMsg").textContent = "Opponent's turn";
}
