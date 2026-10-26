'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const planner=require('../js/route-planner.js');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/destinations.json'),'utf8'));
const plan=()=>planner.buildPlan(data.trip,data.destinations);

test('all scheduled places and 14 day cards are retained',()=>{
  const output=plan();
  assert.equal(data.trip.days.length,14);
  assert.equal(output.scheduled.length,data.destinations.filter(p=>Number.isInteger(p.day)).length);
  for(const p of output.scheduled)assert.equal(output.dayById.get(p.id).day,p.day);
  assert.ok(output.geojson.features.every(f=>f.geometry.coordinates.length===2&&f.properties.schematic===true));
});

test('flights are limited to the two necessary Hokkaido transfers',()=>{
  const flights=plan().geojson.features.filter(f=>f.properties.mode==='flight');
  assert.equal(flights.length,2);
  assert.deepEqual(flights.map(f=>[f.properties.from,f.properties.to]),[
    ['Tokyo Haneda Airport (HND)','Asahikawa Airport (AKJ)'],
    ['New Chitose Airport (CTS)','Osaka Itami Airport (ITM)']
  ]);
});

test('rail takes priority on practical Hokkaido and Kansai corridors',()=>{
  const segments=plan().geojson.features;
  const match=(start,end,mode)=>segments.some(f=>f.properties.from.includes(start)&&f.properties.to.includes(end)&&f.properties.mode===mode);
  assert.ok(match('Asahikawa Station','Sapporo Station','rail'));
  assert.ok(match('Sapporo Station','Noboribetsu Station','rail'));
  assert.ok(match('Kyoto Station (Osaka day trip)','Osaka Castle','rail'));
  assert.ok(match('Himeji Castle','Kyoto Station (return from Himeji)','shinkansen'));
  assert.ok(match('Kyoto Station (return from Himeji)','Tokyo Station','shinkansen'));
  assert.equal(segments.filter(f=>f.properties.mode==='review').length,0);
});

test('alternative resorts and optional attractions stay unscheduled',()=>{
  const output=plan();
  for(const p of data.destinations.filter(x=>x.route_preference==='alternative')){
    assert.equal(p.day,null);
    assert.ok(output.unplanned.some(x=>x.id===p.id));
    assert.ok(!output.dayById.has(p.id));
  }
});

test('a newly added nearby attraction is automatically proposed and connected',()=>{
  const extra={id:'test-kyoto-museum',name:'New Kyoto Museum',city:'Kyoto',lat:35.014,lng:135.747,category:'museum',status:'wishlist',day:null,order:null,estimated_minutes:60};
  const output=planner.buildPlan(data.trip,[...data.destinations,extra]);
  const suggestion=output.suggested.find(p=>p.id===extra.id);
  assert.ok(suggestion,'new place should be automatically suggested');
  assert.equal(suggestion.day,8,'nearby Kyoto museum should be grouped into Day 8');
  assert.ok(output.geojson.features.some(f=>f.properties.to===extra.name||f.properties.from===extra.name));
  const insertedAt=output.points.findIndex(p=>p.id===extra.id);
  const restaurantAt=output.points.findIndex(p=>p.id==='hikiniku-to-kome-kyoto');
  assert.ok(insertedAt<restaurantAt,'new stop near Nijo should be visited before the distant Gion restaurant');
});

test('a newly added pre-scheduled destination changes the route order',()=>{
  const extra={id:'test-osaka-photo',name:'Osaka Photo Spot',city:'Osaka',lat:34.670,lng:135.48,day:10,order:2.5,estimated_minutes:30};
  const output=planner.buildPlan(data.trip,[...data.destinations,extra]);
  const index=output.points.findIndex(p=>p.id===extra.id);
  assert.ok(index>=1,'stop should appear in map route');
  assert.equal(output.points[index-1].name,'Tempozan Harbor Village (Osaka Bay)');
  assert.equal(output.points[index+1].name,'Dotonbori / Tombori Riverwalk');
});

test('adding an unrelated distant place does not invent a trip detour',()=>{
  const far={id:'test-okinawa',name:'Okinawa beach',city:'Naha',lat:26.213,lng:127.68,day:null,order:null,estimated_minutes:120};
  const output=planner.buildPlan(data.trip,[...data.destinations,far]);
  assert.ok(output.unplanned.some(p=>p.id===far.id));
  assert.ok(!output.dayById.has(far.id));
});

test('unknown long-distance transfer is flagged rather than mislabeled as shinkansen',()=>{
  const a={name:'Tokyo',city:'Tokyo',lat:35.68,lng:139.77};
  const b={name:'Naha',city:'Naha',lat:26.21,lng:127.68};
  assert.equal(planner.inferMode(a,b),'review');
  assert.equal(planner.inferMode({...a,city:'Tokyo'},a),'ground');
});
