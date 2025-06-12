// server/matchEngine.js
const roomManager = require('./roomManager');
// const database = require('./database'); // यदि आपको गेम समाप्त होने पर DB अपडेट करना है

const LudoRules = {
    // आपके सारे लूडो नियम यहाँ जाएंगे
    // जैसे: getPlayerColor, startCellIndex, isSafeSpot, validateAndApplyMove, getNextTurnInfo, hasValidMoves, simulateMove
    // यह वही लॉजिक है जो पिछली प्रतिक्रिया में server/index.js में था, बस यहाँ ले जाया गया है.
    getPlayerColor: (room, socketId) => room.playerColors[socketId],
    startCellIndex: { red: 0, green: 13, blue: 26, yellow: 39 },
    isSafeSpot: (pathIndex) => {
        const safeSpots = [0, 8, 13, 21, 26, 34, 39, 47]; // अपने बोर्ड के अनुसार समायोजित करें
        return safeSpots.includes(pathIndex);
    },
    // ... validateAndApplyMove, getNextTurnInfo, hasValidMoves, simulateMove के फंक्शन्स यहाँ
};

function rollDice(io, socket, data) {
    const { roomID, value } = data;
    const room = roomManager.getRoom(roomID);

    if (!room || room.players[room.currentTurnIndex] !== socket.id) {
        socket.emit('alert', 'Not your turn or invalid room.');
        return;
    }
    if (room.diceValue !== 0) {
        socket.emit('alert', 'Dice already rolled. Make a move.');
        return;
    }

    room.diceValue = value;
    io.to(roomID).emit('diceRolled', value);
    console.log(`Player ${socket.id} in room ${roomID} rolled: ${value}`);

    // जाँचें कि क्या खिलाड़ी के पास कोई वैध चाल है
    const hasMoves = LudoRules.hasValidMoves(room, socket.id, value);

    if (!hasMoves) {
        console.log(`Player ${socket.id} in room ${roomID} has no valid moves. Passing turn.`);
        const { nextTurnIndex, newDiceValue } = LudoRules.getNextTurnInfo(room, value, { needsAnotherTurn: false });
        room.currentTurnIndex = nextTurnIndex;
        room.diceValue = newDiceValue;

        // क्लाइंट को अपडेट करें कि टर्न पास हो गया है
        io.to(roomID).emit('tokenMoved', {
            token: null, newState: null, newPathIndex: null, newDiceValue: room.diceValue, nextTurnPlayerId: room.players[room.currentTurnIndex], killedTokenId: null
        });
        socket.emit('alert', 'No valid moves, turn passed automatically.');
    }
}

function attemptMove(io, socket, data) {
    const { roomID, tokenToMove, steps } = data;
    const room = roomManager.getRoom(roomID);

    if (!room || room.players[room.currentTurnIndex] !== socket.id) {
        socket.emit('alert', 'Not your turn or invalid room state.');
        return;
    }
    if (room.diceValue === 0 || room.diceValue !== steps) {
        socket.emit('alert', 'Dice value mismatch or dice not rolled. Try rolling again.');
        return;
    }

    // चाल को मान्य करें और लागू करें
    const moveResult = LudoRules.validateAndApplyMove(room, socket.id, tokenToMove, steps);

    if (moveResult.isValid) {
        const { nextTurnIndex, newDiceValue } = LudoRules.getNextTurnInfo(room, steps, moveResult);
        room.currentTurnIndex = nextTurnIndex;
        room.diceValue = newDiceValue;

        io.to(roomID).emit('tokenMoved', {
            token: tokenToMove,
            newState: moveResult.newPosition.state,
            newPathIndex: moveResult.newPosition.pathIndex,
            newDiceValue: room.diceValue,
            nextTurnPlayerId: room.players[room.currentTurnIndex],
            killedTokenId: moveResult.killedTokenId
        });
        console.log(`Token ${tokenToMove} moved in room ${roomID} by ${socket.id}`);

        if (moveResult.isGameOver) {
            const winnerColor = LudoRules.getPlayerColor(room, moveResult.winnerPlayerId);
            io.to(roomID).emit('gameOver', { winnerPlayerId: moveResult.winnerPlayerId, winnerColor });
            console.log(`Game Over in room ${roomID}. Winner: ${winnerColor}`);
            // TODO: गेम ओवर पर डेटाबेस अपडेट करने के लिए database.js का उपयोग करें
            // database.updateGameResult(roomID, moveResult.winnerPlayerId, room.players);
            roomManager.updateRoomForAll(io, roomID); // गेम ओवर के बाद रूम अपडेट करें
        }

    } else {
        socket.emit('alert', moveResult.message || 'Invalid move.');
    }
}

module.exports = {
    rollDice,
    attemptMove
};
