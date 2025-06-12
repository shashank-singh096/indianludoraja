// server/index.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config(); // .env फ़ाइल से पर्यावरण चर लोड करें

// अपने अन्य सर्वर मॉड्यूल आयात करें
const roomManager = require('./roomManager');
const matchEngine = require('./matchEngine');
const database = require('./database'); // यदि आप Firebase/अन्य DB का उपयोग कर रहे हैं

const app = express();
const server = http.createServer(app);

// CORS कॉन्फ़िगरेशन - प्रोडक्शन में इसे अपनी Netlify URL तक सीमित करें
const allowedOrigins = [
    'http://localhost:3000', // लोकल डेवलपमेंट के लिए
    process.env.NETLIFY_FRONTEND_URL // आपकी Netlify URL यहाँ से आएगी .env में
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST"]
}));

const io = new Server(server, {
    cors: {
        origin: "*", // डेवलपमेंट के लिए सब अलाओ करें, प्रोडक्शन में अपनी Netlify URL पर सेट करें
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// 'client' डायरेक्टरी से स्टैटिक फ़ाइलें परोसें
app.use(express.static(path.join(__dirname, '../client')));

// रूट URL के लिए index.html परोसें
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

io.on('connection', (socket) => {
    console.log(`🟢 User connected: ${socket.id}`);

    // Room Management Events (from roomManager.js)
    socket.on('createRoom', (roomID) => roomManager.createRoom(io, socket, roomID));
    socket.on('joinRoom', (roomID) => roomManager.joinRoom(io, socket, roomID));
    socket.on('leaveRoom', (roomID) => roomManager.leaveRoom(io, socket, roomID)); // एक नया इवेंट

    // Game Play Events (from matchEngine.js)
    socket.on('rollDice', (data) => matchEngine.rollDice(io, socket, data));
    socket.on('attemptMove', (data) => matchEngine.attemptMove(io, socket, data));

    // WebRTC Signaling Events (from voice.js)
    socket.on('webrtc_signal', (data) => {
        const { roomID, recipientId, senderId, signal } = data;
        // सिग्नल को इच्छित प्राप्तकर्ता तक रिले करें
        io.to(recipientId).emit('webrtc_signal', { senderId, signal });
        // console.log(`Relaying WebRTC signal from ${senderId} to ${recipientId} in room ${roomID}`);
    });

    // Text Chat Events (from chat.js)
    socket.on('sendMessage', (data) => {
        const { roomID, message, senderName } = data;
        io.to(roomID).emit('newMessage', { sender: senderName, message, timestamp: new Date().toLocaleTimeString() });
    });

    // Profile & Economy Events (from database.js, profile.js, economy.js)
    // ये इवेंट्स Firebase/DB के साथ इंटरैक्ट करेंगे
    socket.on('requestProfile', async (userID) => {
        const profileData = await database.getUserProfile(userID);
        socket.emit('profileData', profileData);
    });
    // जब कोई गेम खत्म होता है, तो सर्वर पर इकोनॉमी अपडेट करें
    socket.on('gameOverServerUpdate', async (data) => {
        const { winnerID, loserIDs, roomID, scores } = data;
        await database.updateEconomyAndHistory(winnerID, loserIDs, scores, roomID);
        // खिलाड़ियों को अपडेटेड प्रोफाइल डेटा भेजें
        // io.to(roomID).emit('updateEconomyAndProfile', { winnerID, loserIDs, scores });
    });

    socket.on('disconnect', () => {
        console.log(`🔴 User disconnected: ${socket.id}`);
        roomManager.handleDisconnect(io, socket);
    });
});

server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`Open your browser at http://localhost:${PORT}`);
});
