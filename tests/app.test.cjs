'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
const planner=require('../js/route-planner.js');
const railway=require('../js/rail-geometry.js');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/destinations.json'),'utf8'));
const railCatalog=JSON.parse(fs.readFileSync(path.join(root,'data/rail-corridors.json'),'utf8'));

function mount(options={}){
  const selectedHash=options.hash||'';
  const rootUrl='https://stormcloud23.github.io/Japan-Trip-/';
  const browser={
    location:{href:rootUrl+selectedHash,pathname:'/Japan-Trip-/',search:'',hash:selectedHash},
    printCalls:0,copied:[],listeners:{},
    addEventListener(type,fn){this.listeners[type]=fn},
    print(){this.printCalls++},
    navigator:{clipboard:{writeText:async text=>{browser.copied.push(text)}}},
    history:{replaceState(_state,_title,path){
      const hash=path.includes('#')?path.slice(path.indexOf('#')):'';
      browser.location.hash=hash;
      browser.location.href=rootUrl+hash;
    }}
  };
  const elements={};
  const queried=new Set();
  function el(id){
    if(!elements[id])elements[id]={
      id,value:id==='search'?'':'all',innerHTML:'',textContent:'',disabled:false,
      listeners:{},dataset:{},scrollIntoView(){this.scrolled=true},
      addEventListener(type,callback){this.listeners[type]=callback},
    };
    return elements[id];
  }
  const document={querySelector(selector){
    assert.ok(selector.startsWith('#'),'Unexpected selector: '+selector);
    const id=selector.slice(1);
    assert.ok(html.includes('id="'+id+'"'),'Missing HTML element #'+id);
    queried.add(id);
    return el(id);
  }};
  const maps=[];
  class FakeBounds{
    constructor(){this.coordinates=[]}
    extend(lngLat){this.coordinates.push(lngLat);return this}
  }
  class FakePopup{
    setLngLat(){return this}
    setHTML(){return this}
    addTo(){return this}
  }
  class FakeMap{
    constructor(){this.events={};this.sources={};this.layers={};this.camera=[];this.canvas={style:{}};maps.push(this)}
    on(type,layerOrHandler,handler){
      const fn=typeof layerOrHandler==='function'?layerOrHandler:handler;
      if(!this.events[type])this.events[type]=[];
      this.events[type].push({layer:typeof layerOrHandler==='string'?layerOrHandler:null,fn});
    }
    fire(type,event={}){for(const cb of this.events[type]||[])if(!cb.layer)cb.fn(event)}
    getStyle(){return {layers:[]}}
    addControl(){}
    addSource(name,settings){
      this.sources[name]={settings,data:settings.data,setData(next){this.data=next},
        getClusterExpansionZoom:async()=>13};
    }
    getSource(name){return this.sources[name]}
    addLayer(layer){this.layers[layer.id]=layer}
    fitBounds(bounds,options){this.camera.push({type:'fitBounds',bounds,options})}
    easeTo(options){this.camera.push({type:'easeTo',options})}
    flyTo(options){this.camera.push({type:'flyTo',options})}
    getZoom(){return 5}
    getCanvas(){return this.canvas}
    setStyle(){}
    queryRenderedFeatures(){return []}
  }
  const context={
    document,URL,console,window:browser,
    maplibregl:{Map:FakeMap,LngLatBounds:FakeBounds,NavigationControl:class{},Popup:FakePopup},
    JapanRoutePlanner:planner,JapanRailGeometry:railway,
    fetch:async(url)=>({ok:true,json:async()=>url.includes('rail-corridors.json')?railCatalog:data})
  };
  vm.runInNewContext(source,context,{filename:'app.js'});
  return {map:maps[0],el,queried,browser};
}
const flush=async()=>{await new Promise(resolve=>setImmediate(resolve))};

test('all controls exist and initial map clusters 27 saved destinations',async()=>{
  const app=mount();await flush();app.map.fire('style.load');
  assert.equal(app.map.sources['trip-places'].settings.cluster,true);
  assert.equal(app.map.sources['trip-places'].data.features.length,27);
  assert.equal(app.map.sources['trip-route'].data.features.length,39);
  assert.equal(app.map.sources['trip-route'].data.features.filter(f=>f.properties.geometrySource==='railway-gis').length,9);
  assert.equal(app.el('count').textContent,27);
  assert.equal(app.el('overloaded-count').textContent,4);
  assert.ok(app.el('days').innerHTML.includes('Day 12'));
  assert.ok(app.el('days').innerHTML.includes('Packed'));
  assert.ok(app.map.layers['trip-marker-numbers']);
  assert.ok(app.map.layers['trip-flight-outline']===undefined);
  assert.equal(app.map.layers['trip-route-flight'].paint['line-color'],'#ff2477');
});

test('day navigation isolates a day and draws only its travel legs',async()=>{
  const app=mount();await flush();app.map.fire('style.load');
  const select=app.el('day-select');select.value='10';
  select.listeners.change({target:select});
  const features=app.map.sources['trip-places'].data.features;
  assert.deepEqual(features.map(f=>f.properties.name).sort(),['Dotonbori / Tombori Riverwalk','Osaka Castle','Tempozan Harbor Village (Osaka Bay)'].sort());
  for(const feature of app.map.sources['trip-route'].data.features){
    assert.equal(feature.properties.toDay,10,'incoming travel should be visible on its arrival day');
  }
  assert.ok(app.el('map-context').textContent.includes('Day 10'));
  assert.ok(app.map.camera.some(x=>x.type==='fitBounds'));
  app.el('next-day').listeners.click();
  assert.equal(app.map.sources['trip-places'].data.features.length,1);
  assert.equal(app.map.sources['trip-places'].data.features[0].properties.name,'Himeji Castle');
});

test('filters isolate optional places and searches are independent of route lines',async()=>{
  const app=mount();await flush();app.map.fire('style.load');
  const planFilter=app.el('plan-filter');
  planFilter.value='optional';planFilter.listeners.change({target:planFilter});
  assert.equal(app.map.sources['trip-places'].data.features.length,7);
  assert.ok(app.map.sources['trip-places'].data.features.every(f=>f.properties.markerKind==='optional'));
  assert.equal(app.map.sources['trip-route'].data.features.length,39);
  const search=app.el('search');
  search.value='Castle';search.listeners.input({target:search});
  assert.equal(app.map.sources['trip-places'].data.features.length,1);
  app.el('reset-map').listeners.click();
  assert.equal(app.map.sources['trip-places'].data.features.length,27);
  assert.equal(app.el('day-select').value,'all');
});

test('clicking a day card focuses it without discarding destination data',async()=>{
  const app=mount();await flush();app.map.fire('style.load');
  const dayButton={dataset:{day:'13'}};
  app.el('days').listeners.click({target:{closest:()=>dayButton}});
  assert.ok(app.el('map-context').textContent.includes('Day 13'));
  assert.equal(app.map.sources['trip-places'].data.features.length,4);
  assert.equal(app.el('count').textContent,27);
  assert.equal(app.el('map').scrolled,true);
});

test('Day 12 displays the real curved Kyoto-to-Tokyo railway as an arrival-day leg',async()=>{
  const app=mount();await flush();app.map.fire('style.load');
  const select=app.el('day-select');select.value='12';
  select.listeners.change({target:select});
  const legs=app.map.sources['trip-route'].data.features;
  const shinkansen=legs.find(f=>f.properties.corridorId==='kyoto-tokyo');
  assert.ok(shinkansen,'Tokaido railway should be visible on arrival day');
  assert.equal(shinkansen.properties.mode,'shinkansen');
  assert.equal(shinkansen.properties.source,'MLIT-N02-2024');
  assert.ok(shinkansen.geometry.coordinates.length>100);
  assert.ok(legs.every(f=>f.properties.toDay===12));
});


test('day deep links restore the selected day, and the map fits the full Shinkansen corridor',async()=>{
  const app=mount({hash:'#day=12'});await flush();app.map.fire('style.load');
  assert.equal(app.el('day-select').value,'12');
  assert.ok(app.el('map-context').textContent.includes('Day 12'));
  assert.ok(app.map.sources['trip-route'].data.features.some(f=>f.properties.corridorId==='kyoto-tokyo'));
  const bounds=app.map.camera.filter(x=>x.type==='fitBounds').at(-1).bounds.coordinates;
  const lng=bounds.map(p=>p[0]);
  assert.ok(Math.min(...lng)<136,'Kyoto end should be included in selected-day map bounds');
  assert.ok(Math.max(...lng)>139,'Tokyo end should also be included');
  assert.equal(app.map.sources['trip-places'].data.features.length,3);
});

test('selecting a day updates the shareable URL; copying and printing work',async()=>{
  const app=mount();await flush();app.map.fire('style.load');
  const select=app.el('day-select');select.value='10';select.listeners.change({target:select});
  assert.equal(app.browser.location.hash,'#day=10');
  assert.equal(app.el('copy-day-link').textContent,'Copy Day 10 link');
  await app.el('copy-day-link').listeners.click();
  assert.deepEqual(app.browser.copied,['https://stormcloud23.github.io/Japan-Trip-/#day=10']);
  assert.match(app.el('share-feedback').textContent,/Link copied/);
  app.el('print-itinerary').listeners.click();
  assert.equal(app.browser.printCalls,1);
  app.el('reset-map').listeners.click();
  assert.equal(app.browser.location.hash,'');
  await app.el('copy-day-link').listeners.click();
  assert.equal(app.browser.copied.at(-1),'https://stormcloud23.github.io/Japan-Trip-/');
});

test('hashchange navigation handles valid and invalid day links',async()=>{
  const app=mount({hash:'#day=99'});await flush();app.map.fire('style.load');
  assert.equal(app.map.sources['trip-places'].data.features.length,27);
  app.browser.location.hash='#day=11';
  app.browser.listeners.hashchange();
  assert.equal(app.el('day-select').value,'11');
  assert.equal(app.map.sources['trip-places'].data.features.length,1);
  app.browser.location.hash='#unknown';
  app.browser.listeners.hashchange();
  assert.equal(app.el('day-select').value,'all');
  assert.equal(app.map.sources['trip-places'].data.features.length,27);
});

test('day zoom does not include distant flights, and filters focus the selected place',async()=>{
  const app=mount();await flush();app.map.fire('style.load');
  const select=app.el('day-select');select.value='3';select.listeners.change({target:select});
  const day3Camera=app.map.camera.at(-1);
  assert.equal(day3Camera.type,'easeTo','single Hokkaido sightseeing stop should focus locally');
  assert.ok(day3Camera.options.center[1]>40,'flight day should stay focused on Hokkaido');
  select.value='12';select.listeners.change({target:select});
  const search=app.el('search');search.value='Electric Town';search.listeners.input({target:search});
  assert.equal(app.map.sources['trip-places'].data.features.length,1);
  const lastCamera=app.map.camera.at(-1);
  assert.equal(lastCamera.type,'easeTo','filtered local point should zoom in rather than fit long rail');
});
