// client/multiplayer.js
const socket = io(process.env.NODE_ENV === 'production' ? 'YOUR_RENDER_BACKEND_URL' : 'http://localhost:3000');

let currentRoomID = null;
let currentPlayerSocketID = null;
let allPlayersInRoom = [];
let gameStarted = false;

const multiplayer = {
    init: () => {
        socket.on('connect', () => {
            currentPlayerSocketID = socket.id;
            console.log("Connected to server. My Socket ID:", currentPlayerSocketID);
            profile.setPlayerID(currentPlayerSocketID); // प्रोफ़ाइल को अपना ID बताएं
        });

        socket.on("roomUpdate", (data) => {
            currentRoomID = data.roomID;
            allPlayersInRoom = data.players;
            gameStarted = data.gameStarted;
            ui.updateRoomDisplay(data); // UI को अपडेट करने के लिए ui.js को कॉल करें
            
            // वॉयस चैट को रूम की जानकारी दें
            if (typeof voice !== 'undefined' && typeof voice.initVoiceChat === 'function') {
                 voice.initVoiceChat(currentRoomID, allPlayersInRoom, currentPlayerSocketID);
            }
            // टेक्स्ट चैट को रूम की जानकारी और हिस्ट्री दें
            if (typeof chat !== 'undefined' && typeof chat.initChat === 'function') {
                chat.initChat(currentRoomID, data.chatHistory || []);
            }
        });

        socket.on('alert', (message) => ui.showAlert(message));
        socket.on('diceRolled', (value) => gameEngine.handleDiceRoll(value));
        socket.on('tokenMoved', (data) => gameEngine.handleTokenMoved(data));
        socket.on('gameOver', (data) => gameEngine.handleGameOver(data));

        // WebRTC Signaling Events
        socket.on('webrtc_signal', (data) => {
            if (typeof voice !== 'undefined' && typeof voice.handleWebRTCSignal === 'function') {
                voice.handleWebRTCSignal(data);
            }
        });

        // Player Disconnect for WebRTC cleanup
        socket.on('playerDisconnected', (disconnectedSocketId) => {
            if (typeof voice !== 'undefined' && typeof voice.removePeerConnection === 'function') {
                voice.removePeerConnection(disconnectedSocketId);
            }
            ui.showAlert(`Player ${disconnectedSocketId.substring(0,4)} disconnected.`);
            // ui.updateRoomDisplay(currentRoomID, allPlayersInRoom.filter(id => id !== disconnectedSocketId)); // UI अपडेट
        });

        // Text Chat New Message
        socket.on('newMessage', (data) => chat.displayMessage(data.sender, data.message, data.timestamp));

        // Profile and Economy Updates
        socket.on('profileData', (data) => profile.updateUI(data));
        socket.on('economyUpdate', (data) => economy.updateUI(data)); // नया इवेंट

        socket.on('disconnect', () => {
            console.log("Disconnected from server.");
            if (typeof voice !== 'undefined' && typeof voice.cleanupVoiceChat === 'function') {
                voice.cleanupVoiceChat();
            }
            // अन्य क्लाइंट-साइड क्लीनअप
        });
    },

    createRoom: (roomID) => {
        socket.emit('createRoom', roomID);
    },
    joinRoom: (roomID) => {
        socket.emit('joinRoom', roomID);
    },
    leaveRoom: (roomID) => {
        socket.emit('leaveRoom', roomID);
    },
    rollDice: (value) => {
        socket.emit("rollDice", { roomID: currentRoomID, value });
    },
    attemptMove: (tokenToMove, steps) => {
        socket.emit("attemptMove", { roomID: currentRoomID, tokenToMove, steps });
    },
    sendWebRTCSignal: (recipientId, signal) => {
        socket.emit('webrtc_signal', {
            roomID: currentRoomID,
            recipientId: recipientId,
            senderId: currentPlayerSocketID,
            signal: signal
        });
    },
    sendChatMessage: (message) => {
        socket.emit('sendMessage', {
            roomID: currentRoomID,
            message: message,
            senderName: profile.getProfileName() // प्रोफ़ाइल से नाम प्राप्त करें
        });
    },
    requestProfile: (userID) => {
        socket.emit('requestProfile', userID);
    },
    getCurrentRoomID: () => currentRoomID,
    getCurrentPlayerSocketID: () => currentPlayerSocketID,
    getAllPlayersInRoom: () => allPlayersInRoom,
    isGameStarted: () => gameStarted,
    getRoomPlayers: () => allPlayersInRoom // to be used by gameEngine, ui etc.
};

// ग्लोबल एक्सेस के लिए
window.multiplayer = multiplayer;
