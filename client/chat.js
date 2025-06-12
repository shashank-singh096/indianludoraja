// client/chat.js
const chatMessagesDiv = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');

const chat = {
    initChat: (roomID, chatHistory) => {
        chat.cleanupChat(); // पुराना चैट साफ करें
        // पिछली चैट हिस्ट्री लोड करें
        chatHistory.forEach(msg => chat.displayMessage(msg.sender, msg.message, msg.timestamp));
        chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight; // सबसे नीचे स्क्रॉल करें
    },

    displayMessage: (sender, message, timestamp) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');
        messageElement.innerHTML = `<strong>${sender}</strong> (${timestamp}): ${message}`;
        chatMessagesDiv.appendChild(messageElement);
        chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight; // सबसे नीचे स्क्रॉल करें
    },

    cleanupChat: () => {
        chatMessagesDiv.innerHTML = ''; // सभी चैट संदेशों को साफ करें
    }
};

window.chat = chat;
