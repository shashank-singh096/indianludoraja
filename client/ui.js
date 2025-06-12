// client/ui.js
const ui = {
    init: () => {
        // DOM एलिमेंट्स को कैश करें
        ui.elements = {
            roomInput: document.getElementById('roomInput'),
            roomIdDisplay: document.getElementById('roomIdDisplay'),
            playersList: document.getElementById('playersList'),
            currentTurn: document.getElementById('currentTurn'),
            diceResult: document.getElementById('diceResult'),
            rollDiceBtn: document.getElementById('rollDiceBtn'),
            profileAvatar: document.getElementById('profileAvatar'),
            profileName: document.getElementById('profileName'),
            playerCoins: document.getElementById('playerCoins'),
            playerXP: document.getElementById('playerXP'),
            playerLevel: document.getElementById('playerLevel'),
            loginBtn: document.getElementById('loginBtn'),
            logoutBtn: document.getElementById('logoutBtn'),
            // ... अन्य UI एलिमेंट्स
        };

        // बटन क्लिक इवेंट्स अटैच करें
        ui.elements.rollDiceBtn.onclick = gameEngine.rollDice;
        ui.elements.loginBtn.onclick = profile.loginWithGoogle;
        ui.elements.logoutBtn.onclick = profile.logout;
        document.getElementById('sendChatBtn').onclick = () => {
            const message = document.getElementById('chatInput').value;
            if (message.trim()) {
                multiplayer.sendChatMessage(message);
                document.getElementById('chatInput').value = '';
            }
        };
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('sendChatBtn').click();
            }
        });
    },

    showAlert: (message) => {
        alert(message); // एक बेहतर टोस्ट नोटिफिकेशन सिस्टम यहाँ इस्तेमाल किया जा सकता है
    },

    updateRoomDisplay: (data) => {
        ui.elements.roomIdDisplay.innerText = `Room ID: ${data.roomID}`;
        ui.elements.playersList.innerText = `Players: ${data.players.length}`;
        ui.elements.rollDiceBtn.disabled = !data.gameStarted || (data.players[data.currentTurnIndex] !== multiplayer.getCurrentPlayerSocketID());
        ui.updateCurrentTurn(data.players[data.currentTurnIndex], data.players);
        // यदि tokenPositions दिया गया है, तो gameEngine को अपडेट करें
        if (data.tokenPositions) {
            gameEngine.setTokenStates(data.tokenPositions);
        }
    },

    updateDiceResult: (value) => {
        ui.elements.diceResult.innerText = `🎲 ${value === 0 ? '-' : value}`;
    },

    updateCurrentTurn: (nextTurnPlayerId, allPlayers) => {
        const myTurn = multiplayer.getCurrentPlayerSocketID() === nextTurnPlayerId;
        const currentPlayerColor = ui.getPlayerColor(nextTurnPlayerId, allPlayers);
        ui.elements.currentTurn.innerText = myTurn ? "🎯 Your Turn!" : `⏳ Waiting for ${currentPlayerColor}'s Turn...`;
        ui.elements.rollDiceBtn.disabled = !myTurn;
    },

    getPlayerColor: (socketId, playersArray = multiplayer.getAllPlayersInRoom()) => {
        const playerIndex = playersArray.indexOf(socketId);
        const colors = ['red', 'green', 'blue', 'yellow'];
        return colors[playerIndex] || 'Unknown';
    },

    selectToken: (tokenId) => {
        const tokenEl = document.getElementById(tokenId);
        if (tokenEl) tokenEl.classList.add('selected');
    },

    unselectToken: (tokenId) => {
        const tokenEl = document.getElementById(tokenId);
        if (tokenEl) tokenEl.classList.remove('selected');
    },

    moveToken: (tokenId, coords) => {
        const tokenEl = document.getElementById(tokenId);
        if (tokenEl) {
            tokenEl.style.left = `${coords.x}px`;
            tokenEl.style.top = `${coords.y}px`;
        }
    },

    updateProfileUI: (profileData) => {
        if (profileData) {
            ui.elements.profileAvatar.src = profileData.avatar || 'assets/default_avatar.png';
            ui.elements.profileName.innerText = profileData.name || `Guest_${profileData.userID.substring(0, 5)}`;
            ui.elements.playerCoins.innerText = profileData.coins || 0;
            ui.elements.playerXP.innerText = profileData.xp || 0;
            ui.elements.playerLevel.innerText = profileData.level || 1;
        }
    },

    // रूम बनाने/जुड़ने के लिए
    createGameRoom: () => {
        const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        ui.elements.roomInput.value = newRoomId;
        multiplayer.createRoom(newRoomId);
    },
    joinGameRoom: () => {
        const roomIdInput = ui.elements.roomInput.value.trim();
        if (!roomIdInput) {
            ui.showAlert("Please enter a Room ID!");
            return;
        }
        multiplayer.joinRoom(roomIdInput.toUpperCase());
    },
    leaveGameRoom: () => {
        const currentRoom = multiplayer.getCurrentRoomID();
        if (currentRoom) {
            multiplayer.leaveRoom(currentRoom);
            ui.showAlert(`Left room ${currentRoom}`);
            ui.elements.roomIdDisplay.innerText = "Room ID: N/A";
            ui.elements.playersList.innerText = "Players: 0";
            ui.elements.currentTurn.innerText = "⏳ Waiting for players...";
            ui.elements.rollDiceBtn.disabled = true;
            ui.updateDiceResult(0);
            gameEngine.placeAllTokensOnBoard(); // टोकन को घर वापस भेजें
            if (typeof voice !== 'undefined' && typeof voice.cleanupVoiceChat === 'function') {
                voice.cleanupVoiceChat();
            }
            if (typeof chat !== 'undefined' && typeof chat.cleanupChat === 'function') {
                chat.cleanupChat();
            }
        } else {
            ui.showAlert("You are not in a room.");
        }
    }
};

window.ui = ui; // ग्लोबल एक्सेस के लिए
document.addEventListener('DOMContentLoaded', ui.init);
