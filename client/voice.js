// client/voice.js
let localStream;
let peerConnections = {};
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

const toggleMicBtn = document.getElementById('toggleMicBtn');
const voiceStatusDiv = document.getElementById('voiceStatus');
const remoteAudioContainer = document.getElementById('remoteAudioContainer');

let myRoomId = null;
let myPlayersInRoom = [];
let mySocketId = null;
let isMicMuted = true;

const voice = {
    initVoiceChat: (roomID, playersInRoom, currentSocketId) => {
        myRoomId = roomID;
        myPlayersInRoom = playersInRoom;
        mySocketId = currentSocketId;

        toggleMicBtn.disabled = false;
        voiceStatusDiv.innerText = "Click 'Unmute Mic' to start voice chat.";

        toggleMicBtn.onclick = voice.toggleMic;

        voice.getMedia();
    },

    getMedia: async () => {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStream.getAudioTracks()[0].enabled = false; // शुरू में म्यूट करें
            toggleMicBtn.classList.remove('unmuted');
            toggleMicBtn.innerText = '🎤 Unmute Mic';
            voiceStatusDiv.innerText = "Mic ready. Click to unmute.";
        } catch (e) {
            console.error('Error getting user media (audio):', e);
            voiceStatusDiv.innerText = "Microphone access denied or error. Voice chat unavailable.";
            toggleMicBtn.disabled = true;
        }
    },

    toggleMic: () => {
        if (!localStream) {
            voice.getMedia(); // यदि स्ट्रीम नहीं है, तो पुनः प्राप्त करने का प्रयास करें
            return;
        }

        isMicMuted = !isMicMuted;
        localStream.getAudioTracks()[0].enabled = !isMicMuted;

        if (isMicMuted) {
            toggleMicBtn.innerText = '🎤 Unmute Mic';
            toggleMicBtn.classList.remove('unmuted');
            voiceStatusDiv.innerText = "Mic muted.";
        } else {
            toggleMicBtn.innerText = '🔇 Mute Mic';
            toggleMicBtn.classList.add('unmuted');
            voiceStatusDiv.innerText = "Mic unmuted.";
            voice.connectToPeers(); // अनम्यूट होने पर पीयर्स से कनेक्ट करें
        }
    },

    connectToPeers: () => {
        if (!myRoomId || !localStream) return;

        myPlayersInRoom.forEach(peerSocketId => {
            if (peerSocketId !== mySocketId && !peerConnections[peerSocketId]) {
                voice.createPeerConnection(peerSocketId);
            }
        });
    },

    createPeerConnection: async (peerSocketId) => {
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        peerConnections[peerSocketId] = pc;

        localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                multiplayer.sendWebRTCSignal(peerSocketId, { 'ice': event.candidate });
            }
        };

        pc.ontrack = (event) => {
            const remoteAudio = document.createElement('audio');
            remoteAudio.autoplay = true;
            remoteAudio.id = `audio_${peerSocketId}`;
            remoteAudio.srcObject = event.streams[0];
            remoteAudioContainer.appendChild(remoteAudio);
        };

        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            multiplayer.sendWebRTCSignal(peerSocketId, { 'sdp': pc.localDescription });
        } catch (e) {
            console.error('Error creating offer:', e);
        }
    },

    handleWebRTCSignal: async (data) => {
        const { senderId, signal } = data;
        if (senderId === mySocketId) return;

        let pc = peerConnections[senderId];

        if (signal.sdp) {
            if (!pc) {
                pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
                peerConnections[senderId] = pc;
                localStream.getTracks().forEach(track => {
                    pc.addTrack(track, localStream);
                });
                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        multiplayer.sendWebRTCSignal(senderId, { 'ice': event.candidate });
                    }
                };
                pc.ontrack = (event) => {
                    const remoteAudio = document.createElement('audio');
                    remoteAudio.autoplay = true;
                    remoteAudio.id = `audio_${senderId}`;
                    remoteAudio.srcObject = event.streams[0];
                    remoteAudioContainer.appendChild(remoteAudio);
                };
            }
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            if (signal.sdp.type === 'offer') {
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                multiplayer.sendWebRTCSignal(senderId, { 'sdp': pc.localDescription });
            }
        } else if (signal.ice) {
            if (pc) {
                await pc.addIceCandidate(new RTCIceCandidate(signal.ice));
            }
        }
    },

    removePeerConnection: (disconnectedSocketId) => {
        if (peerConnections[disconnectedSocketId]) {
            peerConnections[disconnectedSocketId].close();
            delete peerConnections[disconnectedSocketId];
        }
        const remoteAudioEl = document.getElementById(`audio_${disconnectedSocketId}`);
        if (remoteAudioEl) {
            remoteAudioEl.remove();
        }
    },

    cleanupVoiceChat: () => {
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
        remoteAudioContainer.innerHTML = '';
        toggleMicBtn.disabled = true;
        toggleMicBtn.innerText = '🎤 Mute Mic';
        toggleMicBtn.classList.remove('unmuted');
        voiceStatusDiv.innerText = "";
        myRoomId = null;
        myPlayersInRoom = [];
        mySocketId = null;
        isMicMuted = true;
    }
};

window.voice = voice;
