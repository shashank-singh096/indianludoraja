const SERVER = "https://indianludoraja.onrender.com";
const socket = io(SERVER);
let name = "", room = "", myTurn = false, coins = 0, level = 1, peerConnection, audioStream;
const $ = id => document.getElementById(id);

function login() {
  name = $("playerName").value.trim();
  if (!name) return alert("Enter name");
  $("loginPanel").classList.add('hidden');
  $("lobbyPanel").classList.remove('hidden');
  socket.emit('login', name);
  loadBoards();
  const params = new URLSearchParams(window.location.search);
  if (params.get('room')) {
    $("roomInput").value = params.get('room');
    joinRoom();
  }
}

function quickMatch() {
  socket.emit('quick');
  $("statusBox").innerText = "Searching for player…";
  $("shareBox").classList.add('hidden');
}

function createRoom() {
  room = $("roomInput").value || Math.random().toString().slice(2, 8);
  socket.emit('create', room);
  const link = `${location.origin}?room=${room}`;
  $("shareLink").value = link;
  $("shareBox").classList.remove('hidden');
}

function joinRoom() {
  room = $("roomInput").value;
  socket.emit('join', room);
  $("shareBox").classList.add('hidden');
}

function copyLink() {
  navigator.clipboard.writeText($("shareLink").value).then(() => alert("Link copied!"));
}

function rollDice() {
  if (!myTurn) return;
  const v = Math.ceil(Math.random() * 6);
  socket.emit('roll', { room, v });
  setTurn(false);
}

function setTurn(t) {
  myTurn = t;
  $("rollBtn").disabled = !t;
  $("turnInfo").innerText = t ? "Your turn" : "Opponent's turn";
}

function sendMsg() {
  const txt = $("msgInput").value.trim();
  if (!txt) return;
  socket.emit('chat', { room, text: txt });
  $("msgInput").value = '';
}

$("picker").addEventListener('emoji-click', e => {
  $("msgInput").value += " " + e.detail.unicode;
});

function startVoiceChat() {
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    audioStream = stream;
    peerConnection = new RTCPeerConnection();
    stream.getTracks().forEach(t => peerConnection.addTrack(t, stream));
    peerConnection.ontrack = e => {
      const audio = document.createElement('audio');
      audio.srcObject = e.streams[0];
      audio.autoplay = true;
      document.body.appendChild(audio);
    };
    peerConnection.createOffer().then(offer => {
      peerConnection.setLocalDescription(offer);
      socket.emit('voice-offer', { room, offer });
    });
  });
}

socket.on('voice-offer', data => {
  peerConnection = new RTCPeerConnection();
  peerConnection.ontrack = e => {
    const audio = document.createElement('audio');
    audio.srcObject = e.streams[0];
    audio.autoplay = true;
    document.body.appendChild(audio);
  };
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    stream.getTracks().forEach(t => peerConnection.addTrack(t, stream));
    peerConnection.setRemoteDescription(data.offer);
    peerConnection.createAnswer().then(ans => {
      peerConnection.setLocalDescription(ans);
      socket.emit('voice-answer', { room, answer: ans });
    });
  });
});

socket.on('voice-answer', ans => {
  peerConnection.setRemoteDescription(ans);
});

socket.on('roomReady', data => {
  room = data.room;
  $("lobbyPanel").classList.add('hidden');
  $("gamePanel").classList.remove('hidden');
  $("chatPanel").classList.remove('hidden');
  $("roomTitle").innerText = `Room ${room}`;
  setTurn(data.turn === name);
  $("startVoice").classList.remove('hidden');
});

socket.on('rollRes', v => {
  $("diceRes").innerText = `Rolled ${v}`;
  setTurn(true);
});

socket.on('chat', d => {
  $("messages").innerHTML += `<p><b>${d.sender}:</b> ${twemoji.parse(d.text)}</p>`;
  $("messages").scrollTop = $("messages").scrollHeight;
});

socket.on('reward', c => {
  coins = c;
  $("coinCount").innerText = coins;
  level = 1 + Math.floor(coins / 100);
  $("lvl").innerText = level;
});

socket.on('boards', b => {
  fillBoard("weeklyBoard", b.weekly);
  fillBoard("monthlyBoard", b.monthly);
  fillBoard("yearlyBoard", b.yearly);
});

function fillBoard(id, list) {
  const el = $(id);
  el.innerHTML = list.map(p => `<li>${p.name} - ${p.coins}</li>`).join('');
}
function loadBoards() {
  socket.emit('getBoards');
  $("leaderboardPanel").classList.remove('hidden');
}
