// server/index.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
// CORS configuration
const allowedOrigins = ['http://localhost:3000']; // Add your Netlify frontend URL here after deployment!
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", // For development, allow all. In production, restrict to your frontend URL.
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Serve static files from the 'client' directory
app.use(express.static(path.join(__dirname, '../client'))); 

// Add a route for the root URL to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});


const rooms = {}; 

const initialTokenStates = {
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

const playerColors = ['red', 'green', 'blue', 'yellow'];

const LudoRules = {
    getPlayerColor: (room, socketId) => {
        return room.playerColors[socketId]; 
    },

    startCellIndex: {
        red: 0,     
        green: 13,  
        blue: 26,   
        yellow: 39  
    },

    isSafeSpot: (pathIndex) => {
        // These are example indices. Adjust them according to your specific board's safe spots.
        const safeSpots = [0, 8, 13, 21, 26, 34, 39, 47]; 
        return safeSpots.includes(pathIndex);
    },

    validateAndApplyMove: (roomState, playerSocketId, tokenToMoveId, steps) => {
        const { players, tokenStates } = roomState;
        const playerColor = LudoRules.getPlayerColor(roomState, playerSocketId);

        let currentTokenData = tokenStates[tokenToMoveId];

        if (!currentTokenData || currentTokenData.color !== playerColor) {
            return { isValid: false, message: "Invalid token selected or not your token." };
        }

        let newState = currentTokenData.state;
        let newPathIndex = currentTokenData.pathIndex;
        let killedTokenId = null;
        let isGameOver = false;
        let winnerPlayerId = null;
        let needsAnotherTurn = false; 

        // FEATURE 1: Token at home can only move out with a 6
        if (newState === 'home') {
            if (steps === 6) {
                newState = 'common';
                newPathIndex = LudoRules.startCellIndex[playerColor]; 
                needsAnotherTurn = true; 
            } else {
                return { isValid: false, message: "Need a 6 to move out of home!" };
            }
        } 
        else if (newState === 'common' || newState === 'home_stretch') {
            const commonPathLength = 52; 
            const homeStretchLength = 6; 

            let currentGlobalPathIndex;
            const entryToHomeStretchMap = {
                red: 51, green: 12, blue: 25, yellow: 38
            };
            const playerHomeStretchEntry = entryToHomeStretchMap[playerColor];

            if (newState === 'home_stretch') {
                currentGlobalPathIndex = playerHomeStretchEntry + 1 + currentTokenData.pathIndex;
            } else { 
                currentGlobalPathIndex = currentTokenData.pathIndex;
            }

            let nextGlobalPathIndex = currentGlobalPathIndex + steps;
            
            if (currentGlobalPathIndex <= playerHomeStretchEntry && nextGlobalPathIndex > playerHomeStretchEntry) {
                let stepsIntoHomeStretch = nextGlobalPathIndex - playerHomeStretchEntry - 1;
                
                if (stepsIntoHomeStretch < homeStretchLength) {
                    newState = 'home_stretch';
                    newPathIndex = stepsIntoHomeStretch;
                } else if (stepsIntoHomeStretch === homeStretchLength) {
                    newState = 'center';
                    newPathIndex = 0; 
                } else {
                    return { isValid: false, message: "Cannot move beyond center. Land exactly!" };
                }
            } else if (newState === 'home_stretch') {
                let potentialNewIndexInHomeStretch = currentTokenData.pathIndex + steps;
                if (potentialNewIndexInHomeStretch < homeStretchLength) {
                    newState = 'home_stretch';
                    newPathIndex = potentialNewIndexInHomeStretch;
                } else if (potentialNewIndexInHomeStretch === homeStretchLength) {
                    newState = 'center';
                    newPathIndex = 0; 
                } else {
                    return { isValid: false, message: "Cannot move beyond center. Land exactly!" };
                }
            } else { 
                if (currentTokenData.pathIndex + steps >= commonPathLength) {
                     return { isValid: false, message: "Invalid move: Overshot common path without home entry." };
                }
                newState = 'common';
                newPathIndex = currentTokenData.pathIndex + steps;
            }

            // FEATURE 2: Killing Logic with Safe Spots
            if (newState === 'common' && !LudoRules.isSafeSpot(newPathIndex)) {
                for (const otherTokenId in tokenStates) {
                    const otherTokenData = tokenStates[otherTokenId];
                    if (otherTokenId !== tokenToMoveId && otherTokenData.color !== playerColor && 
                        otherTokenData.state === 'common' && otherTokenData.pathIndex === newPathIndex) {
                        
                        killedTokenId = otherTokenId;
                        tokenStates[killedTokenId].state = 'home';
                        tokenStates[killedTokenId].pathIndex = 0; 
                        needsAnotherTurn = true; 
                        break;
                    }
                }
            }
        }
        
        // FEATURE 5: Check for Win Condition if token reaches center
        // Update the token's position in the server's game state first for the check
        tokenStates[tokenToMoveId].state = newState;
        tokenStates[tokenToMoveId].pathIndex = newPathIndex;

        if (newState === 'center') {
            const playerTokens = Object.values(tokenStates).filter(t => t.color === playerColor);
            const allAtCenter = playerTokens.every(t => t.state === 'center');
            if (allAtCenter) {
                isGameOver = true;
                winnerPlayerId = playerSocketId;
            }
            needsAnotherTurn = false; 
        }

        return { isValid: true, newPosition: { state: newState, pathIndex: newPathIndex }, killedTokenId, isGameOver, winnerPlayerId, needsAnotherTurn };
    },

    getNextTurnInfo: (roomState, currentDiceValue, moveResult) => {
        let nextTurnIndex = roomState.currentTurnIndex;
        let newDiceValue = 0; 
        
        // FEATURE 4: Track consecutive 6s
        if (currentDiceValue === 6) {
            roomState.consecutiveSixes[roomState.players[roomState.currentTurnIndex]] = 
                (roomState.consecutiveSixes[roomState.players[roomState.currentTurnIndex]] || 0) + 1;
        } else {
            roomState.consecutiveSixes[roomState.players[roomState.currentTurnIndex]] = 0;
        }

        // FEATURE 4: If 3 consecutive 6s, force turn pass
        if (roomState.consecutiveSixes[roomState.players[roomState.currentTurnIndex]] >= 3) {
            console.log(`Player ${roomState.players[roomState.currentTurnIndex]} rolled 3 consecutive 6s. Passing turn.`);
            nextTurnIndex = (roomState.currentTurnIndex + 1) % roomState.players.length;
            newDiceValue = 0;
            roomState.consecutiveSixes[roomState.players[roomState.currentTurnIndex]] = 0; 
        } 
        // FEATURE 1 & 2: Player gets another turn if they roll a 6 OR if they kill a token
        else if (currentDiceValue === 6 || moveResult.needsAnotherTurn) {
            newDiceValue = 0; 
        } else {
            nextTurnIndex = (roomState.currentTurnIndex + 1) % roomState.players.length;
            newDiceValue = 0; 
            roomState.consecutiveSixes[roomState.players[roomState.currentTurnIndex]] = 0; 
        }

        return { nextTurnIndex, newDiceValue };
    },

    // FEATURE 3: Check if a player has any valid moves
    hasValidMoves: (roomState, playerSocketId, diceValue) => {
        const playerColor = LudoRules.getPlayerColor(roomState, playerSocketId);
        const playerTokens = Object.values(roomState.tokenStates).filter(token => token.color === playerColor);

        for (const token of playerTokens) {
            let tempTokenState = { ...token }; 

            const simulatedResult = LudoRules.simulateMove(tempTokenState, playerColor, diceValue);
            
            if (simulatedResult.isValid) {
                return true; 
            }
        }
        return false; 
    },

    simulateMove: (tokenData, playerColor, steps) => {
        let tempState = tokenData.state;
        let tempPathIndex = tokenData.pathIndex;

        const commonPathLength = 52;
        const homeStretchLength = 6;
        const entryToHomeStretchMap = {
            red: 51, green: 12, blue: 25, yellow: 38
        };
        const playerHomeStretchEntry = entryToHomeStretchMap[playerColor];

        if (tempState === 'home') {
            if (steps === 6) {
                return { isValid: true, newState: 'common', newPathIndex: LudoRules.startCellIndex[playerColor] };
            } else {
                return { isValid: false }; 
            }
        }

        if (tempState === 'common' || tempState === 'home_stretch') {
            let currentGlobalPathIndex;
            if (tempState === 'home_stretch') {
                currentGlobalPathIndex = playerHomeStretchEntry + 1 + tempPathIndex;
            } else {
                currentGlobalPathIndex = tempPathIndex;
            }

            let nextGlobalPathIndex = currentGlobalPathIndex + steps;

            if (currentGlobalPathIndex <= playerHomeStretchEntry && nextGlobalPathIndex > playerHomeStretchEntry) {
                let stepsIntoHomeStretch = nextGlobalPathIndex - playerHomeStretchEntry - 1;
                if (stepsIntoHomeStretch <= homeStretchLength) { 
                    return { isValid: true, newState: stepsIntoHomeStretch === homeStretchLength ? 'center' : 'home_stretch', newPathIndex: stepsIntoHomeStretch === homeStretchLength ? 0 : stepsIntoHomeStretch };
                } else {
                    return { isValid: false }; 
                }
            } else if (tempState === 'home_stretch') {
                let potentialNewIndexInHomeStretch = tempPathIndex + steps;
                if (potentialNewIndexInHomeStretch <= homeStretchLength) { 
                    return { isValid: true, newState: potentialNewIndexInHomeStretch === homeStretchLength ? 'center' : 'home_stretch', newPathIndex: potentialNewIndexInHomeStretch === homeStretchLength ? 0 : potentialNewIndexInHomeStretch };
                } else {
                    return { isValid: false }; 
                }
            } else { 
                if (tempPathIndex + steps < commonPathLength) { 
                    return { isValid: true, newState: 'common', newPathIndex: tempPathIndex + steps };
                } else {
                    return { isValid: false }; 
                }
            }
        }
        return { isValid: false }; 
    }
};


io.on('connection', (socket) => {
    console.log(`🟢 User connected: ${socket.id}`);

    socket.on('createRoom', (roomID) => {
        if (rooms[roomID]) {
            socket.emit('alert', 'Room already exists. Please join or choose a different ID.');
            return;
        }
        if (Object.keys(rooms).length >= 100) { 
            socket.emit('alert', 'Server is full, please try again later.');
            return;
        }

        rooms[roomID] = {
            players: [], 
            playerColors: {}, 
            currentTurnIndex: 0,
            diceValue: 0,
            tokenStates: JSON.parse(JSON.stringify(initialTokenStates)), 
            gameStarted: false, 
            activePlayerCount: 0,
            consecutiveSixes: {} 
        };

        rooms[roomID].players.push(socket.id);
        rooms[roomID].playerColors[socket.id] = playerColors[0]; 
        rooms[roomID].activePlayerCount++;
        rooms[roomID].consecutiveSixes[socket.id] = 0;
        socket.join(roomID);
        console.log(`Room ${roomID} created by ${socket.id}. Assigned color: ${playerColors[0]}`);
        
        io.to(roomID).emit('roomUpdate', { 
            roomID, 
            players: rooms[roomID].players, 
            currentTurnIndex: rooms[roomID].currentTurnIndex,
            tokenPositions: rooms[roomID].tokenStates 
        });
    });

    socket.on('joinRoom', (roomID) => {
        if (!rooms[roomID]) {
            socket.emit('alert', 'Room does not exist. Please create it or check ID.');
            return;
        }
        const room = rooms[roomID];
        if (room.players.length >= 4) {
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
        
        io.to(roomID).emit('roomUpdate', { 
            roomID, 
            players: room.players, 
            currentTurnIndex: room.currentTurnIndex,
            tokenPositions: room.tokenStates 
        });

        if (room.players.length === 4) {
            room.gameStarted = true;
            io.to(roomID).emit('alert', 'Game starting now!');
        }
    });

    socket.on('rollDice', (data) => {
        const { roomID, value } = data;
        const room = rooms[roomID];

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

        const hasMoves = LudoRules.hasValidMoves(room, socket.id, value);

        if (!hasMoves) {
            console.log(`Player ${socket.id} in room ${roomID} has no valid moves. Passing turn.`);
            const { nextTurnIndex, newDiceValue } = LudoRules.getNextTurnInfo(room, value, { needsAnotherTurn: false }); 
            room.currentTurnIndex = nextTurnIndex;
            room.diceValue = newDiceValue;

            io.to(roomID).emit('tokenMoved', { 
                token: null, newState: null, newPathIndex: null, newDiceValue: room.diceValue, nextTurnPlayerId: room.players[room.currentTurnIndex], killedTokenId: null
            });
            socket.emit('alert', 'No valid moves, turn passed automatically.');
        }
    });

    socket.on('attemptMove', (data) => {
        const { roomID, tokenToMove, steps } = data; 
        const room = rooms[roomID];

        if (!room || room.players[room.currentTurnIndex] !== socket.id) {
            socket.emit('alert', 'Not your turn or invalid room state.');
            return;
        }
        if (room.diceValue === 0 || room.diceValue !== steps) { 
             socket.emit('alert', 'Dice value mismatch or dice not rolled. Try rolling again.');
             return;
        }

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
            }

        } else {
            socket.emit('alert', moveResult.message || 'Invalid move.');
        }
    });

    // --- WebRTC Signaling Events ---
    socket.on('webrtc_signal', (data) => {
        const { roomID, recipientId, senderId, signal } = data;
        // Forward the signal to the intended recipient in the same room
        if (rooms[roomID] && rooms[roomID].players.includes(recipientId)) {
            io.to(recipientId).emit('webrtc_signal', { senderId, signal });
            // console.log(`Relaying WebRTC signal from ${senderId} to ${recipientId} in room ${roomID}`);
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔴 User disconnected: ${socket.id}`);
        for (const roomID in rooms) {
            const room = rooms[roomID];
            const playerIndex = room.players.indexOf(socket.id);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1); 
                delete room.playerColors[socket.id]; 
                room.activePlayerCount--;
                delete room.consecutiveSixes[socket.id]; 

                console.log(`User ${socket.id} left room ${roomID}. Players left: ${room.players.length}`);

                // Inform other players in the room about the disconnect
                io.to(roomID).emit('playerDisconnected', socket.id); 

                if (room.activePlayerCount === 0) { 
                    delete rooms[roomID]; 
                    console.log(`Room ${roomID} is now empty and deleted.`);
                } else {
                    if (room.currentTurnIndex >= room.players.length) {
                        room.currentTurnIndex = 0; 
                    }
                    io.to(roomID).emit('roomUpdate', { 
                        roomID, 
                        players: room.players, 
                        currentTurnIndex: room.currentTurnIndex,
                        tokenPositions: room.tokenStates 
                    });
                }
                break;
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`Open your browser at http://localhost:${PORT}`);
});
