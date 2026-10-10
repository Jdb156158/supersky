const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function game(){
 const elements=new Map(), handlers={};
 function element(id){if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',hidden:false,style:{},classList:{add(){},remove(){}},setAttribute(){},addEventListener(type,fn){handlers[id+':'+type]=fn;}});return elements.get(id);}
 const canvas=element('game');canvas.getContext=()=>({});
 const storage=new Map();
 const context=vm.createContext({document:{querySelector:()=>canvas,getElementById:element,addEventListener(){}},window:{addEventListener(type,fn){handlers[type]=fn;}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},requestAnimationFrame(){},setTimeout:fn=>fn(),Math,console});
 vm.runInContext(fs.readFileSync('dist/game.js','utf8')+`\nthis.api={begin,move,update,pauseGame,frame,initCourse,snapshot:()=>({state,score,combo,maxCombo,hearts,lane,elapsed,distance,collected,missed,best,objects}),configure:(values)=>{if(values.objects)objects=values.objects;if(values.distance!==undefined)distance=values.distance;if(values.elapsed!==undefined)elapsed=values.elapsed;if(values.invincible!==undefined)invincible=values.invincible;}};`,context);
 return {api:context.api,elements,handlers,storage};
}
test('start and keyboard controls clamp to three lanes',()=>{
 const {api,handlers}=game();api.begin();assert.equal(api.snapshot().state,'playing');
 for(let i=0;i<4;i++)handlers.keydown({key:'ArrowLeft',preventDefault(){},repeat:false});
 assert.equal(api.snapshot().lane,-1);api.move(1);assert.equal(api.snapshot().lane,0);api.move(1);api.move(1);assert.equal(api.snapshot().lane,1);
});
test('collecting a phrase scores, builds combo, and missing breaks it',()=>{
 const {api}=game();api.begin();api.configure({objects:Array.from({length:5},()=>({z:151,lane:0,type:'note',done:false}))});api.update(.01);
 assert.equal(api.snapshot().score,55);assert.equal(api.snapshot().combo,5);assert.equal(api.snapshot().collected,5);
 api.configure({objects:[{z:151,lane:1,type:'note',done:false}]});api.update(.01);
 assert.equal(api.snapshot().combo,0);assert.equal(api.snapshot().maxCombo,5);assert.equal(api.snapshot().hearts,3);assert.equal(api.snapshot().missed,1);
});
test('obstacle collision, invulnerability, game over, and restart',()=>{
 const {api,elements}=game();api.begin();
 for(let i=0;i<3;i++){
  api.configure({distance:0,invincible:0,objects:[{z:151,lane:0,type:'bunny',done:false},{z:151,lane:0,type:'bunny',done:false}]});api.update(.01);
  assert.equal(api.snapshot().hearts,2-i);
 }
 assert.equal(api.snapshot().state,'over');assert.equal(elements.get('overlay').hidden,false);
 api.begin();assert.equal(api.snapshot().hearts,3);assert.equal(api.snapshot().score,0);assert.equal(api.snapshot().elapsed,0);
});
test('pause prevents steering and resume preserves progress',()=>{
 const {api}=game();api.begin();api.update(.02);api.pauseGame();assert.equal(api.snapshot().state,'paused');api.move(-1);assert.equal(api.snapshot().lane,0);const t=api.snapshot().elapsed;api.pauseGame();assert.equal(api.snapshot().state,'playing');assert.equal(api.snapshot().elapsed,t);
});
test('course completion persists best score and offers replay',()=>{
 const {api,storage}=game();api.begin();api.configure({objects:[{z:151,lane:0,type:'note',done:false}]});api.update(.01);api.configure({elapsed:74.99,objects:[]});api.update(.02);assert.equal(api.snapshot().state,'won');assert.equal(storage.get('supersky-best'),'10');api.begin();assert.equal(api.snapshot().best,10);
});
test('every course phrase is reachable without sharing a note lane with a nearby obstacle',()=>{
 const {api}=game();const objects=api.snapshot().objects;
 for(const hazard of objects.filter(o=>o.type==='bunny'))assert.equal(objects.some(o=>o.type==='note'&&o.lane===hazard.lane&&Math.abs(o.z-hazard.z)<55),false);
 assert.equal(objects.filter(o=>o.type==='note').length,216);
});
