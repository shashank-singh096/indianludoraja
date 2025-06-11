// client/offline.js

let players = ["red", "green", "yellow", "blue"];
let currentPlayerIndex = 0;
let diceValue = 0;

// Show current player turn
function updateTurnDisplay() {
  const currentPlayer = players[currentPlayerIndex];
  document.getElementById("current-turn").innerText = `Turn: ${capitalize(currentPlayer)}`;
}

// Roll dice
function rollDice() {
  diceValue = Math.floor(Math.random() * 6) + 1;
  document.getElementById("dice-result").innerText = `🎲 ${diceValue}`;
}

// Move token when clicked
function moveToken(color, number) {
  const currentPlayer = players[currentPlayerIndex];

  // Only allow current player's turn
  if (color !== currentPlayer) {
    alert(`It's ${capitalize(currentPlayer)}'s turn!`);
    return;
  }

  const token = document.getElementById(`${color}${number}`);
  const moveBy = diceValue * 30; // 30px * diceValue

  // Simple movement (horizontal demo only)
  token.style.transform = `translateX(${moveBy}px)`;

  // Next turn
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  updateTurnDisplay();
  diceValue = 0;
  document.getElementById("dice-result").innerText = "-";
}

// Helper
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

updateTurnDisplay();
