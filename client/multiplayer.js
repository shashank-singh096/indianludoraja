// client/multiplayer.js
const socket = io('http://localhost:3000'); 

let currentRoomID = null; 
let currentPlayerSocketID = null; 
let allPlayersInRoom = []; 
let currentTurnIndex = 0; 
let currentDiceValue = 0;   
let selectedTokenID = null; 

// --- Ludo Board Path Coordinates (YOU MUST CUSTOMIZE THIS!) ---
// These are illustrative coordinates. You MUST replace them with exact pixel coordinates
// from your specific Ludo board image to ensure tokens move correctly.
// Use tools or careful measurement to get precise X, Y values for each cell.
const homeBaseCoords = {
    red:    [{ x: 100, y: 100 }, { x: 130, y: 100 }, { x: 100, y: 130 }, { x: 130, y: 130 }],
    green:  [{ x: 500, y: 100 }, { x: 530, y: 100 }, { x: 500, y: 130 }, { x: 530, y: 130 }],
    blue:   [{ x: 500, y: 500 }, { x: 530, y: 500 }, { x: 500, y: 530 }, { x: 530, y: 530 }],
    yellow: [{ x: 100, y: 500 }, { x: 130, y: 500 }, { x: 100, y: 530 }, { x: 130, y: 530 }]
};

// Common Path Cells (52 cells) - INCOMPLETE EXAMPLE! YOU MUST COMPLETE THIS!
const commonPathCoords = [
    // Red's first cell (start point index 0 for red)
    { x: 275, y: 50 }, { x: 275, y: 85 }, { x: 275, y: 120 }, { x: 275, y: 155 }, { x: 275, y: 190 }, { x: 275, y: 225 }, // 0-5
    // Path continues... (YOU NEED TO MAP ALL 52 CELLS)
    { x: 240, y: 275 }, { x: 205, y: 275 }, { x: 170, y: 275 }, { x: 135, y: 275 }, { x: 100, y: 275 }, { x: 65, y: 275 }, // 6-11
    { x: 30, y: 310 }, // This might be Green's start (index 12 for green)
    { x: 65, y: 345 }, { x: 100, y: 345 }, { x: 135, y: 345 }, { x: 170, y: 345 }, { x: 205, y: 345 }, { x: 240, y: 345 }, // 13-19
    { x: 275, y: 380 }, { x: 275, y: 415 }, { x: 275, y: 450 }, { x: 275, y: 485 }, { x: 275, y: 520 }, { x: 275, y: 555 }, // 20-25
    { x: 310, y: 580 }, // This might be Blue's start (index 26 for blue)
    { x: 345, y: 555 }, { x: 345, y: 520 }, { x: 345, y: 485 }, { x: 345, y: 450 }, { x: 345, y: 415 }, { x: 345, y: 380 }, // 27-33
    { x: 380, y: 345 }, { x: 415, y: 345 }, { x: 450, y: 345 }, { x: 485, y: 345 }, { x: 520, y: 345 }, { x: 555, y: 345 }, // 34-40
    { x: 580, y: 310 }, // This might be Yellow's start (index 41 for yellow)
    { x: 555, y: 275 }, { x: 520, y: 275 }, { x: 485, y: 275 }, { x: 450, y: 275 }, { x: 415, y: 275 }, { x: 380, y: 275 }, // 42-48
    { x: 345, y: 240 }, { x: 345, y: 205 }, { x: 345, y: 170 }, { x: 345, y: 135 }, { x: 345, y: 100 }, { x: 345, y: 65 } // 49-54 (Example: Red's home path entry might be at 51)
];

// Player-specific Home Stretch Paths (6 cells for each color) - INCOMPLETE EXAMPLE! YOU MUST COMPLETE THIS!
const homeStretchCoords = {
    red:    [{ x: 310, y: 50 }, { x: 310, y: 85 }, { x: 310, y: 120 }, { x: 310, y: 155 }, { x: 310, y: 190 }, { x: 310, y: 225 }],
    green:  [{ x: 65, y: 310 }, { x: 100, y: 310 }, { x: 135, y: 310 }, { x: 170, y: 310 }, { x: 205, y: 310 }, { x: 240, y: 310 }],
    blue:   [{ x: 310, y: 555 }, { x: 310, y: 520 }, { x: 310, y: 485 }, { x: 310, y: 450 }, { x: 310, y: 415 }, { x: 310, y: 380 }],
    yellow: [{ x: 555, y: 310 }, { x: 520, y: 310 }, { x: 485, y: 310 }, { x: 450, y: 310 }, { x: 415, y: 310 }, { x: 380, y: 310 }]
};

const centerCoords = { x: 310, y: 310 }; // Center of the Ludo board

// Client-Side Token State (Synchronized with Server)
const tokenStates = {
    red_token_1: { color: 'red', state: 'home', pathIndex: 0 },
    red_token_2: { color: 'red', state: 'home', pathIndex: 1 },
    red_token_3: { color: 'red', state: 'home', pathIndex: 2 },
    red_token_4: { color: 'red', state: 'home', pathIndex: 3 },

    green_token_1: { color: 'green', state: 'home', pathIndex: 0 },
    green_token_2: { color: 'green', state: 'home', pathIndex: 1 },
    green_token_3: { color: 'green', state: 'home', pathIndex: 2 },
    green_token_4: { color: 'green', state: 'home', pathIndex: 3 },

    blue_token_1: { color: 'blue', state: 'home', pathIndex: 0 },
    blue_token_2: { color: 'blue', state: 'home', pathIndex: 1 },
    blue_token_3: { color: 'blue', state: 'home', pathIndex: 2 },
    blue_token_4: { color: 'blue', state: 'home', pathIndex: 3 },
    
    yellow_token_1: { color: 'yellow', state: 'home', pathIndex: 0 },
    yellow_token_2: { color: 'yellow', state: 'home', pathIndex: 1 },
    yellow_token_3: { color: 'yellow', state: 'home', pathIndex: 2 },
    yellow_token_4: { color: 'yellow', state: 'home', pathIndex: 3 },
};

function getCoordsForToken(tokenData) {
    const { color, state, pathIndex } = tokenData;
    switch (state) {
        case 'home': return homeBaseCoords[color][pathIndex];
        case 'common': return commonPathCoords[pathIndex];
        case 'home_stretch': return homeStretchCoords[color][pathIndex];
        case 'center': return centerCoords;
        default: return { x: 0, y: 0 }; 
    }
}

function placeAllTokensOnBoard() {
    for (const tokenId in tokenStates) {
        const tokenEl = document.getElementById(tokenId);
        const coords = getCoordsForToken(tokenStates[tokenId]);
        tokenEl.style.left = `${coords.x}px`;
        tokenEl.style.top = `${coords.y}px`;

        tokenEl.addEventListener('click', () => selectToken(tokenId));
    }
}

document.addEventListener('DOMContentLoaded', placeAllTokensOnBoard);

function generateRoomID() {
    return Math.random().toString(36).substring(2, 8).toUpperCase(); 
}

function createGameRoom() {
    const newRoomId = generateRoomID();
    currentRoomID = newRoomId; 
    socket.emit('createRoom', newRoomId);
    document.getElementById('roomInput').value = newRoomId; 
    document.getElementById('room-id-display').innerText = `Room ID: ${currentRoomID}`;
}

function joinGameRoom() {
    const roomIdInput = document.getElementById('roomInput').value.trim();
    if (!roomIdInput) {
        alert("Please enter a Room ID!");
        return;
    }
    currentRoomID = roomIdInput.toUpperCase(); 
    socket.emit('joinRoom', currentRoomID);
    document.getElementById('room-id-display').innerText = `Room ID: ${currentRoomID}`;
}

socket.on('connect', () => {
    currentPlayerSocketID = socket.id;
    console.log("Connected to server. My Socket ID:", currentPlayerSocketID);
});

socket.on("roomUpdate", (data) => {
    currentRoomID = data.roomID;
    allPlayersInRoom = data.players;
    currentTurnIndex = data.currentTurnIndex; 

    document.getElementById('room-id-display').innerText = `Room ID: ${currentRoomID}`;
    document.getElementById("playersList").innerText = `Players: ${allPlayersInRoom.length}`;
    updateTurnText();
    console.log("Room updated:", data);

    if (data.tokenPositions) {
        for (const tokenId in data.tokenPositions) {
            tokenStates[tokenId] = data.tokenPositions[tokenId];
        }
        placeAllTokensOnBoard(); 
    }
});

socket.on('alert', (message) => {
    alert(message);
});

function updateTurnText() {
    if (!currentRoomID || allPlayersInRoom.length === 0) {
        document.getElementById("current-turn").innerText = "Waiting for players...";
        return;
    }
    const myTurn = currentPlayerSocketID === allPlayersInRoom[currentTurnIndex];
    const currentPlayerColor = getPlayerColor(allPlayersInRoom[currentTurnIndex]);
    document.getElementById("current-turn").innerText = myTurn ? "🎯 Your Turn!" : `⏳ Waiting for ${currentPlayerColor}'s Turn...`;

    document.getElementById('rollDiceBtn').disabled = !myTurn;

    if (!myTurn) {
        if (selectedTokenID) {
            document.getElementById(selectedTokenID).classList.remove('selected');
            selectedTokenID = null;
        }
    }
}

function getPlayerColor(socketId) {
    const playerIndex = allPlayersInRoom.indexOf(socketId);
    const colors = ['red', 'green', 'blue', 'yellow']; 
    return colors[playerIndex] || 'Unknown';
}

function rollDice() {
    if (!currentRoomID) {
        alert("Please join or create a room first!");
        return;
    }
    if (currentPlayerSocketID !== allPlayersInRoom[currentTurnIndex]) {
        alert("Wait for your turn!");
        return;
    }
    if (currentDiceValue !== 0) { 
        alert("You've already rolled the dice! Now select a token.");
        return;
    }

    const value = Math.floor(Math.random() * 6) + 1;
    socket.emit("rollDice", { roomID: currentRoomID, value }); 
}

socket.on("diceRolled", (value) => {
    currentDiceValue = value;
    document.getElementById("dice-result").innerText = `🎲 ${value}`;
    
    if (selectedTokenID) {
        document.getElementById(selectedTokenID).classList.remove('selected');
        selectedTokenID = null;
    }
});

function selectToken(tokenId) {
    if (!currentRoomID) {
        alert("Please join a room first!");
        return;
    }
    const tokenColor = tokenId.split('_')[0]; 

    if (currentPlayerSocketID !== allPlayersInRoom[currentTurnIndex]) {
        alert("Not your turn!");
        return;
    }
    const myPlayerColor = getPlayerColor(currentPlayerSocketID);
    if (myPlayerColor !== tokenColor) { 
        alert("You can only move your own tokens!");
        return;
    }
    if (currentDiceValue === 0) {
        alert("Roll the dice first!");
        return;
    }

    if (selectedTokenID) {
        document.getElementById(selectedTokenID).classList.remove('selected');
    }

    selectedTokenID = tokenId;
    document.getElementById(tokenId).classList.add('selected');

    socket.emit("attemptMove", {
        roomID: currentRoomID,
        tokenToMove: tokenId,
        steps: currentDiceValue 
    });
}

socket.on("tokenMoved", (data) => {
    const { token, newState, newPathIndex, newDiceValue, nextTurnPlayerId, killedTokenId } = data;

    if (token) { 
        tokenStates[token].state = newState;
        tokenStates[token].pathIndex = newPathIndex;
        const tokenEl = document.getElementById(token);

        const targetCoords = getCoordsForToken(tokenStates[token]);
        if (targetCoords) {
            tokenEl.style.left = `${targetCoords.x}px`;
            tokenEl.style.top = `${targetCoords.y}px`;
        }
    }

    if (killedTokenId) {
        const killedTokenEl = document.getElementById(killedTokenId);
        tokenStates[killedTokenId].state = 'home';
        tokenStates[killedTokenId].pathIndex = 0; 
        const homeCoords = getCoordsForToken(tokenStates[killedTokenId]);
        if (homeCoords) {
            killedTokenEl.style.left = `${homeCoords.x}px`;
            killedTokenEl.style.top = `${homeCoords.y}px`;
        }
        console.log(`Token ${killedTokenId} was killed and sent home.`);
    }

    currentDiceValue = newDiceValue;
    document.getElementById("dice-result").innerText = `🎲 ${currentDiceValue === 0 ? '-' : currentDiceValue}`;

    currentTurnIndex = allPlayersInRoom.indexOf(nextTurnPlayerId); 
    updateTurnText();

    if (selectedTokenID) {
        document.getElementById(selectedTokenID).classList.remove('selected');
        selectedTokenID = null;
    }
});

socket.on('gameOver', ({ winnerPlayerId, winnerColor }) => {
    const winnerMessage = `${winnerColor.toUpperCase()} player wins!`;
    alert(`Game Over! ${winnerMessage}`);
    console.log(`Game Over! Winner: ${winnerColor}`);
});

// multiplayer.js अब voice.js को कुछ फंक्शन या वैरिएबल पास कर सकता है अगर आवश्यकता हो
// उदाहरण के लिए, जब खिलाड़ी एक कमरे में जुड़ता है, तो voice.js को सूचित करें
socket.on("roomUpdate", (data) => {
    currentRoomID = data.roomID;
    allPlayersInRoom = data.players;
    currentTurnIndex = data.currentTurnIndex; 

    document.getElementById('room-id-display').innerText = `Room ID: ${currentRoomID}`;
    document.getElementById("playersList").innerText = `Players: ${allPlayersInRoom.length}`;
    updateTurnText();
    console.log("Room updated:", data);

    if (data.tokenPositions) {
        for (const tokenId in data.tokenPositions) {
            tokenStates[tokenId] = data.tokenPositions[tokenId];
        }
        placeAllTokensOnBoard(); 
    }

    // वॉयस चैट को सूचित करें कि हम किस कमरे में हैं और खिलाड़ी कौन हैं
    if (typeof initVoiceChat === 'function') {
        initVoiceChat(currentRoomID, allPlayersInRoom, currentPlayerSocketID);
    }
});

socket.on('disconnect', () => {
    if (typeof cleanupVoiceChat === 'function') {
        cleanupVoiceChat();
    }
});
