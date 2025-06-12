// client/leaderboard.js
const leaderboardTableBody = document.querySelector('#leaderboardTable tbody');

const leaderboard = {
    loadLeaderboard: async (timeframe) => {
        // यह यहाँ क्लाइंट-साइड पर डेटाबेस से सीधा अनुरोध कर रहा है,
        // लेकिन सुरक्षा और स्केलेबिलिटी के लिए, आपको इसे एक सर्वर-साइड API एंडपॉइंट के माध्यम से करना चाहिए.
        try {
            // उदाहरण: सर्वर से एक API कॉल
            // const response = await fetch(`/api/leaderboard?timeframe=${timeframe}`);
            // const data = await response.json();

            // अभी के लिए, सीधे डेटाबेस से (केवल डेवलपमेंट के लिए)
            const snapshot = await firebase.firestore().collection('users').orderBy('wins', 'desc').limit(50).get();
            const data = [];
            snapshot.forEach(doc => data.push(doc.data()));


            leaderboardTableBody.innerHTML = ''; // मौजूदा पंक्तियों को साफ करें

            data.forEach((player, index) => {
                const row = leaderboardTableBody.insertRow();
                row.insertCell(0).innerText = index + 1; // रैंक
                row.insertCell(1).innerText = player.name || `Guest_${player.userID.substring(0,5)}`;
                row.insertCell(2).innerText = player.wins || 0;
                row.insertCell(3).innerText = player.xp || 0;
            });
        } catch (error) {
            console.error("Error loading leaderboard:", error);
            ui.showAlert("Failed to load leaderboard.");
        }
    }
};

window.leaderboard = leaderboard;
