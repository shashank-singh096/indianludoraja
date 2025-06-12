// client/voice.js
let localStream;
let peerConnections = {}; // Key: socketId of remote peer, Value: RTCPeerConnection object
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]; // Public STUN server

const toggleMicBtn = document.getElementById('toggleMicBtn');
const voiceStatusDiv = document.getElementById('voiceStatus');
const remoteAudioContainer = document.getElementById('remoteAudioContainer');

let myRoomId = null;
let myPlayersInRoom = [];
let mySocketId = null;
let isMicMuted = true;

// 1. Initialize Voice Chat (called from multiplayer.js when room is joined)
function initVoiceChat(roomID, playersInRoom, currentSocketId) {
    myRoomId = roomID;
    myPlayersInRoom = playersInRoom;
    mySocketId = currentSocketId;

    toggleMicBtn.disabled = false;
    voiceStatusDiv.innerText = "Click 'Mute Mic' to start voice chat.";
    
    // Listen for mic toggle button clicks
    toggleMicBtn.onclick = toggleMic;
    
    // If we are in a room, try to get local media
    if (myRoomId) {
        getMedia();
    }
}

async function getMedia() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        // Mute local audio initially
        localStream.getAudioTracks()[0].enabled = false; 
        toggleMicBtn.classList.remove('unmuted');
        toggleMicBtn.innerText = '🎤 Unmute Mic';
        voiceStatusDiv.innerText = "Mic ready. Click to unmute.";
        console.log("Local audio stream obtained:", localStream);
    } catch (e) {
        console.error('Error getting user media (audio):', e);
        voiceStatusDiv.innerText = "Microphone access denied or error. Voice chat unavailable.";
        toggleMicBtn.disabled = true;
    }
}

function toggleMic() {
    if (localStream) {
        isMicMuted = !isMicMuted;
        localStream.getAudioTracks()[0].enabled = !isMicMuted;
        
        if (isMicMuted) {
            toggleMicBtn.innerText = '🎤 Unmute Mic';
            toggleMicBtn.classList.remove('unmuted');
            voiceStatusDiv.innerText = "Mic muted.";
            console.log("Mic muted.");
        } else {
            toggleMicBtn.innerText = '🔇 Mute Mic';
            toggleMicBtn.classList.add('unmuted');
            voiceStatusDiv.innerText = "Mic unmuted.";
            console.log("Mic unmuted.");
            // If we just unmuted, and not all peers are connected, try to connect
            connectToPeers();
        }
    } else {
        voiceStatusDiv.innerText = "Microphone not initialized.";
        getMedia(); // Try to get media again if not available
    }
}

// 2. Connect to other peers in the room
function connectToPeers() {
    if (!myRoomId || !localStream) {
        console.warn("Cannot connect to peers: Not in a room or no local stream.");
        return;
    }

    // Connect to all other players in the room (excluding self)
    myPlayersInRoom.forEach(peerSocketId => {
        if (peerSocketId !== mySocketId && !peerConnections[peerSocketId]) {
            createPeerConnection(peerSocketId);
        }
    });
}

async function createPeerConnection(peerSocketId) {
    console.log(`Creating RTCPeerConnection for ${peerSocketId}`);
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerConnections[peerSocketId] = pc;

    // Add local audio track to the peer connection
    localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
    });

    // Handle ICE candidates (network information)
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('webrtc_signal', {
                roomID: myRoomId,
                recipientId: peerSocketId,
                senderId: mySocketId,
                signal: { 'ice': event.candidate }
            });
        }
    };

    // Handle incoming media streams from remote peer
    pc.ontrack = (event) => {
        console.log(`Received remote stream from ${peerSocketId}`);
        const remoteAudio = document.createElement('audio');
        remoteAudio.autoplay = true;
        remoteAudio.controls = false; // Usually hide controls for background audio
        remoteAudio.id = `audio_${peerSocketId}`;
        remoteAudio.srcObject = event.streams[0];
        remoteAudioContainer.appendChild(remoteAudio);
    };

    // Create an offer (for initiating a call)
    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc_signal', {
            roomID: myRoomId,
            recipientId: peerSocketId,
            senderId: mySocketId,
            signal: { 'sdp': pc.localDescription }
        });
        console.log(`Offer sent to ${peerSocketId}`);
    } catch (e) {
        console.error('Error creating offer:', e);
    }
}

// 3. Handle WebRTC Signaling from Server
socket.on('webrtc_signal', async (data) => {
    const { senderId, signal } = data;

    if (senderId === mySocketId) return; // Ignore signals from self

    let pc = peerConnections[senderId];

    if (signal.sdp) {
        if (!pc) {
            // If we receive an offer and don't have a PC for this sender, create one (answerer)
            pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
            peerConnections[senderId] = pc;

            // Add local audio track to the peer connection (important for answering)
            localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream);
            });

            // Handle ICE candidates for this new PC
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('webrtc_signal', {
                        roomID: myRoomId,
                        recipientId: senderId,
                        senderId: mySocketId,
                        signal: { 'ice': event.candidate }
                    });
                }
            };

            // Handle incoming media streams
            pc.ontrack = (event) => {
                console.log(`Received remote stream from ${senderId}`);
                const remoteAudio = document.createElement('audio');
                remoteAudio.autoplay = true;
                remoteAudio.controls = false;
                remoteAudio.id = `audio_${senderId}`;
                remoteAudio.srcObject = event.streams[0];
                remoteAudioContainer.appendChild(remoteAudio);
            };
        }

        // Set remote description and create answer
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        if (signal.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('webrtc_signal', {
                roomID: myRoomId,
                recipientId: senderId,
                senderId: mySocketId,
                signal: { 'sdp': pc.localDescription }
            });
            console.log(`Answer sent to ${senderId}`);
        }
    } else if (signal.ice) {
        if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.ice));
            console.log(`ICE candidate added from ${senderId}`);
        }
    }
});

// Handle player disconnects (clean up peer connection)
socket.on('playerDisconnected', (disconnectedSocketId) => {
    console.log(`Player ${disconnectedSocketId} disconnected. Cleaning up RTC connection.`);
    if (peerConnections[disconnectedSocketId]) {
        peerConnections[disconnectedSocketId].close();
        delete peerConnections[disconnectedSocketId];
    }
    const remoteAudioEl = document.getElementById(`audio_${disconnectedSocketId}`);
    if (remoteAudioEl) {
        remoteAudioEl.remove();
    }
    // Update myPlayersInRoom array
    myPlayersInRoom = myPlayersInRoom.filter(id => id !== disconnectedSocketId);
});


// Cleanup function when leaving a room or disconnecting
function cleanupVoiceChat() {
    console.log("Cleaning up voice chat resources.");
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    for (const peerId in peerConnections) {
        if (peerConnections[peerId]) {
            peerConnections[peerId].close();
        }
    }
    peerConnections = {};
    remoteAudioContainer.innerHTML = ''; // Clear remote audio elements
    toggleMicBtn.disabled = true;
    toggleMicBtn.innerText = '🎤 Mute Mic';
    toggleMicBtn.classList.remove('unmuted');
    voiceStatusDiv.innerText = "";
    myRoomId = null;
    myPlayersInRoom = [];
    mySocketId = null;
    isMicMuted = true;
}

// Make initVoiceChat and cleanupVoiceChat globally accessible if needed by multiplayer.js
window.initVoiceChat = initVoiceChat;
window.cleanupVoiceChat = cleanupVoiceChat;
