// server/roomManager.js
const rooms = {}; // रूम डेटा स्टोर करें
const playerColors = ['red', 'green', 'blue', 'yellow'];

const initialTokenStates = {
    // आपके टोकन की प्रारंभिक स्थिति यहाँ
    red_token_1: { color: 'red', state: 'home', pathIndex: 0 },
    // ... अन्य सभी टोकन
};

function createRoom(io, socket, roomID) {
    if (rooms[roomID]) {
        socket.emit('alert', 'Room already exists. Please join or choose a different ID.');
        return;
    }
    if (Object.keys(rooms).length >= 100) { // मैक्स रूम लिमिट
        socket.emit('alert', 'Server is full, please try again later.');
        return;
    }

    rooms[roomID] = {
        players: [], // इसमें Socket.id स्टोर करें
        playerColors: {}, // socketId से कलर मैपिंग
        currentTurnIndex: 0,
        diceValue: 0,
        tokenStates: JSON.parse(JSON.stringify(initialTokenStates)), // डीप कॉपी
        gameStarted: false,
        activePlayerCount: 0,
        consecutiveSixes: {}, // हर खिलाड़ी के लिए लगातार 6s
        chatHistory: [], // इस रूम के लिए चैट हिस्ट्री
        gameHistory: [], // इस रूम के लिए गेम लॉग्स
        // ... अन्य रूम-विशिष्ट डेटा
    };

    rooms[roomID].players.push(socket.id);
    rooms[roomID].playerColors[socket.id] = playerColors[0];
    rooms[roomID].activePlayerCount++;
    rooms[roomID].consecutiveSixes[socket.id] = 0;
    socket.join(roomID);
    console.log(`Room ${roomID} created by ${socket.id}. Assigned color: ${playerColors[0]}`);

    updateRoomForAll(io, roomID);
}

function joinRoom(io, socket, roomID) {
    const room = rooms[roomID];
    if (!room) {
        socket.emit('alert', 'Room does not exist. Please create it or check ID.');
        return;
    }
    if (room.players.length >= 4) { // मैक्स 4 खिलाड़ी
        socket.emit('alert', 'Room is full.');
        return;
    }
    if (room.players.includes(socket.id)) {
        socket.emit('alert', 'You are already in this room.');
        return;
    }

    const assignedColor = playerColors[room.players.length];
    room.players.push(socket.id);
    room.playerColors[socket.id] = assignedColor;
    room.activePlayerCount++;
    room.consecutiveSixes[socket.id] = 0;
    socket.join(roomID);
    console.log(`User ${socket.id} joined room ${roomID}. Assigned color: ${assignedColor}`);

    updateRoomForAll(io, roomID);

    if (room.players.length === 4 && !room.gameStarted) {
        room.gameStarted = true;
        io.to(roomID).emit('alert', 'Game starting now!');
        // गेम स्टार्ट होने पर अन्य प्रारंभिक लॉजिक
    }
}

function leaveRoom(io, socket, roomID) {
    if (!rooms[roomID]) return;
    const room = rooms[roomID];
    socket.leave(roomID); // Socket.IO से रूम छोड़ें

    const playerIndex = room.players.indexOf(socket.id);
    if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        delete room.playerColors[socket.id];
        room.activePlayerCount--;
        delete room.consecutiveSixes[socket.id];
        console.log(`User ${socket.id} manually left room ${roomID}. Players left: ${room.players.length}`);

        // डिस्कनेक्ट हुए खिलाड़ी को सूचित करें (WebRTC cleanup के लिए)
        io.to(roomID).emit('playerDisconnected', socket.id);

        if (room.activePlayerCount === 0) {
            delete rooms[roomID];
            console.log(`Room ${roomID} is now empty and deleted.`);
        } else {
            // टर्न को एडजस्ट करें
            if (room.currentTurnIndex >= room.players.length) {
                room.currentTurnIndex = 0;
            }
            updateRoomForAll(io, roomID);
        }
    }
}

function handleDisconnect(io, socket) {
    for (const roomID in rooms) {
        const room = rooms[roomID];
        const playerIndex = room.players.indexOf(socket.id);
        if (playerIndex !== -1) {
            room.players.splice(playerIndex, 1);
            delete room.playerColors[socket.id];
            room.activePlayerCount--;
            delete room.consecutiveSixes[socket.id];
            console.log(`User ${socket.id} disconnected from room ${roomID}. Players left: ${room.players.length}`);

            // डिस्कनेक्ट हुए खिलाड़ी को सूचित करें (WebRTC cleanup के लिए)
            io.to(roomID).emit('playerDisconnected', socket.id);

            if (room.activePlayerCount === 0) {
                delete rooms[roomID];
                console.log(`Room ${roomID} is now empty and deleted.`);
            } else {
                // टर्न को एडजस्ट करें
                if (room.currentTurnIndex >= room.players.length) {
                    room.currentTurnIndex = 0;
                }
                updateRoomForAll(io, roomID);
            }
            break;
        }
    }
}

function updateRoomForAll(io, roomID) {
    const room = rooms[roomID];
    if (room) {
        io.to(roomID).emit('roomUpdate', {
            roomID: roomID,
            players: room.players,
            currentTurnIndex: room.currentTurnIndex,
            tokenPositions: room.tokenStates,
            gameStarted: room.gameStarted,
            chatHistory: room.chatHistory // चैट हिस्ट्री भी भेजें
        });
    }
}

function getRoom(roomID) {
    return rooms[roomID];
}

module.exports = {
    createRoom,
    joinRoom,
    leaveRoom,
    handleDisconnect,
    getRoom,
    updateRoomForAll,
    playerColors // इसे matchEngine द्वारा उपयोग करने के लिए एक्सपोर्ट करें
};
