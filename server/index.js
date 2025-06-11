const express=require("express"),cors=require("cors"),
      http=require("http"),{Server}=require("socket.io");

const app=express(); app.use(cors());
const server=http.createServer(app);
const io=new Server(server,{cors:{origin:"*"}});
const START={red:0,yellow:13,green:26,blue:39}, HOME=57;

const rooms={};
function newGame(){
  const t={}; ["red","yellow","green","blue"].forEach(c=>t[c]=Array(4).fill(-1));
  return {players:[],turn:"red",dice:0,tokens:t,winner:null};
}

io.on("connection",sock=>{
  sock.on("createRoom",id=>{
    rooms[id]=newGame(); rooms[id].players.push({id:sock.id,color:"red"});
    sock.join(id); sock.emit("roomJoined",{color:"red",msg:`Room ${id} created.`});
  });

  sock.on("joinRoom",id=>{
    const g=rooms[id]; if(!g||g.players.length>=4) return;
    const used=g.players.map(p=>p.color);
    const col=["yellow","green","blue"].find(c=>!used.includes(c));
    g.players.push({id:sock.id,color:col}); sock.join(id);
    if(g.players.length>=2) io.to(id).emit("gameStart",g);
  });

  sock.on("roll",id=>{
    const g=rooms[id]; if(!g||g.winner) return;
    g.dice=Math.ceil(Math.random()*6);
    io.to(id).emit("state",g);
  });

  sock.on("move",({roomId:id,color,idx})=>{
    const g=rooms[id]; if(!g||g.turn!==color) return;
    let pos=g.tokens[color][idx];
    pos = pos===-1 ? START[color] : Math.min(pos+g.dice,HOME);
    g.tokens[color][idx]=pos; g.dice=0;
    if(pos===HOME && g.tokens[color].every(p=>p===HOME)) g.winner=color;
    if(g.dice!==6) g.turn=nextColor(g.turn,g);
    io.to(id).emit("state",g);
  });

  sock.on("reset",id=>{ if(rooms[id]) rooms[id]=newGame(); io.to(id).emit("gameStart",rooms[id]); });

  sock.on("disconnect",()=>{ for(const [id,g] of Object.entries(rooms)){
    g.players=g.players.filter(p=>p.id!==sock.id);
    if(g.players.length===0) delete rooms[id];
  }});
});

function nextColor(c,g){
  const order=["red","yellow","green","blue"];
  let i=(order.indexOf(c)+1)%4;
  while(!g.players.find(p=>p.color===order[i])) i=(i+1)%4;
  return order[i];
}
server.listen(process.env.PORT||3000,()=>console.log("Server on 3000"));


