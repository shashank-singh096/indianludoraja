// server/database.js
const admin = require('firebase-admin');

// Firebase Admin SDK को इनिशियलाइज़ करें
// सुनिश्चित करें कि आपकी सर्विस अकाउंट कुंजी सुरक्षित रूप से संग्रहीत है (.env में पथ)
const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL // यदि आप रियलटाइम DB का उपयोग कर रहे हैं
});

const db = admin.firestore(); // Firestore का उपयोग करने के लिए

async function getUserProfile(userID) {
    try {
        const userRef = db.collection('users').doc(userID);
        const doc = await userRef.get();
        if (doc.exists) {
            return doc.data();
        } else {
            // यदि उपयोगकर्ता मौजूद नहीं है, तो एक नया प्रोफ़ाइल बनाएं
            const newProfile = {
                userID: userID,
                name: `Guest_${userID.substring(0, 5)}`,
                avatar: 'default_avatar.png',
                coins: 100,
                xp: 0,
                level: 1,
                wins: 0,
                losses: 0,
                gameHistory: []
            };
            await userRef.set(newProfile);
            return newProfile;
        }
    } catch (error) {
        console.error("Error getting/creating user profile:", error);
        return null;
    }
}

async function updateEconomyAndHistory(winnerID, loserIDs, scores, roomID) {
    try {
        const batch = db.batch();

        // विनर को अपडेट करें
        const winnerRef = db.collection('users').doc(winnerID);
        batch.update(winnerRef, {
            wins: admin.firestore.FieldValue.increment(1),
            coins: admin.firestore.FieldValue.increment(50), // उदाहरण इनाम
            xp: admin.firestore.FieldValue.increment(20), // उदाहरण XP
            gameHistory: admin.firestore.FieldValue.arrayUnion({
                roomID: roomID,
                date: new Date().toISOString(),
                result: 'win',
                scores: scores
            })
        });

        // हारने वालों को अपडेट करें
        for (const loserID of loserIDs) {
            const loserRef = db.collection('users').doc(loserID);
            batch.update(loserRef, {
                losses: admin.firestore.FieldValue.increment(1),
                coins: admin.firestore.FieldValue.increment(-10), // उदाहरण दंड
                xp: admin.firestore.FieldValue.increment(5), // हारने पर भी कुछ XP
                gameHistory: admin.firestore.FieldValue.arrayUnion({
                    roomID: roomID,
                    date: new Date().toISOString(),
                    result: 'loss',
                    scores: scores
                })
            });
        }

        await batch.commit();
        console.log("Economy and history updated successfully.");
        // TODO: लीडरबोर्ड डेटा को यहाँ अपडेट करें (या क्लाउड फ़ंक्शन के माध्यम से)

    } catch (error) {
        console.error("Error updating economy and history:", error);
    }
}

// लीडरबोर्ड फ़ंक्शंस (getLeaderboardData) भी यहाँ जाएंगे
async function getLeaderboardData(timeframe = 'allTime') {
    try {
        let query = db.collection('users').orderBy('wins', 'desc').limit(100); // शीर्ष 100
        // आप 'xp' या अन्य मेट्रिक्स द्वारा भी ऑर्डर कर सकते हैं
        const snapshot = await query.get();
        const leaderboard = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            leaderboard.push({
                userID: doc.id,
                name: data.name,
                avatar: data.avatar,
                wins: data.wins,
                xp: data.xp,
                // ... अन्य डेटा
            });
        });
        return leaderboard;
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        return [];
    }
}


module.exports = {
    getUserProfile,
    updateEconomyAndHistory,
    getLeaderboardData
};
