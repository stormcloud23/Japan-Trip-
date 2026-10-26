'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const planner=require('../js/route-planner.js');
const railway=require('../js/rail-geometry.js');
const root=path.join(__dirname,'..');
const trip=JSON.parse(fs.readFileSync(path.join(root,'data/destinations.json'),'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/rail-corridors.json'),'utf8'));
const base=()=>planner.buildPlan(trip.trip,trip.destinations).geojson;

test('official railway GIS cache contains valid, small track corridors',()=>{
  assert.equal(catalog.corridors.length,8);
  assert.equal(railway.verifiedCorridors(catalog).length,8);
  for(const c of catalog.corridors){
    assert.ok(['rail','shinkansen'].includes(c.mode));
    assert.ok(c.coordinates.length>=2);
    assert.ok(c.coordinates.every(p=>p.length===2&&p[0]>128&&p[0]<145&&p[1]>33&&p[1]<45));
    assert.ok(c.track_km>0);
  }
  assert.ok(fs.statSync(path.join(root,'data/rail-corridors.json')).size<75000);
});

test('every currently scheduled rail/Shinkansen leg follows cached railway geometry',()=>{
  const output=railway.applyCorridors(base(),catalog);
  assert.equal(output.summary.mappedRailLegs,9);
  assert.equal(output.summary.unmappedRailLegs,0);
  assert.equal(output.summary.accessConnectors,5);
  assert.equal(output.features.length,40);
  const mapped=output.features.filter(f=>f.properties.geometrySource==='railway-gis');
  assert.equal(mapped.length,9);
  assert.equal(mapped.filter(f=>f.properties.mode==='rail').length,6);
  assert.equal(mapped.filter(f=>f.properties.mode==='shinkansen').length,3);
  assert.equal(output.features.filter(f=>f.properties.mode==='flight').length,2);
  for(const route of mapped){
    assert.equal(route.properties.source,'MLIT-N02-2024');
    assert.equal(route.properties.schematic,false);
  }
});

test('Tokaido Shinkansen is hundreds of mapped bends rather than Tokyo-Kyoto straight line',()=>{
  const output=railway.applyCorridors(base(),catalog);
  const feature=output.features.find(f=>f.properties.corridorId==='kyoto-tokyo');
  assert.ok(feature);
  assert.ok(feature.geometry.coordinates.length>=150);
  assert.ok(feature.properties.routeTrackKm>450);
  const coords=feature.geometry.coordinates;
  assert.ok(railway.km(coords[0],[135.7586,34.9854])<0.3);
  assert.ok(railway.km(coords.at(-1),[139.7671,35.6812])<0.3);
});

test('Himeji return track is reversed and castle access remains a short ground leg',()=>{
  const output=railway.applyCorridors(base(),catalog);
  const toHimeji=output.features.find(f=>f.properties.corridorId==='kyoto-himeji'&&f.properties.to==='Himeji Castle');
  const fromHimeji=output.features.find(f=>f.properties.corridorId==='kyoto-himeji'&&f.properties.from==='Himeji Castle');
  assert.ok(toHimeji&&fromHimeji);
  assert.deepEqual(toHimeji.geometry.coordinates[0],fromHimeji.geometry.coordinates.at(-1));
  assert.deepEqual(toHimeji.geometry.coordinates.at(-1),fromHimeji.geometry.coordinates[0]);
  assert.ok(output.features.some(f=>f.properties.geometrySource==='approximate-access'&&f.properties.to==='Himeji Castle'));
});

test('a newly inserted stop uses existing straight fallback rather than pretending track is known',()=>{
  const extra={id:'test-new',name:'Hypothetical Town',city:'Kyoto',lat:35.05,lng:135.8,day:11,order:-19,estimated_minutes:50};
  const features=planner.buildPlan(trip.trip,[...trip.destinations,extra]).geojson;
  const out=railway.applyCorridors(features,catalog);
  assert.ok(out.summary.unmappedRailLegs>=1);
  assert.ok(out.features.some(f=>f.properties.mode==='shinkansen'&&!f.properties.corridorId));
});

test('missing cached GIS data retains the original map routes unchanged',()=>{
  const before=base(),after=railway.applyCorridors(before,null);
  assert.equal(after.summary.mappedRailLegs,0);
  assert.equal(after.summary.unmappedRailLegs,9);
  assert.deepEqual(after.features,before.features);
});
