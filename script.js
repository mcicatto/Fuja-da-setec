const cv=document.getElementById("game"),ctx=cv.getContext("2d");
const scoreEl=document.getElementById("score"),timeEl=document.getElementById("time"),livesEl=document.getElementById("lives");
const levelEl=document.getElementById("level"),objEl=document.getElementById("objective"),screen=document.getElementById("screen"),start=document.getElementById("start"),msg=document.getElementById("msg");
const menuBg=document.getElementById("menuBg"),mctx=menuBg.getContext("2d");
const homeScreen=document.getElementById("homeScreen"),howScreen=document.getElementById("howScreen"),diffScreen=document.getElementById("diffScreen"),endScreen=document.getElementById("endScreen");
const howBtn=document.getElementById("howBtn"),backHow=document.getElementById("backHow"),backDiff=document.getElementById("backDiff"),beginBtn=document.getElementById("beginBtn"),replayBtn=document.getElementById("replayBtn"),menuBtn=document.getElementById("menuBtn");
const endTitle=document.getElementById("endTitle"),endText=document.getElementById("endText"),endLabel=document.getElementById("endLabel");
const menuScreens={home:homeScreen,how:howScreen,diff:diffScreen,end:endScreen};
const T=36,C=29,R=19,W=cv.width,H=cv.height;
const D={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}},OP={up:"down",down:"up",left:"right",right:"left"},ORDER=["up","left","down","right"];
const MAP_COUNT=10,ITEM_COUNT=16,KEY_COUNT=4;
const info=[{name:"Blinky",color:"#ef4444",mode:"direct",corner:{r:1,c:C-2}},{name:"Pinky",color:"#ff75b5",mode:"ahead",corner:{r:R-2,c:1}},{name:"Inky",color:"#40d9e8",mode:"vector",corner:{r:R-2,c:C-2}},{name:"Clyde",color:"#f59e0b",mode:"shy",corner:{r:1,c:14}}];
const DIFFICULTIES={
 easy:{name:"Fácil",ghosts:2,step:.38,stepMin:.30,vision:8,scatter:6,chase:4,inv:2.8,baseTime:100,decay:2,slop:.35,stun:1.4,tip:"Professores lentos e míopes: perseguem só quando chegam perto."},
 medium:{name:"Médio",ghosts:3,step:.30,stepMin:.22,vision:12,scatter:4,chase:6,inv:2.2,baseTime:80,decay:3,slop:.18,stun:1.0,tip:"Os professores revezam entre perseguir você e patrulhar."},
 hard:{name:"Difícil",ghosts:4,step:.24,stepMin:.16,vision:99,scatter:3,chase:8,inv:1.6,baseTime:68,decay:3,slop:.05,stun:.6,tip:"Os quatro professores caçam sem descanso. Boa sorte!"}
};
let map,player,ghosts,items,keys,exit,level=0,score=0,keysFound=0,lives=3,time=75,running=false,last=0,acc=0,exitHint=0;
let difficulty="medium",diff=DIFFICULTIES.medium,mode="scatter",modeTimer=0,openCache=[];

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

function openCells(){if(openCache.length)return openCache;openCache=[];for(let r=0;r<R;r++)for(let c=0;c<C;c++)if(map[r][c]=="0")openCache.push({r,c});return openCache}
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
 diff=DIFFICULTIES[difficulty];map=maps[level];openCache=[];let cells=openCells(),startCell={r:1,c:1},midRow=Math.floor((R-1)/2),midCol=Math.floor((C-1)/2),starts=[{r:midRow-2,c:midCol-5},{r:midRow-2,c:midCol+5},{r:midRow+2,c:midCol-5},{r:midRow+2,c:midCol+5}];
 exit=findExit(startCell,starts);keysFound=0;exitHint=0;player={...startCell,dir:"right",next:"right",inv:diff.inv,speed:8,progress:0};
 let path=findPath(startCell,exit),reserved=new Set([startCell,exit,...starts].map(cellKey));items=makeItems(path,cells,reserved);keys=makeKeys(path,cells,reserved,items);
 ghosts=info.slice(0,diff.ghosts).map((g,i)=>({...g,r:starts[i].r,c:starts[i].c,dir:ORDER[(i+level)%4],cool:.35+i*.15}));
 mode="scatter";modeTimer=diff.scatter;time=Math.max(40,diff.baseTime-level*diff.decay);levelEl.textContent=level+1;updateHUD()
}
function dist(a,b){return Math.hypot(a.c-b.c,a.r-b.r)}
function nearestOpen(r,c){let cells=openCells(),best=cells[0],bestDistance=Infinity;for(let cell of cells){let value=(cell.r-r)**2+(cell.c-c)**2;if(value<bestDistance){bestDistance=value;best=cell}}return best}
function options(g){let available=ORDER.filter(direction=>can(g.r+D[direction].y,g.c+D[direction].x)),forward=available.filter(direction=>direction!=OP[g.dir]);return forward.length?forward:available}
function target(g){
 if(mode=="scatter"||dist(g,player)>diff.vision)return nearestOpen(g.corner.r,g.corner.c);
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
function ghostStep(){return Math.max(diff.stepMin,diff.step-level*.012)}
function choose(g,goal){let available=options(g);if(!available.length)return OP[g.dir];if(Math.random()<diff.slop)return available[Math.floor(Math.random()*available.length)];let best=available[0],bestDistance=Infinity;for(let direction of available){let step=D[direction],next={r:g.r+step.y,c:g.c+step.x},value=pathDistance(next,goal);if(value<0)value=dist(next,goal);if(value<bestDistance||value==bestDistance&&direction==g.dir){bestDistance=value;best=direction}}return best}
function updateGhost(g,dt){
 g.cool-=dt;if(g.cool>0)return;g.cool=ghostStep();
 let oldR=g.r,oldC=g.c;g.dir=choose(g,target(g));let step=D[g.dir],r=g.r+step.y,c=g.c+step.x;
 if(can(r,c)){g.r=r;g.c=c}
 if(g.r==oldR&&g.c==oldC){let reverse=OP[g.dir];step=D[reverse];r=g.r+step.y;c=g.c+step.x;if(can(r,c)){g.dir=reverse;g.r=r;g.c=c}}
 if(player.inv<=0&&g.r==player.r&&g.c==player.c)hit()
}
function hit(){
 lives--;score=Math.max(0,score-150);player.inv=diff.inv;player.progress=0;
 mode="scatter";modeTimer=diff.scatter;ghosts.forEach(g=>g.cool=diff.stun);
 show("Professor pegou você! -1 vida");
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
 modeTimer-=dt;if(modeTimer<=0){if(mode=="scatter"){mode="chase";modeTimer=diff.chase}else{mode="scatter";modeTimer=diff.scatter}}
 if(player.inv>0)player.inv-=dt;movePlayer(dt);ghosts.forEach(g=>updateGhost(g,dt));collect();
 if(player.r==exit.r&&player.c==exit.c&&keysFound==KEY_COUNT)next();updateHUD()
}
function showScreen(name){Object.values(menuScreens).forEach(el=>el.classList.add("hidden"));if(menuScreens[name])menuScreens[name].classList.remove("hidden");screen.classList.remove("hidden");if(!reducedMotion)startMenuLoop()}
function end(win,title){running=false;setTimeout(()=>{endLabel.textContent=win?"VITÓRIA":"FIM DE JOGO";endTitle.textContent=win?"Você conseguiu!":title;endText.innerHTML=(win?"Você completou as 10 fases!":"Tente novamente e melhore sua pontuação.")+"<br><br><b>Pontuação: "+score+"</b>";showScreen("end")},180)}
function updateHUD(){scoreEl.textContent=score;timeEl.textContent=time;livesEl.innerHTML=Array.from({length:3},(_,i)=>'<span class="heart'+(i<lives?' on':'')+'"><svg viewBox="0 0 11 10" shape-rendering="crispEdges" aria-hidden="true"><path d="M2 1h2v1H2zM7 1h2v1H7zM1 2h8v1H1zM0 3h11v1H0zM0 4h11v1H0zM1 5h9v1H1zM2 6h7v1H2zM3 7h5v1H3zM4 8h3v1H4zM5 9h1v1H5z" fill="currentColor"/></svg></span>').join("");objEl.textContent=keysFound==KEY_COUNT?"Saída liberada!":"Chaves: "+keysFound+"/"+KEY_COUNT}
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
function begin(){if(running)return;level=0;score=0;lives=3;setup();running=true;msg.classList.add("hidden");screen.classList.add("hidden");last=performance.now();requestAnimationFrame(loop)}
const diffButtons=[...document.querySelectorAll("#difficulty .diff-btn")],diffInfo=document.getElementById("diffInfo");
function selectDifficulty(name){difficulty=name;diff=DIFFICULTIES[name];diffButtons.forEach(b=>b.classList.toggle("active",b.dataset.diff===name));if(diffInfo)diffInfo.textContent=DIFFICULTIES[name].tip;timeEl.textContent=Math.max(40,DIFFICULTIES[name].baseTime)}
if(diffButtons.length)selectDifficulty(difficulty);
diffButtons.forEach(b=>b.addEventListener("click",()=>selectDifficulty(b.dataset.diff)));
start.onclick=()=>showScreen("diff");
howBtn.onclick=()=>showScreen("how");
backHow.onclick=()=>showScreen("home");
backDiff.onclick=()=>showScreen("home");
beginBtn.onclick=begin;
replayBtn.onclick=begin;
menuBtn.onclick=()=>showScreen("home");
addEventListener("keydown",e=>{let m={w:"up",arrowup:"up",s:"down",arrowdown:"down",a:"left",arrowleft:"left",d:"right",arrowright:"right"}[e.key.toLowerCase()];if(m&&running){player.next=m;e.preventDefault()}if(!running){if(e.key=="Enter"){if(!diffScreen.classList.contains("hidden"))begin();else if(!homeScreen.classList.contains("hidden"))showScreen("diff");else if(!endScreen.classList.contains("hidden"))begin()}if(e.key=="Escape"&&!screen.classList.contains("hidden"))showScreen("home")}});

function draw(){
 ctx.fillStyle="#070d18";ctx.fillRect(0,0,W,H);
 for(let r=0;r<R;r++)for(let c=0;c<C;c++){let x=c*T,y=r*T;
  if(map[r][c]=="0"){
   ctx.fillStyle=(r+c)%2?"#0c1628":"#0e1a30";ctx.fillRect(x,y,T,T);
   ctx.fillStyle="#132844";ctx.fillRect(x+T/2-1,y+T/2-1,2,2);
  }}
 for(let r=0;r<R;r++)for(let c=0;c<C;c++)if(map[r][c]=="1")drawWall(c*T,r*T,r,c);
 drawExitDoor();
 items.forEach(item=>{if(!item.got)item.type=="coin"?coin(item.c*T+T/2,item.r*T+T/2):book(item.c*T+T/2,item.r*T+T/2)});
 keys.forEach(key=>{if(!key.got)drawKey(key.c*T+T/2,key.r*T+T/2)});
 ghosts.forEach(ghost);hero();
}
function drawWall(x,y,r,c){
 ctx.fillStyle="#132645";ctx.fillRect(x,y,T,T);
 ctx.fillStyle="#1a3054";ctx.fillRect(x+2,y+2,T-4,T-4);
 if(r==0||map[r-1][c]=="0"){ctx.fillStyle="#274878";ctx.fillRect(x+2,y+2,T-4,3)}
 if(c==0||map[r][c-1]=="0"){ctx.fillStyle="#213e66";ctx.fillRect(x+2,y+2,3,T-4)}
 if(r==R-1||map[r+1][c]=="0"){ctx.fillStyle="#0a1424";ctx.fillRect(x+2,y+T-5,T-4,3)}
 if(c==C-1||map[r][c+1]=="0"){ctx.fillStyle="#0c1830";ctx.fillRect(x+T-5,y+2,3,T-4)}
 ctx.fillStyle="#152a4a";
 ctx.fillRect(x+6,y+Math.floor(T/2),T-12,1);
 ctx.fillRect(x+Math.floor(T/2),y+6,1,Math.floor(T/2)-6);
}
function drawExitDoor(){
 let unlocked=keysFound==KEY_COUNT,x=exit.c*T,y=exit.r*T;
 ctx.fillStyle=unlocked?"#0d2218":"#1c0e14";ctx.fillRect(x+2,y+2,T-4,T-4);
 ctx.fillStyle=unlocked?"#143524":"#2a141c";ctx.fillRect(x+5,y+5,T-10,T-10);
 ctx.strokeStyle=unlocked?"#3a8f5e":"#7a3840";ctx.lineWidth=2;
 ctx.strokeRect(x+4,y+4,T-8,T-8);
 if(unlocked){
  ctx.fillStyle="#5cbc84";
  ctx.beginPath();ctx.moveTo(x+T/2-5,y+T/2-4);ctx.lineTo(x+T/2+5,y+T/2);ctx.lineTo(x+T/2-5,y+T/2+4);ctx.closePath();ctx.fill();
 }else{
  ctx.fillStyle="#8a4a50";ctx.fillRect(x+T/2-4,y+T/2-1,8,7);
  ctx.strokeStyle="#8a4a50";ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(x+T/2,y+T/2-2,3,Math.PI,0);ctx.stroke();
 }
 ctx.font="bold 7px ui-monospace,monospace";ctx.textAlign="center";
 ctx.fillStyle=unlocked?"#7ad4a0":"#9a6068";
 ctx.fillText(unlocked?"SAÍDA":"TRANCADA",x+T/2,y+T-6);ctx.textAlign="left";
}
function drawKey(x,y){
 x=Math.round(x);y=Math.round(y);
 ctx.save();
 ctx.strokeStyle="#c9a227";ctx.lineWidth=3;ctx.lineCap="square";ctx.lineJoin="miter";
 ctx.beginPath();ctx.arc(x-6,y-5,5,0,Math.PI*2);
 ctx.moveTo(x-2,y-1);ctx.lineTo(x+9,y+10);
 ctx.moveTo(x+6,y+5);ctx.lineTo(x+9,y+8);
 ctx.moveTo(x+4,y+7);ctx.lineTo(x+7,y+10);
 ctx.stroke();
 ctx.strokeStyle="#f0d878";ctx.lineWidth=1;
 ctx.beginPath();ctx.arc(x-7,y-6,3.2,Math.PI*1.1,Math.PI*1.7);ctx.stroke();
 ctx.restore();
}
function hero(){
 let x=Math.round(player.c*T+T/2),y=Math.round(player.r*T+T/2);
 if(player.inv>0&&Math.floor(player.inv*10)%2)return;
 ctx.fillStyle="rgba(0,0,0,.28)";
 ctx.beginPath();ctx.ellipse(x,y+11,9,2.5,0,0,7);ctx.fill();
 ctx.fillStyle="#a8741c";round(x-11,y-2,5,11,1);
 ctx.fillStyle="#c48a28";ctx.fillRect(x-10,y-1,3,4);
 ctx.fillStyle="#2a62b8";round(x-8,y-3,16,14,3);
 ctx.fillStyle="#3578d4";ctx.fillRect(x-6,y-1,12,5);
 ctx.fillStyle="#1e4a90";ctx.fillRect(x-8,y+8,16,3);
 ctx.fillStyle="#efb58d";ctx.beginPath();ctx.arc(x,y-8,7,0,7);ctx.fill();
 ctx.fillStyle="#2a2030";ctx.beginPath();ctx.arc(x,y-10,7,Math.PI,0);ctx.fill();
 ctx.fillRect(x-7,y-10,14,2);
 let ex=0,ey=0;
 if(player.dir=="left")ex=-2;else if(player.dir=="right")ex=2;else if(player.dir=="up")ey=-1;else ey=1;
 ctx.fillStyle="#1a2233";
 ctx.fillRect(x-4+ex,y-8+ey,2,2);ctx.fillRect(x+2+ex,y-8+ey,2,2);
 ctx.fillStyle="#1a2233";ctx.fillRect(x-7,y+10,5,2);ctx.fillRect(x+2,y+10,5,2);
 ctx.fillStyle="#d4dce8";ctx.fillRect(x-6,y+10,3,1);ctx.fillRect(x+3,y+10,3,1);
}
function ghost(g){
 let x=Math.round(g.c*T+T/2),y=Math.round(g.r*T+T/2);
 ctx.fillStyle="rgba(0,0,0,.28)";
 ctx.beginPath();ctx.ellipse(x,y+11,10,2.5,0,0,7);ctx.fill();
 ctx.fillStyle=g.color;
 ctx.beginPath();ctx.arc(x,y-2,11,Math.PI,0);
 ctx.lineTo(x+11,y+8);
 ctx.lineTo(x+7,y+8);ctx.lineTo(x+4,y+5);ctx.lineTo(x,y+8);ctx.lineTo(x-4,y+5);ctx.lineTo(x-7,y+8);ctx.lineTo(x-11,y+8);
 ctx.closePath();ctx.fill();
 ctx.fillStyle="rgba(0,0,0,.12)";ctx.fillRect(x-11,y+4,22,4);
 let d=D[g.dir]||{x:0,y:0};
 ctx.fillStyle="#f4f7fc";
 ctx.beginPath();ctx.arc(x-5,y-3,3.5,0,7);ctx.arc(x+5,y-3,3.5,0,7);ctx.fill();
 ctx.fillStyle="#1a2740";
 ctx.beginPath();ctx.arc(x-5+d.x*1.5,y-3+d.y*1.5,1.8,0,7);ctx.arc(x+5+d.x*1.5,y-3+d.y*1.5,1.8,0,7);ctx.fill();
 ctx.font="bold 7px ui-monospace,monospace";ctx.textAlign="center";
 ctx.fillStyle="rgba(200,215,240,.5)";
 ctx.fillText(g.name,x,y+26);ctx.textAlign="left";
}
function coin(x,y){
 x=Math.round(x);y=Math.round(y);
 ctx.fillStyle="rgba(0,0,0,.22)";
 ctx.beginPath();ctx.ellipse(x,y+8,7,2,0,0,7);ctx.fill();
 ctx.fillStyle="#8a6618";ctx.beginPath();ctx.arc(x,y+1,8,0,7);ctx.fill();
 ctx.fillStyle="#e0bc4e";ctx.beginPath();ctx.arc(x,y,8,0,7);ctx.fill();
 ctx.fillStyle="#f5dc8a";ctx.beginPath();ctx.arc(x-2,y-2,3,0,7);ctx.fill();
 ctx.fillStyle="#8a6618";ctx.font="bold 9px ui-monospace,monospace";ctx.textAlign="center";
 ctx.fillText("$",x,y+3);ctx.textAlign="left";
}
function book(x,y){
 x=Math.round(x);y=Math.round(y);
 ctx.fillStyle="rgba(0,0,0,.22)";
 ctx.beginPath();ctx.ellipse(x,y+8,9,2,0,0,7);ctx.fill();
 ctx.fillStyle="#4a38a0";round(x-9,y-7,18,14,2);
 ctx.fillStyle="#d4c8f0";ctx.fillRect(x+5,y-5,3,11);
 ctx.fillStyle="#5c48b8";ctx.fillRect(x-7,y-5,2,10);
 ctx.fillStyle="#8a78d0";ctx.fillRect(x-3,y-3,6,1);ctx.fillRect(x-3,y+1,4,1);
}
function round(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();ctx.fill()}
setup();draw();

/* ---------- fundo animado do menu (parallax arcade) ---------- */
const MW=menuBg.width,MH=menuBg.height;
const reducedMotion=typeof matchMedia=="function"&&matchMedia("(prefers-reduced-motion: reduce)").matches;
const MENU_COLORS=["#5da9ff","#ffd166","#ff75b5","#56d68b","#9d7cff","#40d9e8","#ff8a3d"];
const rand=(a,b)=>a+Math.random()*(b-a);

const menuDust=Array.from({length:42},()=>({x:rand(0,MW),y:rand(0,MH),s:Math.random()<.55?3:5,sp:rand(8,22),drift:rand(-8,8),ph:rand(0,6.28),c:MENU_COLORS[Math.floor(Math.random()*MENU_COLORS.length)],a:rand(.14,.4)}));
const menuPluses=Array.from({length:18},()=>({x:rand(20,MW-20),y:rand(20,MH-20),s:Math.random()<.4?3:4,ph:rand(0,6.28),c:Math.random()<.6?"#3d6db5":"#5da9ff"}));
const menuStreaks=Array.from({length:6},()=>({x:rand(-MW*.3,MW),y:rand(30,MH-30),len:rand(50,150),sp:rand(70,170),c:MENU_COLORS[Math.floor(Math.random()*MENU_COLORS.length)],a:rand(.0,.5),life:rand(0,6),max:rand(4,9)}));
const menuGhosts=Array.from({length:3},(_,i)=>({x:rand(0,MW),baseY:rand(70,MH-110),y:0,s:rand(2.5,4),sp:rand(7,15)*(i%2?1:-1),amp:rand(8,20),ph:rand(0,6.28),c:["#ef4444","#ff75b5","#40d9e8"][i],a:rand(.07,.13)}));
const menuProps=[
 {type:"notebook",x:rand(90,180),baseY:rand(200,320),y:0,s:rand(3.2,4),sp:-rand(4,9),amp:rand(8,16),ph:rand(0,6.28),a:.9,depth:.35},
 {type:"pencil",x:rand(100,200),baseY:rand(430,540),y:0,s:rand(3,4),sp:rand(5,11),amp:rand(7,15),ph:rand(0,6.28),a:.9,depth:.5},
 {type:"plane",x:rand(820,940),baseY:rand(180,300),y:0,s:rand(3,4),sp:-rand(8,16),amp:rand(10,20),ph:rand(0,6.28),a:.95,depth:.6},
 {type:"books",x:rand(850,940),baseY:rand(480,560),y:0,s:rand(2.6,3.4),sp:rand(3,8),amp:rand(6,12),ph:rand(0,6.28),a:.9,depth:.4}
];
const GHOST_SHAPE=["..####..","########","##.##.##","########","########","##.##.##","#.#..#.#"];
const menuVignette=mctx.createRadialGradient(MW/2,MH/2,MH*.3,MW/2,MH/2,MW*.72);
menuVignette.addColorStop(0,"rgba(0,0,0,0)");menuVignette.addColorStop(1,"rgba(0,0,0,.62)");
let menuT=0,menuLast=0,glitchLeft=0,glitchNext=2.8;

function menuShape(shape,x,y,s,color,alpha){mctx.save();mctx.globalAlpha=alpha;mctx.fillStyle=color;for(let r=0;r<shape.length;r++)for(let c=0;c<shape[r].length;c++)if(shape[r][c]=="#")mctx.fillRect(x+c*s,y+r*s,s,s);mctx.restore()}

function menuNotebook(x,y,s,a){
 mctx.save();mctx.globalAlpha=a;
 mctx.translate(x+7*s,y+8*s);mctx.rotate(-.18);mctx.translate(-7*s,-8*s);
 mctx.fillStyle="#1e3f8a";mctx.fillRect(0,0,14*s,16*s);
 mctx.fillStyle="#2a55b8";mctx.fillRect(s,s,12*s,14*s);
 mctx.fillStyle="#7fd4ff";mctx.fillRect(3*s,4*s,8*s,4*s);
 mctx.fillStyle="#5da9ff";mctx.fillRect(4*s,5*s,6*s,2*s);
 mctx.fillStyle="#c9d8f5";for(let i=0;i<5;i++)mctx.fillRect(0,(2+i*3)*s,s,1.4*s);
 mctx.fillStyle="#8fb2e8";mctx.fillRect(2*s,11*s,10*s,.8*s);mctx.fillRect(2*s,13*s,7*s,.8*s);
 mctx.restore()
}
function menuPencil(x,y,s,a){
 mctx.save();mctx.globalAlpha=a;
 mctx.translate(x+5*s,y+s);mctx.rotate(.5);mctx.translate(-5*s,-s);
 mctx.fillStyle="#f6c945";mctx.fillRect(0,0,10*s,2*s);
 mctx.fillStyle="#ffe680";mctx.fillRect(0,0,10*s,s);
 mctx.fillStyle="#d99a1f";mctx.fillRect(0,s,10*s,s);
 mctx.fillStyle="#ff75b5";mctx.fillRect(-1.5*s,s*.5,s,2*s);
 mctx.fillStyle="#e8e8f0";mctx.fillRect(-.6*s,s*.5,.6*s,2*s);
 mctx.fillStyle="#d9a25c";mctx.fillRect(10*s,0,s,2*s);
 mctx.fillStyle="#2b2b33";mctx.fillRect(11*s,.4*s,s,1.2*s);
 mctx.restore()
}
function menuPlane(x,y,s,a){
 mctx.save();mctx.globalAlpha=a*.35;mctx.strokeStyle="#40d9e8";mctx.lineWidth=Math.max(1,s*.6);mctx.setLineDash([s*1.6,s*2.2]);
 mctx.beginPath();mctx.moveTo(x-26*s,y+18*s);mctx.quadraticCurveTo(x-12*s,y+6*s,x+2*s,y+3*s);mctx.stroke();mctx.setLineDash([]);
 mctx.globalAlpha=a;
 const PLANE=["......#",".....##","#######","..####.","...#..."];
 menuShape(PLANE,x,y,s,"#40d9e8",a);
 menuShape(PLANE,x,y,s*.6,"#9ff3ff",a*.7);
 mctx.restore()
}
function menuBooks(x,y,s,a){
 mctx.save();mctx.globalAlpha=a;
 const stack=[["#3b6fe0","#7fb0ff","#e8f0ff"],["#e05a8a","#ff9ec2","#fff0f5"],["#3ecf8e","#8affc4","#eafff3"]];
 stack.forEach((b,i)=>{let yy=y+(2-i)*3.4*s; mctx.fillStyle=b[0];mctx.fillRect(x,yy,12*s,3*s);mctx.fillStyle=b[1];mctx.fillRect(x,yy,12*s,s);mctx.fillStyle=b[2];mctx.fillRect(x+10.6*s,yy+.6*s,s,1.8*s)});
 mctx.restore()
}

function drawMcAvatar(){
 const av=document.getElementById("mcAvatar");if(!av)return;
 const a=av.getContext("2d"),U=1;
 a.clearRect(0,0,32,32);
 a.fillStyle="#0d1b33";a.fillRect(0,0,32,32);
 a.fillStyle="#12305c";for(let i=0;i<10;i++)a.fillRect((i*7)%32,(i*11)%32,U,U);
 a.fillStyle="#2563eb";a.fillRect(6,25,20,7);a.fillStyle="#3b82f6";a.fillRect(8,25,16,2);
 a.fillStyle="#22d3ee";a.fillRect(13,25,6,2);
 a.fillStyle="#efb58d";a.fillRect(12,22,8,4);a.fillRect(11,23,10,2);
 a.fillStyle="#e8a878";a.fillRect(12,22,8,1);
 a.fillStyle="#f0b892";a.fillRect(9,10,14,13);a.fillRect(10,8,12,2);a.fillRect(8,12,1,8);a.fillRect(23,12,1,8);
 a.fillStyle="#3a2a1e";a.fillRect(8,5,16,5);a.fillRect(7,7,2,7);a.fillRect(23,7,2,9);a.fillRect(9,4,14,2);
 a.fillStyle="#4a3626";a.fillRect(8,5,16,1);a.fillRect(9,9,3,2);a.fillRect(20,9,3,2);a.fillRect(7,10,2,4);
 a.fillStyle="#1a2233";a.fillRect(11,13,3,3);a.fillRect(18,13,3,3);
 a.fillStyle="#fff";a.fillRect(11,13,2,2);a.fillRect(18,13,2,2);
 a.fillStyle="#2b3a55";a.fillRect(12,14,2,2);a.fillRect(19,14,2,2);
 a.fillStyle="#3a2a1e";a.fillRect(10,11,5,1);a.fillRect(17,11,5,1);
 a.fillStyle="#d9936a";a.fillRect(15,16,2,2);
 a.fillStyle="#c47a55";a.fillRect(13,19,6,1);
 a.fillStyle="#9d7cff";a.fillRect(9,27,3,3);a.fillStyle="#ff75b5";a.fillRect(20,27,3,3)
}

function drawMenuBg(dt){
 mctx.fillStyle="#060a1c";mctx.fillRect(0,0,MW,MH);
 const pulse=.5+.5*Math.sin(menuT*.6);
 const horizon=mctx.createLinearGradient(0,MH*.55,0,MH);
 horizon.addColorStop(0,"rgba(20,40,90,0)");horizon.addColorStop(1,"rgba(38,70,140,"+(.22+.06*pulse)+")");
 mctx.fillStyle=horizon;mctx.fillRect(0,MH*.55,MW,MH*.45);
 mctx.fillStyle="#2e5fa8";
 for(let i=0;i<3;i++){let x=((menuT*7+i*380)%(MW+180))-90;mctx.globalAlpha=.04;mctx.fillRect(x,0,90,MH)}
 mctx.globalAlpha=1;

 const gFar=72,gNear=36;
 const oxFar=(menuT*3)%gFar,oyFar=(menuT*2)%gFar;
 mctx.strokeStyle="#13224a";mctx.lineWidth=1;mctx.beginPath();
 for(let x=-gFar+oxFar;x<=MW+gFar;x+=gFar){mctx.moveTo(x,0);mctx.lineTo(x,MH)}
 for(let y=-gFar+oyFar;y<=MH+gFar;y+=gFar){mctx.moveTo(0,y);mctx.lineTo(MW,y)}
 mctx.stroke();
 const oxNear=(menuT*8)%gNear,oyNear=(menuT*5)%gNear;
 mctx.strokeStyle="#1b3061";mctx.lineWidth=1.4;mctx.beginPath();
 for(let x=-gNear+oxNear;x<=MW+gNear;x+=gNear){mctx.moveTo(x,0);mctx.lineTo(x,MH)}
 for(let y=-gNear+oyNear;y<=MH+gNear;y+=gNear){mctx.moveTo(0,y);mctx.lineTo(MW,y)}
 mctx.stroke();
 mctx.strokeStyle="#24427c";mctx.lineWidth=2;mctx.beginPath();
 for(let x=-gFar*2+oxNear*.5;x<=MW+gFar;x+=gFar*2){mctx.moveTo(x,0);mctx.lineTo(x,MH)}
 mctx.stroke();

 menuPluses.forEach(p=>{const tw=.25+.35*(.5+.5*Math.sin(menuT*1.4+p.ph));mctx.globalAlpha=tw;mctx.fillStyle=p.c;mctx.fillRect(p.x-p.s,p.y,p.s*2+1,1.5);mctx.fillRect(p.x,p.y-p.s,1.5,p.s*2+1)});
 mctx.globalAlpha=1;

 const px=Math.sin(menuT*.25)*10,py=Math.cos(menuT*.18)*6;
 menuProps.forEach(p=>{
  p.x+=p.sp*dt;if(p.x>MW+90)p.x=-90;if(p.x<-90)p.x=MW+90;
  p.y=p.baseY+Math.sin(menuT*.6+p.ph)*p.amp+py*p.depth;
  const xx=p.x+px*p.depth;
  if(p.type==="notebook")menuNotebook(xx,p.y,p.s,p.a);
  else if(p.type==="pencil")menuPencil(xx,p.y,p.s,p.a);
  else if(p.type==="plane")menuPlane(xx,p.y,p.s,p.a);
  else menuBooks(xx,p.y,p.s,p.a)
 });

 menuGhosts.forEach(gh=>{gh.x+=gh.sp*dt;if(gh.x>MW+80)gh.x=-80;if(gh.x<-80)gh.x=MW+80;gh.y=gh.baseY+Math.sin(menuT*.7+gh.ph)*gh.amp+py*.2;menuShape(GHOST_SHAPE,gh.x,gh.y,gh.s,gh.c,gh.a)});

 menuStreaks.forEach(s=>{
  s.life+=dt;if(s.life>s.max){s.life=0;s.max=rand(4,9);s.x=rand(-MW*.3,-20);s.y=rand(30,MH-30);s.len=rand(50,150);s.sp=rand(70,170);s.c=MENU_COLORS[Math.floor(Math.random()*MENU_COLORS.length)]}
  s.x+=s.sp*dt;
  const k=Math.sin(Math.PI*Math.min(1,s.life/s.max));
  mctx.globalAlpha=s.a*k;mctx.fillStyle=s.c;
  mctx.fillRect(s.x,s.y,s.len,2);mctx.fillRect(s.x+s.len*.3,s.y-3,s.len*.3,1);
  mctx.globalAlpha=s.a*k*.35;mctx.fillRect(s.x,s.y-1,s.len,4)
 });
 mctx.globalAlpha=1;

 menuDust.forEach(d=>{d.y-=d.sp*dt;d.x+=Math.sin(menuT*.8+d.ph)*d.drift*dt;if(d.y<-12){d.y=MH+10;d.x=rand(0,MW)}if(d.x<-10)d.x=MW+10;if(d.x>MW+10)d.x=-10;mctx.globalAlpha=d.a*(.7+.3*Math.sin(menuT*2.2+d.ph));mctx.fillStyle=d.c;mctx.fillRect(d.x,d.y,d.s,d.s)});
 mctx.globalAlpha=1;
 mctx.fillStyle=menuVignette;mctx.fillRect(0,0,MW,MH);

 if(!reducedMotion){
  glitchNext-=dt;
  if(glitchLeft<=0&&glitchNext<=0){glitchLeft=rand(.06,.14);glitchNext=rand(2.6,5.4)}
  if(glitchLeft>0){
   glitchLeft-=dt;
   for(let i=0;i<3;i++){
    const sy=rand(0,MH-24),sh=rand(8,26),off=rand(-14,14);
    mctx.globalAlpha=.55;mctx.drawImage(menuBg,0,sy,MW,sh,off,sy,MW,sh);
    mctx.globalAlpha=.12;mctx.fillStyle=i%2?"#35e0ff":"#ff75b5";mctx.fillRect(0,sy,MW,sh)
   }
   mctx.globalAlpha=1
  }
 }
}

let menuRunning=false;
function startMenuLoop(){if(reducedMotion||menuRunning)return;menuRunning=true;menuLast=0;requestAnimationFrame(menuLoop)}
function stopMenuLoop(){menuRunning=false}
function menuLoop(now){
 if(!menuRunning)return;
 if(!menuLast)menuLast=now;
 const dt=Math.min((now-menuLast)/1000,.06);menuLast=now;
 if(screen.classList.contains("hidden")){menuRunning=false;return}
 menuT+=dt;drawMenuBg(dt);
 requestAnimationFrame(menuLoop);
}
drawMcAvatar();
if(reducedMotion){drawMenuBg(0)}else{startMenuLoop()}
