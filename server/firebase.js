// server/firebase.js
const admin = require("firebase-admin");
const serviceAccount = require("./firebase-service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://indianludoraja.firebaseio.com"
});

const db = admin.firestore();

module.exports = db;
