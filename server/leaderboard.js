// server/leaderboard.js
const db = require('./firebase');

async function updateLeaderboard(playerId, playerName, score) {
  const playerRef = db.collection("leaderboard").doc(playerId);

  const doc = await playerRef.get();
  if (!doc.exists) {
    await playerRef.set({ name: playerName, score: score });
  } else {
    const existingScore = doc.data().score || 0;
    await playerRef.update({ score: existingScore + score });
  }
}

module.exports = { updateLeaderboard };
