const cv=document.getElementById("game"),ctx=cv.getContext("2d");
const scoreEl=document.getElementById("score"),timeEl=document.getElementById("time"),livesEl=document.getElementById("lives");
const levelEl=document.getElementById("level"),objEl=document.getElementById("objective"),screen=document.getElementById("screen"),start=document.getElementById("start"),msg=document.getElementById("msg");
const T=36,C=29,R=19,W=cv.width,H=cv.height;
const D={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}},OP={up:"down",down:"up",left:"right",right:"left"},ORDER=["up","left","down","right"];
const MAP_COUNT=10,ITEM_COUNT=16,KEY_COUNT=4;
const info=[{name:"Blinky",color:"#ef4444",mode:"direct",corner:{r:1,c:C-2}},{name:"Pinky",color:"#ff75b5",mode:"ahead",corner:{r:1,c:1}},{name:"Inky",color:"#40d9e8",mode:"vector",corner:{r:R-2,c:C-2}},{name:"Clyde",color:"#f59e0b",mode:"shy",corner:{r:R-2,c:1}}];
let map,player,ghosts,items,keys,exit,level=0,score=0,keysFound=0,lives=3,time=75,running=false,last=0,acc=0,exitHint=0;

function seeded(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function shuffled(values,random){let result=values.slice();for(let i=result.length-1;i>0;i--){let j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result}
function createMap(seed){
 let random=seeded(seed),grid=Array.from({length:R},()=>Array(C).fill("1")),stack=[{r:1,c:1}],directions=[{dr:-2,dc:0},{dr:2,dc:0},{dr:0,dc:-2},{dr:0,dc:2}];
 grid[1][1]="0";
 while(stack.length){
  let current=stack[stack.length-1],choices=shuffled(directions,random).filter(d=>{let r=current.r+d.dr,c=current.c+d.dc;return r>0&&r<R-1&&c>0&&c<C-1&&grid[r][c]=="1"});
  if(!choices.length){stack.pop();continue}
  let next=choices[0],nr=current.r+next.dr,nc=current.c+next.dc;grid[nr][nc]="0";grid[(current.r+nr)/2][(current.c+nc)/2]="0";stack.push({r:nr,c:nc})
 }
 for(let r=1;r<R-1;r++)for(let c=1;c<C-1;c++)if(grid[r][c]=="1"&&((r%2==1&&c%2==0)||(r%2==0&&c%2==1))&&random()<.24)grid[r][c]="0";
 return grid.map(row=>row.join(""))
}
const maps=Array.from({length:MAP_COUNT},(_,i)=>createMap(104729+i*7919));

function openCells(){let result=[];for(let r=0;r<R;r++)for(let c=0;c<C;c++)if(map[r][c]=="0")result.push({r,c});return result}
function can(r,c){return r>=0&&r<R&&c>=0&&c<C&&map[r][c]=="0"}
function cellKey(cell){return cell.r+","+cell.c}
function search(start){
 let distances=Array(R*C).fill(-1),previous=Array(R*C).fill(null),queue=[start],startIndex=start.r*C+start.c;
 distances[startIndex]=0;
 for(let i=0;i<queue.length;i++){
  let current=queue[i],currentIndex=current.r*C+current.c;
  for(let direction of ORDER){let step=D[direction],r=current.r+step.y,c=current.c+step.x;if(!can(r,c))continue;let index=r*C+c;if(distances[index]!==-1)continue;distances[index]=distances[currentIndex]+1;previous[index]=current;queue.push({r,c})}
 }
 return{distances,previous}
}
function findExit(start,starts){
 let {distances}=search(start),reserved=new Set(starts.map(cellKey)),candidates=openCells().filter(cell=>!reserved.has(cellKey(cell))&&distances[cell.r*C+cell.c]>=0);
 candidates.sort((a,b)=>distances[b.r*C+b.c]-distances[a.r*C+a.c]||b.r-a.r||b.c-a.c);
 return candidates[0]||{r:R-2,c:C-2}
}
function findPath(start,end){
 let {distances,previous}=search(start),path=[],current=end;
 if(distances[end.r*C+end.c]<0)return path;
 while(current){path.push(current);if(current.r==start.r&&current.c==start.c)break;current=previous[current.r*C+current.c]}
 return path.reverse()
}
function makeItems(path,cells,reserved){
 let selected=[],used=new Set(),random=seeded(7000+level*101);
 function add(cell){if(!cell||reserved.has(cellKey(cell))||used.has(cellKey(cell)))return;used.add(cellKey(cell));selected.push(cell)}
 for(let i=0;i<ITEM_COUNT;i++){let index=path.length?Math.min(path.length-1,Math.floor((i+1)*path.length/(ITEM_COUNT+1))):0;add(path[index])}
 for(let cell of shuffled(cells,random)){if(selected.length>=ITEM_COUNT)break;add(cell)}
 return selected.slice(0,ITEM_COUNT).map((cell,i)=>({...cell,type:i%4==0?"book":"coin",got:false}))
}
function makeKeys(path,cells,reserved,itemCells){
 let selected=[],used=new Set(itemCells.map(cellKey)),random=seeded(9100+level*131);
 function add(cell){if(!cell||reserved.has(cellKey(cell))||used.has(cellKey(cell)))return;used.add(cellKey(cell));selected.push(cell)}
 for(let i=0;i<KEY_COUNT;i++){let index=path.length?Math.min(path.length-1,Math.floor((i+1)*path.length/(KEY_COUNT+1))):0;add(path[index])}
 for(let cell of shuffled(cells,random)){if(selected.length>=KEY_COUNT)break;add(cell)}
 return selected.slice(0,KEY_COUNT).map(cell=>({...cell,got:false}))
}
function setup(){
 map=maps[level];let cells=openCells(),startCell={r:1,c:1},midRow=Math.floor((R-1)/2),midCol=Math.floor((C-1)/2),starts=[{r:midRow-2,c:midCol-5},{r:midRow-2,c:midCol+5},{r:midRow+2,c:midCol-5},{r:midRow+2,c:midCol+5}];
 exit=findExit(startCell,starts);keysFound=0;exitHint=0;player={...startCell,dir:"right",next:"right",inv:2.2,speed:8,progress:0};
 let path=findPath(startCell,exit),reserved=new Set([startCell,exit,...starts].map(cellKey));items=makeItems(path,cells,reserved);keys=makeKeys(path,cells,reserved,items);
 ghosts=info.map((g,i)=>({...g,r:starts[i].r,c:starts[i].c,dir:ORDER[(i+level)%4],cool:.2+i*.12}));
 time=75-level*3;levelEl.textContent=level+1;updateHUD()
}
function dist(a,b){return Math.hypot(a.c-b.c,a.r-b.r)}
function nearestOpen(r,c){let best=openCells()[0],bestDistance=Infinity;for(let cell of openCells()){let value=(cell.r-r)**2+(cell.c-c)**2;if(value<bestDistance){bestDistance=value;best=cell}}return best}
function options(g){let available=ORDER.filter(direction=>can(g.r+D[direction].y,g.c+D[direction].x)),forward=available.filter(direction=>direction!=OP[g.dir]);return forward.length?forward:available}
function target(g){
 let point;
 if(g.mode=="direct")point={r:player.r,c:player.c};
 else if(g.mode=="ahead"){let r=player.r,c=player.c,d=D[player.dir];for(let i=0;i<4;i++){r+=d.y;c+=d.x}point={r,c}}
 else if(g.mode=="shy")point=dist(g,player)>10?{r:player.r,c:player.c}:g.corner;
 else{let b=ghosts[0],p={r:player.r+2*D[player.dir].y,c:player.c+2*D[player.dir].x};point={r:p.r*2-b.r,c:p.c*2-b.c}}
 return nearestOpen(point.r,point.c)
}
function pathDistance(from,to){
 let distances=Array(R*C).fill(-1),queue=[to],toIndex=to.r*C+to.c;distances[toIndex]=0;
 for(let i=0;i<queue.length;i++){let current=queue[i],currentIndex=current.r*C+current.c;for(let direction of ORDER){let step=D[direction],r=current.r+step.y,c=current.c+step.x;if(!can(r,c))continue;let index=r*C+c;if(distances[index]!==-1)continue;distances[index]=distances[currentIndex]+1;queue.push({r,c})}}
 return distances[from.r*C+from.c]
}
function choose(g,goal){let available=options(g);if(!available.length)return OP[g.dir];let best=available[0],bestDistance=Infinity;for(let direction of available){let step=D[direction],next={r:g.r+step.y,c:g.c+step.x},value=pathDistance(next,goal);if(value<0)value=dist(next,goal);if(value<bestDistance||value==bestDistance&&direction==g.dir){bestDistance=value;best=direction}}return best}
function updateGhost(g,dt){
 g.cool-=dt;if(g.cool>0)return;g.cool=Math.max(.16,.25-level*.006);
 let oldR=g.r,oldC=g.c;g.dir=choose(g,target(g));let step=D[g.dir],r=g.r+step.y,c=g.c+step.x;
 if(can(r,c)){g.r=r;g.c=c}
 if(g.r==oldR&&g.c==oldC){let reverse=OP[g.dir];step=D[reverse];r=g.r+step.y;c=g.c+step.x;if(can(r,c)){g.dir=reverse;g.r=r;g.c=c}}
 if(player.inv<=0&&g.r==player.r&&g.c==player.c)hit()
}
function hit(){
 lives--;score=Math.max(0,score-150);player.inv=1.8;player.progress=0;show("Professor pegou você! -1 vida");
 if(lives<=0){end(false,"Você ficou sem vidas!");return}
 player.r=1;player.c=1;player.dir="right";player.next="right"
}
function collect(){
 items.forEach(item=>{if(!item.got&&item.r==player.r&&item.c==player.c){item.got=true;let value=item.type=="coin"?100:150;score+=value;show(item.type=="coin"?"+100 pontos!":"+150 pontos!")}});
 keys.forEach(key=>{if(!key.got&&key.r==player.r&&key.c==player.c){key.got=true;keysFound++;score+=200;show("Chave encontrada! "+keysFound+"/"+KEY_COUNT)}})
}
function next(){
 if(keysFound<KEY_COUNT){if(exitHint<=0){show("Faltam "+(KEY_COUNT-keysFound)+" chaves para a saída!");exitHint=1.5}return}
 if(level==maps.length-1){end(true,"Você escapou da prova!");return}
 score+=300;level++;setup();show("Fase "+(level+1)+"!")
}
function update(dt){
 if(exitHint>0)exitHint-=dt;acc+=dt;if(acc>=1){let seconds=Math.floor(acc);time-=seconds;acc-=seconds;if(time<=0){time=0;end(false,"O tempo acabou!");return}}
 if(player.inv>0)player.inv-=dt;movePlayer(dt);ghosts.forEach(g=>updateGhost(g,dt));collect();
 if(player.r==exit.r&&player.c==exit.c&&keysFound==KEY_COUNT)next();updateHUD()
}
function end(win,title){running=false;setTimeout(()=>{screen.classList.remove("hidden");screen.querySelector("h2").textContent=win?"Você conseguiu!":title;screen.querySelector("p").innerHTML=(win?"Você completou as 10 fases!":"Tente novamente e melhore sua pontuação.")+"<br><br><b>Pontuação: "+score+"</b>";start.textContent="JOGAR NOVAMENTE"},180)}
function updateHUD(){scoreEl.textContent=score;timeEl.textContent=time;livesEl.textContent="♥".repeat(lives)+"♡".repeat(3-lives);objEl.textContent=keysFound==KEY_COUNT?"Saída liberada!":"Chaves: "+keysFound+"/"+KEY_COUNT}
function show(text){msg.textContent=text;msg.classList.remove("hidden");clearTimeout(show.timer);show.timer=setTimeout(()=>msg.classList.add("hidden"),1200)}
function movePlayer(dt){
 player.progress+=dt*player.speed;let steps=Math.floor(player.progress);if(steps<=0)return;player.progress-=steps;
 for(let i=0;i<steps;i++){
  if(can(player.r+D[player.next].y,player.c+D[player.next].x))player.dir=player.next;
  let step=D[player.dir],r=player.r+step.y,c=player.c+step.x;
  if(!can(r,c))break;
   if(r==exit.r&&c==exit.c&&keysFound<KEY_COUNT){if(exitHint<=0){show("A saída está trancada! Colete as quatro chaves.");exitHint=1.5}break}
  player.r=r;player.c=c
 }
}
function loop(now){if(!running)return;let dt=Math.min((now-last)/1000,.05);last=now;update(dt);draw();requestAnimationFrame(loop)}
function begin(){if(running)return;level=0;score=0;lives=3;setup();running=true;screen.classList.add("hidden");last=performance.now();requestAnimationFrame(loop)}
start.onclick=begin;
addEventListener("keydown",e=>{let m={w:"up",arrowup:"up",s:"down",arrowdown:"down",a:"left",arrowleft:"left",d:"right",arrowright:"right"}[e.key.toLowerCase()];if(m&&running){player.next=m;e.preventDefault()}if(e.key=="Enter"&&!running)begin()});

function draw(){
 ctx.fillStyle="#0e182a";ctx.fillRect(0,0,W,H);
 for(let r=0;r<R;r++)for(let c=0;c<C;c++){let x=c*T,y=r*T;if(map[r][c]=="1"){ctx.fillStyle="#263b62";ctx.fillRect(x,y,T,T);ctx.strokeStyle="#34517f";ctx.strokeRect(x+2,y+2,T-4,T-4)}else{ctx.fillStyle=(r+c)%2?"#111e32":"#132238";ctx.fillRect(x,y,T,T)}}
  let unlocked=keysFound==KEY_COUNT,exitX=exit.c*T+4,exitY=exit.r*T+4;ctx.fillStyle=unlocked?"#56d68b":"#b85c52";round(exitX,exitY,T-8,T-8,7);ctx.fillStyle="#082016";ctx.font="bold 8px Arial";ctx.textAlign="center";ctx.fillText(unlocked?"SAÍDA":"FECHADA",exit.c*T+T/2,exit.r*T+T/2+3);ctx.textAlign="left";
  items.forEach(item=>{if(!item.got)item.type=="coin"?coin(item.c*T+T/2,item.r*T+T/2):book(item.c*T+T/2,item.r*T+T/2)});keys.forEach(key=>{if(!key.got)drawKey(key.c*T+T/2,key.r*T+T/2)});ghosts.forEach(ghost);hero()
}
function drawKey(x,y){ctx.save();ctx.strokeStyle="#ffd166";ctx.lineWidth=3;ctx.beginPath();ctx.arc(x-7,y-5,5,0,Math.PI*2);ctx.moveTo(x-3,y-1);ctx.lineTo(x+10,y+12);ctx.lineTo(x+13,y+9);ctx.lineTo(x+8,y+4);ctx.stroke();ctx.lineWidth=1;ctx.restore()}
function hero(){let x=player.c*T+T/2,y=player.r*T+T/2;if(player.inv>0&&Math.floor(player.inv*10)%2)return;ctx.fillStyle="#5da9ff";round(x-10,y-2,20,17,5);ctx.fillStyle="#efb58d";ctx.beginPath();ctx.arc(x,y-8,8,0,7);ctx.fill();ctx.fillStyle="#28202c";ctx.beginPath();ctx.arc(x,y-10,8,Math.PI,7);ctx.fill();ctx.fillStyle="#ffd166";round(x-13,y,5,13,2)}
function ghost(g){let x=g.c*T+T/2,y=g.r*T+T/2;ctx.fillStyle=g.color;round(x-12,y-9,24,24,9);ctx.beginPath();ctx.arc(x,y-2,12,Math.PI,0);ctx.fill();ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(x-5,y-3,4,0,7);ctx.arc(x+5,y-3,4,0,7);ctx.fill();ctx.fillStyle="#182033";ctx.beginPath();ctx.arc(x-5,y-3,2,0,7);ctx.arc(x+5,y-3,2,0,7);ctx.fill();ctx.font="bold 8px Arial";ctx.textAlign="center";ctx.fillText(g.name,x,y+28);ctx.textAlign="left"}
function coin(x,y){ctx.fillStyle="#ffd166";ctx.beginPath();ctx.arc(x,y,9,0,7);ctx.fill();ctx.fillStyle="#8d6500";ctx.font="bold 11px Arial";ctx.textAlign="center";ctx.fillText("$",x,y+4);ctx.textAlign="left"}
function book(x,y){ctx.fillStyle="#9d7cff";round(x-10,y-8,20,16,3);ctx.fillStyle="#eee8ff";ctx.fillRect(x-1,y-7,2,14)}
function round(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();ctx.fill()}
setup();draw();
