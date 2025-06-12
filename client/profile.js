// client/profile.js
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const profileAvatar = document.getElementById('profileAvatar');
const profileName = document.getElementById('profileName');

let currentUserID = null;
let currentProfileData = {};

const profile = {
    init: () => {
        // Firebase Auth Listener
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                currentUserID = user.uid;
                loginBtn.style.display = 'none';
                logoutBtn.style.display = 'inline-block';
                // सर्वर से प्रोफ़ाइल डेटा का अनुरोध करें
                multiplayer.requestProfile(user.uid);
            } else {
                currentUserID = null;
                currentProfileData = {};
                loginBtn.style.display = 'inline-block';
                logoutBtn.style.display = 'none';
                profile.updateUI({}); // UI को रीसेट करें
                ui.showAlert("Logged out. Game progress will not be saved.");
            }
        });
    },

    loginWithGoogle: async () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            await firebase.auth().signInWithPopup(provider);
            ui.showAlert("Logged in successfully!");
        } catch (error) {
            console.error("Google login error:", error);
            ui.showAlert("Login failed: " + error.message);
        }
    },

    logout: async () => {
        try {
            await firebase.auth().signOut();
            ui.showAlert("Logged out.");
        } catch (error) {
            console.error("Logout error:", error);
            ui.showAlert("Logout failed: " + error.message);
        }
    },

    updateUI: (profileData) => {
        currentProfileData = profileData;
        ui.updateProfileUI(profileData); // ui.js को UI अपडेट करने के लिए कहें
        economy.updateUI(profileData); // economy.js को UI अपडेट करने के लिए कहें
    },

    getProfileName: () => currentProfileData.name || `Guest_${currentUserID ? currentUserID.substring(0, 5) : 'Unknown'}`,
    getPlayerID: () => currentUserID,
    setPlayerID: (socketID) => { // जब Socket.io कनेक्ट होता है, तो अपना ID सेट करें
        if (!currentUserID) { // यदि Google लॉगिन नहीं है, तो Socket.id को userID के रूप में उपयोग करें
            currentUserID = socketID;
            multiplayer.requestProfile(socketID); // गेस्ट प्रोफाइल लोड करें
        }
    }
};

window.profile = profile;
