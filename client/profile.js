const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const profileAvatar = document.getElementById('profileAvatar');
const profileName = document.getElementById('profileName');

let currentUserID = null;
let currentProfileData = {};

const profile = {
    init: () => {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                currentUserID = user.uid;
                loginBtn.style.display = 'none';
                logoutBtn.style.display = 'inline-block';
                // ✅ Firebase Firestore से डेटा लाओ
                const data = await profile.loadFirebaseProfile(user.uid);
                profile.updateUI(data);
            } else {
                currentUserID = null;
                currentProfileData = {};
                loginBtn.style.display = 'inline-block';
                logoutBtn.style.display = 'none';
                profile.updateUI({});
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
        ui.updateProfileUI(profileData);
        economy.updateUI(profileData);
    },

    getProfileName: () => currentProfileData.name || `Guest_${currentUserID ? currentUserID.substring(0, 5) : 'Unknown'}`,
    getPlayerID: () => currentUserID,
    setPlayerID: (socketID) => {
        if (!currentUserID) {
            currentUserID = socketID;
            multiplayer.requestProfile(socketID);
        }
    },

    // ✅ Firestore: Profile load
    async loadFirebaseProfile(uid) {
        const userRef = db.collection("users").doc(uid);
        const doc = await userRef.get();
        if (doc.exists) {
            return doc.data();
        } else {
            const newProfile = {
                name: firebase.auth().currentUser.displayName || "Player",
                coins: 100,
                xp: 0,
                level: 1,
                wins: 0
            };
            await userRef.set(newProfile);
            return newProfile;
        }
    },

    // ✅ Firestore: XP update
    async addXP(amount) {
        if (!currentUserID) return;
        const userRef = db.collection("users").doc(currentUserID);
        const doc = await userRef.get();
        if (doc.exists) {
            const data = doc.data();
            const newXP = (data.xp || 0) + amount;
            const newLevel = Math.floor(newXP / 100) + 1;
            await userRef.update({ xp: newXP, level: newLevel });
            profile.updateUI({ ...data, xp: newXP, level: newLevel });
        }
    },

    // ✅ Firestore: Coins update
    async addCoins(amount) {
        if (!currentUserID) return;
        const userRef = db.collection("users").doc(currentUserID);
        const doc = await userRef.get();
        if (doc.exists) {
            const data = doc.data();
            const newCoins = (data.coins || 0) + amount;
            await userRef.update({ coins: newCoins });
            profile.updateUI({ ...data, coins: newCoins });
        }
    }
};

window.profile = profile;
