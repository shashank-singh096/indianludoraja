// firebase/firebase-config.js
// Firebase SDK को इनिशियलाइज़ करें
const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_FIREBASE_AUTH_DOMAIN",
    projectId: "YOUR_FIREBASE_PROJECT_ID",
    storageBucket: "YOUR_FIREBASE_STORAGE_BUCKET",
    messagingSenderId: "YOUR_FIREBASE_MESSAGING_SENDER_ID",
    appId: "YOUR_FIREBASE_APP_ID",
    measurementId: "YOUR_FIREBASE_MEASUREMENT_ID" // यदि आप Google Analytics का उपयोग कर रहे हैं
};

// Firebase को इनिशियलाइज़ करें
firebase.initializeApp(firebaseConfig);

// आवश्यक Firebase सेवाओं को एक्सपोर्ट करें
const auth = firebase.auth();
const db = firebase.firestore();

// Firestore के लिए सेटिंग्स (ऑप्शनल, डेवलपमेंट के दौरान सहायक)
// db.settings({ /* ... */ });
