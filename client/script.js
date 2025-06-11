/* --- CONFIG ------------------------------------------------------------ */
const SERVER = "https://indianludoraja.onrender.com"; // <- Render URL
/* ---------------------------------------------------------------------- */

const socket = io(SERVER);
const COLORS = ["red","yellow","green","blue"];
const HEX = {red:"#e74c3c",yellow:"#f1c40f",green:"#2ecc71",blue:"#3498db"};
const START_POS = {red:0,yellow:13,green:26,blue:39}; // starting tile index
const HOME_POS = 57;                                   // simple finish

let roomId="", myColor="", turn="red", dice=0, tokens={}, myTurn=false;

const ctx = document.getElementById("board").getContext("2d");

/* --- SIMPLE PATH (58 tiles in clockwise line) ------------------------- */
const path=[]; (function(){
  const g=40; for(let i=0;i<58;i++){
    const x=(i%14)+1, y=Math.floor(i/14)+1;
    path.push([g*x,g*y]);
  }
})();

/* --- DOM HELPERS ------------------------------------------------------ */
const $=id=>document.getElementById(id);
function show(el){el.classList.remove("hide")}
function hide(el){el.classList.add("hide")}

/* --- LOBBY ------------------------------------------------------------ */
function createRoom(){ roomId=$("room").value||rand(); socket.emit("createRoom",roomId); }
function joinRoom(){ roomId=$("room").value; if(roomId) socket.emit("joinRoom",roomId); }
function rand(){return Math.floor(10000+Math.random()*90000).toString();}

/* --- GAME FLOW -------------------------------------------------------- */
function rollDice(){ if(myTurn) socket.emit("roll",roomId); }
function playAgain(){ socket.emit("reset",roomId); }

document.getElementById("board").addEventListener("click",e=>{
  if(!myTurn||dice===0)return;
  const [mx,my]=[e.offsetX,e.offsetY];
  tokens[myColor].forEach((p,idx)=>{
    const [x,y]=p===-1?[40,40]:path[p];
    if(Math.hypot(mx-x,my-y)<18) socket.emit("move",{roomId,color:myColor,idx});
  });
});

/* --- DRAWING ---------------------------------------------------------- */
function draw(){
  ctx.clearRect(0,0,640,640);
  /* board grid */
  ctx.strokeStyle="#ddd";
  for(let i=1;i<=14;i++){
    ctx.beginPath();
    ctx.moveTo(40,40*i); ctx.lineTo(600,40*i);
    ctx.moveTo(40*i,40); ctx.lineTo(40*i,600);
    ctx.stroke();
  }
  /* tokens */
  Object.entries(tokens).forEach(([c,arr])=>{
    ctx.fillStyle=HEX[c];
    arr.forEach(p=>{
      const [x,y]=p===-1 ? startXY(c) : path[p];
      ctx.beginPath(); ctx.arc(x,y,15,0,Math.PI*2); ctx.fill(); ctx.stroke();
    });
  });
}

function startXY(c){
  const map={red:[40,40],yellow:[600,40],green:[600,600],blue:[40,600]};
  return map[c];
}

/* --- SOCKET EVENTS ---------------------------------------------------- */
socket.on("roomJoined",({color,msg})=>{
  myColor=color; $("lobbyMsg").innerText=msg;
});
socket.on("gameStart",state=>{
  hide($("lobby")); show($("game"));
  initState(state);
});
socket.on("state",initState);

function initState(state){
  ({tokens,turn,dice}=state); draw();
  myTurn=turn===myColor;
  $("diceBtn").disabled=!myTurn;
  $("info").innerText=myTurn?"Your turn":"Opponent's turn";
  $("diceVal").innerText=dice||"";
  if(state.winner){
    $("info").innerText = state.winner===myColor?"🎉 You Win!":"You Lose!";
    show($("againBtn"));
  }else hide($("againBtn"));
}

/* --- INITIAL ---------------------------------------------------------- */
tokens = COLORS.reduce((obj,c)=>(obj[c]=new Array(4).fill(-1),obj),{});
draw();


