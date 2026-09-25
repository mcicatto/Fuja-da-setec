const cv=document.getElementById("game"),ctx=cv.getContext("2d");
const scoreEl=document.getElementById("score"),timeEl=document.getElementById("time"),livesEl=document.getElementById("lives");
const levelEl=document.getElementById("level"),objEl=document.getElementById("objective"),screen=document.getElementById("screen"),start=document.getElementById("start"),msg=document.getElementById("msg");
const T=40,C=22,R=13,W=cv.width,H=cv.height;
const D={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}},OP={up:"down",down:"up",left:"right",right:"left"},ORDER=["up","left","down","right"];
const maps=[
["1111111111111111111111","1000000000100000000001","1011111110101111111101","1010000010001000000101","1010111011101110110101","1000100000000000100001","1110101110111011101111","1000101000000010100001","1011101011111010111101","1000000010001000000001","1011111010101011111101","1000000000000000000001","1111111111111111111111"],
["1111111111111111111111","1000001000000001000001","1011101011110101110101","1010001000010100010101","1010111111010111110101","1000100000000000100001","1011101110111011101101","1000001010000010100001","1011111010111010111101","1000000010100000000001","1011111010101111111101","1000000000000000000001","1111111111111111111111"],
["1111111111111111111111","1000000000000000000001","1011111011111110111101","1000001000000010000001","1110101110111011101111","1000100000100000100001","1011101110101110101101","1000001010001000100001","1011111011111011111101","1000000000000010000001","1011111110111110111101","1000000000000000000001","1111111111111111111111"],
["1111111111111111111111","1000000010000001000001","1011111010111111011101","1010001010000010010101","1010111011111011110101","1000100000001000000101","1110101111101110111101","1000101000000000100001","1011101011111110101101","1000001000000010000001","1011111110111011111101","1000000000000000000001","1111111111111111111111"],
["1111111111111111111111","1000000000000000000001","1011110111111011111101","1000010000001000000001","1111011111101111110101","1000010000100000010101","1011110110111111010101","1000000100000000010001","1011111101111111111101","1000000001000000000001","1011111011011111111101","1000000000000000000001","1111111111111111111111"],
["1111111111111111111111","1000000000000000000001","1011111110111111111101","1000000010000000000001","1110111011111011111101","1000100000001010000001","1011101111101010111101","1000001000000010000001","1011111011111111110101","1000001000000000010101","1011111110111111010101","1000000000000000000001","1111111111111111111111"]
];
const info=[{name:"Blinky",color:"#ef4444",mode:"direct",corner:{r:1,c:C-2}},{name:"borzuk",color:"#ff75b5",mode:"ahead",corner:{r:1,c:1}},{name:"Inky",color:"#40d9e8",mode:"vector",corner:{r:R-2,c:C-2}},{name:"Clyde",color:"#f59e0b",mode:"shy",corner:{r:R-2,c:1}}];
let map,player,ghosts,items,level=0,score=0,lives=3,time=60,running=false,last=0,acc=0;

function openCells(){let a=[];for(let r=0;r<R;r++)for(let c=0;c<C;c++)if(map[r][c]=="0")a.push({r,c});return a}
function setup(){
 map=maps[level];let cells=openCells();
  player={...cells[Math.floor(cells.length*.08)],dir:"right",next:"right",inv:1.5,speed:8,progress:0};
 const starts=[{r:1,c:1},{r:1,c:C-2},{r:R-2,c:C-2},{r:R-2,c:1}];
 const safe=cells.filter(p=>Math.abs(p.r-player.r)+Math.abs(p.c-player.c)>5);
 items=safe.filter((p,i)=>i%Math.max(1,Math.floor(safe.length/8))==0).slice(0,8).map((p,i)=>({...p,type:i%3?"coin":"book",got:false}));
 ghosts=info.map((g,i)=>({...g,r:starts[i].r,c:starts[i].c,dir:ORDER[(i+level)%4],cool:.15+i*.12}));
  time=60-level*4;levelEl.textContent=level+1;updateHUD()
}
function can(r,c){return r>=0&&r<R&&c>=0&&c<C&&map[r][c]=="0"}
function movePlayer(dt){player.progress+=dt*player.speed;let steps=Math.floor(player.progress);if(steps<=0)return;player.progress-=steps;for(let i=0;i<steps;i++){if(can(player.r+D[player.next].y,player.c+D[player.next].x))player.dir=player.next;let d=D[player.dir];if(!can(player.r+d.y,player.c+d.x))break;player.r+=d.y;player.c+=d.x}}
function dist(a,b){return Math.hypot(a.c-b.c,a.r-b.r)}
function options(g){return ORDER.filter(d=>d!==OP[g.dir]&&can(g.r+D[d].y,g.c+D[d].x))}
/* IA dos quatro professores: cada um calcula seu bloco-alvo e escolhe a direção com menor distância euclidiana. */
function target(g){
 if(g.mode=="direct")return {r:player.r,c:player.c}; // Blinky
 if(g.mode=="ahead"){let r=player.r,c=player.c,d=D[player.dir];for(let i=0;i<4;i++){r+=d.y;c+=d.x}return {r,c}} // Pinky
 if(g.mode=="shy")return dist(g,player)>8?{r:player.r,c:player.c}:g.corner; // Clyde
 let b=ghosts[0],p={r:player.r+2*D[player.dir].y,c:player.c+2*D[player.dir].x}; // Inky
 return {r:p.r*2-b.r,c:p.c*2-b.c}
}
function choose(g,t){
 let os=options(g);if(!os.length)return g.dir;let best=os[0],bd=Infinity;
 for(const d of os){let n={r:g.r+D[d].y,c:g.c+D[d].x},v=dist(n,t);if(v<bd){bd=v;best=d}}
 return best
}
function updateGhost(g,dt){
 g.cool-=dt;if(g.cool>0)return;g.cool=.25;
 g.dir=choose(g,target(g));let d=D[g.dir];
 if(can(g.r+d.y,g.c+d.x)){g.r+=d.y;g.c+=d.x}
 if(player.inv<=0&&g.r==player.r&&g.c==player.c)hit()
}
function hit(){lives--;score=Math.max(0,score-150);player.inv=1.5;player.progress=0;show("Professor pegou você! -1 vida");if(lives<=0)return end(false,"Você ficou sem vidas!");player.r=1;player.c=1}
function collect(){items.forEach(i=>{if(!i.got&&i.r==player.r&&i.c==player.c){i.got=true;score+=i.type=="coin"?100:150;show(i.type=="coin"?"+100 pontos!":"+150 pontos!")}})}
function next(){if(level==5)return end(true,"Você escapou da prova!");score+=300;level++;setup();show("Fase "+(level+1)+"!")}
function update(dt){
 acc+=dt;if(acc>=1){let s=Math.floor(acc);time-=s;acc-=s;if(time<=0){time=0;return end(false,"O tempo acabou!")}}
 if(player.inv>0)player.inv-=dt;movePlayer(dt);ghosts.forEach(g=>updateGhost(g,dt));collect();
 let e={r:R-2,c:C-2};if(player.r==e.r&&player.c==e.c)next();updateHUD()
}
function end(win,title){running=false;setTimeout(()=>{screen.classList.remove("hidden");screen.querySelector("h2").textContent=win?"Você conseguiu!":title;screen.querySelector("p").innerHTML=(win?"Você completou as 6 fases!":"Tente novamente e melhore sua pontuação.")+"<br><br><b>Pontuação: "+score+"</b>";start.textContent="JOGAR NOVAMENTE"},180)}
function updateHUD(){scoreEl.textContent=score;timeEl.textContent=time;livesEl.textContent="♥".repeat(lives)+"♡".repeat(3-lives)}
function show(t){msg.textContent=t;msg.classList.remove("hidden");clearTimeout(show.t);show.t=setTimeout(()=>msg.classList.add("hidden"),900)}
function loop(now){if(!running)return;let dt=Math.min((now-last)/1000,.05);last=now;update(dt);draw();requestAnimationFrame(loop)}
function begin(){if(running)return;level=0;score=0;lives=3;setup();running=true;screen.classList.add("hidden");last=performance.now();requestAnimationFrame(loop)}
start.onclick=begin;
addEventListener("keydown",e=>{let m={w:"up",arrowup:"up",s:"down",arrowdown:"down",a:"left",arrowleft:"left",d:"right",arrowright:"right"}[e.key.toLowerCase()];if(m&&running){player.next=m;e.preventDefault()}if(e.key=="Enter"&&!running)begin()});

function draw(){
 ctx.fillStyle="#0e182a";ctx.fillRect(0,0,W,H);
 for(let r=0;r<R;r++)for(let c=0;c<C;c++){let x=c*T,y=r*T;if(map[r][c]=="1"){ctx.fillStyle="#263b62";ctx.fillRect(x,y,T,T);ctx.strokeStyle="#34517f";ctx.strokeRect(x+2,y+2,T-4,T-4)}else{ctx.fillStyle=(r+c)%2?"#111e32":"#132238";ctx.fillRect(x,y,T,T)}}
 const ex={r:R-2,c:C-2};ctx.fillStyle="#56d68b";round(ex.c*T+5,ex.r*T+5,30,30,7);ctx.fillStyle="#082016";ctx.font="bold 9px Arial";ctx.textAlign="center";ctx.fillText("SAÍDA",ex.c*T+20,ex.r*T+24);ctx.textAlign="left";
 items.forEach(i=>{if(!i.got)i.type=="coin"?coin(i.c*T+20,i.r*T+20):book(i.c*T+20,i.r*T+20)});ghosts.forEach(ghost);hero()
}
function hero(){let x=player.c*T+20,y=player.r*T+20;if(player.inv>0&&Math.floor(player.inv*10)%2)return;ctx.fillStyle="#5da9ff";round(x-10,y-2,20,17,5);ctx.fillStyle="#efb58d";ctx.beginPath();ctx.arc(x,y-8,8,0,7);ctx.fill();ctx.fillStyle="#28202c";ctx.beginPath();ctx.arc(x,y-10,8,Math.PI,7);ctx.fill();ctx.fillStyle="#ffd166";round(x-13,y,5,13,2)}
function ghost(g){let x=g.c*T+20,y=g.r*T+20;ctx.fillStyle=g.color;round(x-12,y-9,24,24,9);ctx.beginPath();ctx.arc(x,y-2,12,Math.PI,0);ctx.fill();ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(x-5,y-3,4,0,7);ctx.arc(x+5,y-3,4,0,7);ctx.fill();ctx.fillStyle="#182033";ctx.beginPath();ctx.arc(x-5,y-3,2,0,7);ctx.arc(x+5,y-3,2,0,7);ctx.fill();ctx.fillStyle="#fff";ctx.font="bold 8px Arial";ctx.textAlign="center";ctx.fillText(g.name,x,y+28);ctx.textAlign="left"}
function coin(x,y){ctx.fillStyle="#ffd166";ctx.beginPath();ctx.arc(x,y,9,0,7);ctx.fill();ctx.fillStyle="#8d6500";ctx.font="bold 11px Arial";ctx.textAlign="center";ctx.fillText("$",x,y+4);ctx.textAlign="left"}
function book(x,y){ctx.fillStyle="#9d7cff";round(x-10,y-8,20,16,3);ctx.fillStyle="#eee8ff";ctx.fillRect(x-1,y-7,2,14)}
function round(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();ctx.fill()}
setup();draw();