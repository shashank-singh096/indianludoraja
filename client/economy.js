// client/economy.js
const playerCoinsSpan = document.getElementById('playerCoins');
const playerXPSpan = document.getElementById('playerXP');
const playerLevelSpan = document.getElementById('playerLevel');

const economy = {
    updateUI: (profileData) => {
        if (profileData) {
            playerCoinsSpan.innerText = profileData.coins || 0;
            playerXPSpan.innerText = profileData.xp || 0;
            playerLevelSpan.innerText = profileData.level || 1;
        }
    },
    // भविष्य में यहाँ और इकोनॉमी-संबंधित लॉजिक हो सकता है, जैसे खरीदारी
};

window.economy = economy;
