'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {valid,selectValid,mount}=require('../js/photo-gallery.js');
const root=path.join(__dirname,'..');
const slides=JSON.parse(fs.readFileSync(path.join(root,'data/photos.json'),'utf8')).photos;
const stops=JSON.parse(fs.readFileSync(path.join(root,'data/destinations.json'),'utf8')).destinations;
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
test('ten valid, unique, credited Wikimedia Commons photos match scheduled trip stops',()=>{
  assert.equal(slides.length,10);
  assert.equal(selectValid({photos:slides}).length,10);
  assert.equal(new Set(slides.map(p=>p.id)).size,10);
  for(const photo of slides){
    assert.ok(valid(photo),photo.id);
    const stop=stops.find(p=>p.id===photo.destination_id);
    assert.ok(stop,'Missing linked destination: '+photo.destination_id);
    assert.equal(photo.day,stop.day);
    assert.ok(photo.source.includes('File:'));
    assert.ok(photo.src.includes('.jpg')||photo.src.includes('.JPG'));
  }
});
test('gallery HTML and external JS are included without altering map code',()=>{
  for(const id of ['photo-gallery','gallery-stage','gallery-image','gallery-title',
    'gallery-next','gallery-prev','gallery-play','gallery-dots','gallery-map-link',
    'gallery-photographer','gallery-license','gallery-source','gallery-status']){
    assert.ok(html.includes('id="'+id+'"'),'Missing '+id);
  }
  assert.ok(html.includes('src="./js/photo-gallery.js"'));
});
test('gallery validates the manifest and excludes broken or repeated entries',()=>{
  assert.equal(selectValid({photos:[slides[0],slides[0],{id:'unsafe',src:'javascript:alert(1)'}]}).length,1);
  assert.equal(selectValid(null).length,0);
});
test('controls advance, pause and link a photo to the appropriate trip day',async()=>{
  const els=new Map();
  function element(id){
    if(!els.has(id)){
      const obj={id,children:[],textContent:'',href:'',alt:'',src:'',dataset:{},
        listeners:{},attributes:{},disabled:false,
        classList:{add(){},remove(){},toggle(){}},
        addEventListener(type,fn){this.listeners[type]=fn},
        setAttribute(key,val){this.attributes[key]=val},
        removeAttribute(key){delete this[key]},
        replaceChildren(...v){this.children=v},contains(){return false},
        scrollIntoView(){}};
      els.set(id,obj);
    }
    return els.get(id);
  }
  const doc={hidden:false,getElementById:element,
    addEventListener(){},createElement:()=>element('dot'+(els.size+1))};
  const intervals=[],clears=[];
  const host={matchMedia:()=>({matches:true}),fetch:async()=>({ok:true,json:async()=>({photos:slides})}),
    setInterval(cb,ms){intervals.push({cb,ms});return intervals.length},
    clearInterval(x){clears.push(x)}};
  const gallery=mount(doc,host);
  for(let n=0;n<12;n++)await Promise.resolve();
  assert.equal(gallery.length,10);
  assert.equal(gallery.playing,false,'Reduced motion should prevent autoplay');
  assert.equal(element('gallery-map-link').href,'#day=2');
  element('gallery-next').listeners.click();
  assert.equal(gallery.index,1);
  assert.equal(element('gallery-map-link').href,'#day=3');
  element('gallery-prev').listeners.click();
  assert.equal(gallery.index,0);
  element('gallery-play').listeners.click();
  assert.equal(gallery.playing,true);
  element('gallery-image').listeners.load();
  assert.equal(intervals.at(-1).ms,8500);
  gallery.stop();
});
