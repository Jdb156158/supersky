const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
const W = 480, H = 900, SPEED = 560, DURATION = 75, HIT_Z = 150;
const palette = ['#5ecaff', '#a6d267', '#ff9dce', '#bd94e9', '#ffe595'];
const hair = ['#17252e', '#ffb223', '#bd25b5', '#fa632a', '#18252c'];
let best = 0;
try { best = Number(localStorage.getItem('supersky-best')) || 0; } catch {}
let state = 'ready', elapsed = 0, distance = 0, lane = 0, playerX = 0;
let score = 0, combo = 0, maxCombo = 0, hearts = 3, collected = 0, missed = 0;
let objects = [], particles = [], trail = [], last = 0, feedbackTime = 0, invincible = 0, idle = 0;
let sound = false, audio, nextBeat = 0, beat = 0;
const random = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function initCourse() {
 objects = [];
 // Each phrase stays in one lane, leaving time to follow the next phrase.
 for (let i = 0; 700 + i * 100 < SPEED * DURATION + HIT_Z; i++) {
  const phrase = Math.floor(i / 6);
  const route = [0, -1, 0, 1, 0, -1, 0, 1, 0][phrase % 9];
  const z = 700 + i * 100;
  objects.push({z, lane:route, type:'note', done:false});
  if (i > 5 && i % 6 === 3) objects.push({z:z + 15, lane:route === 0 ? (phrase % 2 ? -1 : 1) : 0, type:'bunny', done:false});
  if (i > 17 && i % 18 === 0) objects.push({z:z + 220, lane:route === 1 ? -1 : 1, type:'bunny', done:false});
 }
}
function syncHUD() {
 $('score').textContent = score;
 $('combo').textContent = combo;
 $('hearts').innerHTML = Array.from({length:3},(_,i)=>`<span class="${i >= hearts ? 'lost' : ''}">♥</span>`).join('');
 $('hearts').setAttribute('aria-label', `剩余${hearts}颗生命`);
 $('progress').style.width = `${Math.min(100, elapsed / DURATION * 100)}%`;
 $('progress-bunny').style.left = `${Math.min(100, elapsed / DURATION * 100)}%`;
 $('distance').textContent = `${Math.floor(elapsed)} / ${DURATION} s`;
}
function begin() {
 elapsed=0; distance=0; lane=0; playerX=0; score=0; combo=0; maxCombo=0; hearts=3; collected=0; missed=0;
 invincible=0; particles=[]; trail=[]; beat=0; nextBeat=0; feedbackTime=0;
 initCourse(); state='playing'; $('overlay').hidden=true; $('feedback').className='feedback';
 $('pause').textContent='Ⅱ'; $('pause').setAttribute('aria-label','暂停游戏'); syncHUD();
 if (sound) initAudio();
}
function showModal(kind) {
 const pause=kind==='paused', win=kind==='won';
 $('overlay').hidden=false;
 $('modal-kicker').textContent=pause?'TAKE A LITTLE BREATHER':win?'YOU MADE THE SKY YOURS':'EVERY FLIGHT IS A NEW START';
 $('modal-title').innerHTML=pause?'TAKE A<br><em>BREAK.</em>':win?'SKY<br><em>HIGH!</em>':'FLY<br><em>AGAIN!</em>';
 $('modal-description').textContent=pause?'小伙伴等你回来，继续这趟飞行。':win?'75 秒的彩虹冒险完成！下一次，飞得更精彩。':'没关系，新的冒险随时可以开始。';
 $('results').hidden=pause;
 $('results').innerHTML=`<span><b>${score}</b>SCORE / 得分</span><span><b>${maxCombo}</b>MAX COMBO</span><span><b>${best}</b>BEST / 最佳</span>`;
 $('start').innerHTML=pause?'继续飞行 <span>↗</span>':'再飞一次 <span>↗</span>';
 $('modal-tip').textContent=pause?'SPACE 继续 · ← → 左右移动':`收集率 ${collected+missed ? Math.round(collected/(collected+missed)*100) : 0}% · 躲开黑色兔兔，跟随金色音符`;
 $('restart').hidden=!pause;
}
function finish(won) {
 state=won?'won':'over'; best=Math.max(score,best);
 try {localStorage.setItem('supersky-best',String(best));} catch {}
 showModal(state); tone(won?784:220,.35,'sine',.035);
}
function pauseGame() {
 if(state==='playing'){state='paused';showModal('paused');$('pause').textContent='▶';$('pause').setAttribute('aria-label','继续游戏');}
 else if(state==='paused'){state='playing';$('overlay').hidden=true;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','暂停游戏');}
}
function move(dir) {
 if(state!=='playing') return;
 lane=Math.max(-1,Math.min(1,lane+dir));
 const button=$(dir<0?'left':'right');button.classList.add('pressed');setTimeout(()=>button.classList.remove('pressed'),120);
}
function initAudio(){audio ||= new (window.AudioContext || window.webkitAudioContext)(); if(audio.state==='suspended') audio.resume();}
function tone(freq,duration=.12,type='sine',volume=.03){
 if(!sound || !audio) return;
 const osc=audio.createOscillator(), gain=audio.createGain();osc.type=type;osc.frequency.value=freq;
 gain.gain.setValueAtTime(0,audio.currentTime);gain.gain.linearRampToValueAtTime(volume,audio.currentTime+.008);
 gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);
 osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration);
}
function music(){
 const melody=[523.25,659.25,783.99,659.25,587.33,659.25,880,783.99,523.25,659.25,783.99,1046.5,880,783.99,659.25,587.33];
 tone(melody[beat%melody.length],.22,'sine',.014);
 if(beat%4===0)tone([130.81,146.83,164.81,146.83][Math.floor(beat/4)%4],.4,'triangle',.022);
 beat++;
}
$('sound').addEventListener('click',()=>{sound=!sound;if(sound)initAudio();$('sound').innerHTML=sound?'♫':'♫<i></i>';$('sound').setAttribute('aria-label',sound?'关闭声音':'开启声音');});
$('start').addEventListener('click',()=>state==='paused'?pauseGame():begin());
$('restart').addEventListener('click',begin);
$('pause').addEventListener('click',pauseGame);
for(const [id,dir] of [['left',-1],['right',1]]) {
 $(id).addEventListener('pointerdown',e=>{e.preventDefault();move(dir);});
 $(id).addEventListener('click',e=>{if(e.detail===0)move(dir);});
}
window.addEventListener('keydown',e=>{
 if(['ArrowLeft','ArrowRight',' ','a','A','d','D','Escape'].includes(e.key))e.preventDefault();
 if(e.repeat)return;
 if(['ArrowLeft','a','A'].includes(e.key))move(-1);
 if(['ArrowRight','d','D'].includes(e.key))move(1);
 if(e.key===' '){if(state==='ready'||state==='over'||state==='won')begin();else pauseGame();}
 if(e.key==='Escape' && state==='playing')pauseGame();
});
let touchStart=null;
canvas.addEventListener('pointerdown',e=>{touchStart=e.clientX;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointerup',e=>{if(touchStart!==null && Math.abs(e.clientX-touchStart)>20)move(Math.sign(e.clientX-touchStart));touchStart=null;});
canvas.addEventListener('pointercancel',()=>touchStart=null);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pauseGame();});
function feedback(text,broken=false){$('feedback').textContent=text;$('feedback').className=`feedback show${broken?' break':''}`;feedbackTime=.75;}
function burst(x,y,color,count=10){for(let i=0;i<count;i++)particles.push({x,y,vx:(Math.random()-.5)*200,vy:-Math.random()*180,life:.6+Math.random()*.3,color});}
function update(dt){
 playerX+=(lane*105-playerX)*Math.min(1,dt*16);
 elapsed+=dt;distance+=SPEED*dt;invincible=Math.max(0,invincible-dt);
 if(elapsed>=nextBeat){music();nextBeat+=.23;}
 for(const object of objects){
  if(object.done||object.z-distance>HIT_Z)continue;
  object.done=true;
  const hit=Math.abs(object.lane*105-playerX)<55;
  if(object.type==='note'){
   if(hit){collected++;combo++;maxCombo=Math.max(maxCombo,combo);score+=10+Math.min(30,Math.floor(combo/5)*5);
    const p=project(playerX,HIT_Z,20);burst(p.x,p.y,'#fff09c',5);
    if(combo%5===0)feedback(combo%20===0?'SUPER PERFECT!':'PERFECT!');
    tone(880+combo%5*110,.09,'sine',.016);
   }else{missed++;if(combo>0){feedback('CHAIN BREAK',true);combo=0;}}
  }else if(hit&&invincible===0){hearts--;combo=0;invincible=1.2;feedback('OUCH!',true);burst(project(playerX,HIT_Z).x,605,'#efa4cc',22);tone(140,.25,'triangle',.045);if(hearts<=0){syncHUD();finish(false);return;}}
 }
 feedbackTime-=dt;if(feedbackTime<=0)$('feedback').classList.remove('show');
 particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=150*dt;p.life-=dt;});particles=particles.filter(p=>p.life>0);
 syncHUD();if(elapsed>=DURATION)finish(true);
}
function curve(z){
 const t=distance/800;
 return (Math.sin(t+z/800)-Math.sin(t)-Math.cos(t)*z/800)*650;
}
function project(x,z,height=0){const s=350/(z+120);return {x:W/2+(x+curve(z)-playerX*.16)*s,y:278+80000/(z+120)-height*s,s};}
function polygon(points,fill,stroke,width=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function line(points,color,width){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function ellipse(x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
function rect(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.4;ctx.stroke();}}
function road(){
 const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#b5f1fc');sky.addColorStop(.5,'#e0f6ed');sky.addColorStop(1,'#e9e9e5');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#c0e1e4';ctx.fillRect(0,320,W,H-320);
 for(let i=0;i<17;i++){
  const x=i*38-60+Math.sin(distance/800)*75,h=120+random(i+4)*250;
  ctx.fillStyle=i%2?'#a8d5df99':'#b9dfe7aa';ctx.fillRect(x,350-h,35,h);
  ctx.fillStyle='#8fc5d233';for(let j=0;j<5;j++)for(let k=0;k<10;k++)ctx.fillRect(x+5+j*6,350-h+12+k*25,3,16);
 }
 for(let z=2800;z>0;z-=40){
  const near=Math.max(0,z-40);
  polygon([project(-300,z),project(300,z),project(300,near),project(-300,near)],'#d6e4df');
  polygon([project(-190,z),project(190,z),project(190,near),project(-190,near)],'#cfdcdb');
  polygon([project(-185,z),project(-182,z),project(-182,near),project(-185,near)],'#e9d985');
  polygon([project(182,z),project(185,z),project(185,near),project(182,near)],'#e9d985');
 }
 for(let z=2600-(distance%110);z>0;z-=110){
  for(const x of [-62,62])polygon([project(x-1,z),project(x+1,z),project(x+1,z+34),project(x-1,z+34)],'#f5f2c49a');
 }
 const crossing=1300-(distance%1600);
 if(crossing>0)for(let x=-175;x<175;x+=32)polygon([project(x,crossing),project(x+17,crossing),project(x+17,crossing+90),project(x,crossing+90)],'#f2f8efaa');
 const haze=ctx.createLinearGradient(0,250,0,440);haze.addColorStop(0,'#d8f5f7bb');haze.addColorStop(1,'#ddf3ee00');ctx.fillStyle=haze;ctx.fillRect(0,250,W,190);
}
function building(x,z,width,height,depth,seed){
 const a=project(x-width/2,z),b=project(x+width/2,z),c=project(x+width/2,z+depth),d=project(x-width/2,z+depth);
 const A=project(x-width/2,z,height),B=project(x+width/2,z,height),C=project(x+width/2,z+depth,height),D=project(x-width/2,z+depth,height);
 const tint=seed%3===0?'#dce2f7':'#e0f0f6';
 polygon([d,c,C,D],'#c3dbe9','#eefaff',1);
 polygon([a,b,B,A],tint,'#f7ffff',2);
 polygon(x<0?[b,c,C,B]:[a,d,D,A],'#bfd5e5','#f8ffff',2);
 polygon([A,B,C,D],'#dceefa','#fff',1.5);
 // Window strips on the front and street-facing wall share the perspective.
 for(let h=12;h<height-12;h+=26){
  for(let xx=x-width/2+7;xx<x+width/2-10;xx+=22){
   polygon([project(xx,z-.4,h),project(Math.min(xx+15,x+width/2-5),z-.4,h),project(Math.min(xx+15,x+width/2-5),z-.4,h+17),project(xx,z-.4,h+17)],seed%2?'#afcfe3':'#c0ccea','#f6fbff',.6);
  }
  const side=x<0?x+width/2:x-width/2;
  polygon([project(side,z+5,h),project(side,z+depth-5,h),project(side,z+depth-5,h+15),project(side,z+5,h+15)],'#a8c9dc','#e9f8ff',.7);
 }
}
function tree(x,z,seed){
 const p=project(x,z),s=p.s;if(s<.1)return;
 line([p,project(x,z,40)],'#80a9ad',Math.max(1,s*3));
 if(seed%4===0){polygon([project(x-13,z,12),project(x+13,z,12),project(x,z,92)],'#4b9eae');polygon([project(x-10,z,36),project(x+10,z,36),project(x,z,106)],'#60b3bc');}
 else {ellipse(p.x,p.y-43*s,17*s,14*s,'#62aab2');ellipse(p.x-8*s,p.y-45*s,10*s,10*s,'#7bbfc4');ellipse(p.x+7*s,p.y-46*s,12*s,12*s,'#72b5ba');ellipse(p.x+10*s,p.y-41*s,8*s,9*s,'#589ba6');}
}
function scenery(){
 const segment=140,base=Math.floor(distance/segment);
 for(let i=base+19;i>=base;i--){
  const z=i*segment-distance;if(z<10)continue;
  for(const side of [-1,1]){
   const seed=i+(side===-1?61:173);
   building(side*(270+random(seed)*35),z,80+random(seed+1)*35,100+random(seed+2)*170,95,seed);
   tree(side*208,z+25,seed);
   if(i%2===0){const p=project(side*194,z+80),top=project(side*194,z+80,62);line([p,top],'#a3bdc0',Math.max(1,p.s*2));ellipse(top.x,top.y,3*p.s,5*p.s,'#fff2b6');}
  }
 }
}
function note(x,y,size,rotation){
 ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.shadowColor='#ffe771';ctx.shadowBlur=size*.6;
 ctx.fillStyle='#ffdd42';ctx.beginPath();ctx.moveTo(-size*.65,-size*.45);ctx.quadraticCurveTo(-size*.25,-size*.68,0,-size*.02);ctx.quadraticCurveTo(size*.25,-size*.68,size*.65,-size*.45);ctx.quadraticCurveTo(size*.7,size*.48,0,size*.63);ctx.quadraticCurveTo(-size*.7,size*.48,-size*.65,-size*.45);ctx.fill();ctx.shadowBlur=0;
 ellipse(-size*.25,-size*.17,size*.11,size*.2,'#fff49b');ctx.restore();
}
function bunny(x,y,size){
 ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(idle*3+y)*.08);
 ellipse(-size*.36,-size*.75,size*.19,size*.6,'#393049');ellipse(size*.3,-size*.85,size*.2,size*.65,'#393049');
 ellipse(-size*.36,-size*.79,size*.09,size*.4,'#d37db3');ellipse(size*.3,-size*.91,size*.1,size*.43,'#d37db3');
 ellipse(0,0,size*.74,size*.65,'#393049');ellipse(-size*.24,-size*.08,size*.13,size*.17,'#eaa9d2');ellipse(size*.25,-size*.08,size*.13,size*.17,'#eaa9d2');
 polygon([{x:-size*.1,y:size*.17},{x:size*.1,y:size*.17},{x:0,y:size*.3}],'#df83b9');ctx.restore();
}
function drawObjects(){
 const visible=objects.filter(o=>!o.done&&o.z-distance>HIT_Z-15&&o.z-distance<2400).sort((a,b)=>b.z-a.z);
 for(const o of visible){const z=o.z-distance,p=project(o.lane*105,z,26);if(o.type==='note')note(p.x,p.y,Math.min(25,16*p.s),Math.sin(idle*4+o.z)*.09);else bunny(p.x,p.y,Math.min(40,24*p.s));}
}
function character(x,y,index,scale,bank){
 ctx.save();ctx.translate(x,y);ctx.rotate(bank);ctx.scale(scale,scale);
 ellipse(0,14,8,10,'#fff9f4');rect(-7,12,14,7,2,['#72aff2','#78b484','#f69abd','#b88be6','#f4bd54'][index]);
 ellipse(-4,22,2.5,4,'#233851');ellipse(4,22,2.5,4,'#233851');
 ellipse(0,2,12,13,'#fff3e4');
 if(index===0){ellipse(0,-5,16,16,hair[index]);rect(-16,-4,8,22,3,hair[index]);rect(8,-4,8,22,3,hair[index]);ellipse(0,7,8,8,'#fff3e4');}
 else if(index===1){ellipse(0,-4,17,15,hair[index]);rect(-17,-4,7,20,3,hair[index]);rect(10,-4,7,20,3,hair[index]);}
 else if(index===2){ellipse(-12,-6,12,12,hair[index]);ellipse(12,-6,12,12,hair[index]);ellipse(0,-7,12,10,hair[index]);}
 else if(index===3){ellipse(-7,-5,13,13,hair[index]);ellipse(7,-5,13,13,hair[index]);line([{x:0,y:-14},{x:3,y:-23}],hair[index],3);}
 else{ellipse(0,-5,17,12,hair[index]);ellipse(-15,-10,7,5,hair[index]);ellipse(15,-10,7,5,hair[index]);}
 ellipse(-3,7,1.4,2,'#294454');ellipse(3,7,1.4,2,'#294454');ellipse(-6,10,2,1,'#f1adbb');ellipse(6,10,2,1,'#f1adbb');ctx.restore();
}
function team(dt){
 const base=project(playerX,HIT_Z,22).x;
 const bank=-Math.sin(distance/800)*.16+(lane*105-playerX)*.0015;
 if(state!=='paused'){trail.unshift({x:base,y:585});if(trail.length>90)trail.pop();}
 const positions=[[-68,8],[-49,51],[0,-24],[53,48],[76,7]];
 ctx.save();if(invincible>0&&Math.floor(invincible*14)%2)ctx.globalAlpha=.35;
 for(const index of [0,4,1,3,2]){
  const [dx,dy]=positions[index],y=584+dy+dx*bank+Math.sin(idle*6+index)*3;
  const ribbon=ctx.createLinearGradient(0,y,0,H);ribbon.addColorStop(0,palette[index]);ribbon.addColorStop(.6,palette[index]+'99');ribbon.addColorStop(1,palette[index]+'00');
  const pts=[{x:base+dx-9,y:y+15},{x:base+dx+9,y:y+15}];
  for(let j=0;j<30;j++){const t=j/29;const past=trail[Math.min(trail.length-1,Math.floor(t*65))]||{x:base};pts.push({x:past.x+dx*(1+t*.95)+10+t*16,y:y+20+t*(H-y)});}
  for(let j=29;j>=0;j--){const t=j/29;const past=trail[Math.min(trail.length-1,Math.floor(t*65))]||{x:base};pts.push({x:past.x+dx*(1+t*.95)-10-t*16,y:y+20+t*(H-y)});}
  polygon(pts,ribbon);
  ctx.shadowColor=palette[index];ctx.shadowBlur=12;character(base+dx,y,index,.92,bank);ctx.shadowBlur=0;
 }
 ctx.restore();
}
function speedLines(){
 if(state!=='playing'&&state!=='paused')return;
 for(let i=0;i<12;i++){
  const z=80+((i*83-distance%950+950)%950),x=(i%2?-1:1)*(202+random(i)*42);
  line([project(x,z,5),project(x,z+100,5)],'#ffffff55',1.5);
 }
}
function render(dt){road();scenery();drawObjects();speedLines();team(dt);for(const p of particles){ctx.globalAlpha=Math.max(0,Math.min(1,p.life*2));ctx.fillStyle=p.color;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.life*6);ctx.fillRect(-3,-3,6,6);ctx.restore();}ctx.globalAlpha=1;}
function frame(t){const dt=Math.min((t-last)/1000||0,.05);last=t;if(state!=='paused')idle+=dt;if(state==='playing')update(dt);render(dt);requestAnimationFrame(frame);}
initCourse();syncHUD();requestAnimationFrame(frame);
