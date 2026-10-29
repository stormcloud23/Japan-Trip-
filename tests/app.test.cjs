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
const currentPlan=planner.buildPlan(data.trip,data.destinations);
const currentRail=railway.applyCorridors(currentPlan.geojson,railCatalog);
const optionalPlaces=data.destinations.filter(p=>!currentPlan.dayById.has(p.id));
const sushiPlaces=data.destinations.filter(p=>/sushi/i.test(p.category||''));
const optionalSushi=optionalPlaces.filter(p=>/sushi/i.test(p.category||''));
const omakase=sushiPlaces.filter(p=>p.dining_style==='omakase');
const casualSushi=sushiPlaces.filter(p=>p.dining_style==='casual');

function mount(options={}){
  const selectedHash=options.hash||'';
  const rootUrl='https://stormcloud23.github.io/Japan-Trip-/';
  const browser={
    localStorage:{
      getItem(){if(options.storageError)throw Error('Storage blocked');return options.savedChoices||null},
      setItem(key,value){if(options.storageError)throw Error('Storage blocked');browser.savedChoices=value}
    },
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
  const requests=[];
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
      this.sources[name]={settings,data:settings.data,updateCount:0,
        setData(next){this.data=next;this.updateCount++},
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
    fetch:async(url,options)=>{requests.push({url,cache:options?.cache});return {ok:true,json:async()=>url.includes('rail-corridors.json')?railCatalog:data}}
  };
  vm.runInNewContext(source,context,{filename:'app.js'});
  return {map:maps[0],el,queried,browser,requests};
}
const flush=async()=>{await new Promise(resolve=>setImmediate(resolve))};

test('choices persist, filter markers and export the entire shortlist independently of filters',async()=>{
  const app=mount();await flush();
  const place=optionalPlaces[0];
  const originalDays=app.el('days').innerHTML;
  app.el('places').listeners.change({target:{dataset:{decisionId:place.id},value:'shortlist'}});
  assert.equal(JSON.parse(app.browser.savedChoices)[place.id],'shortlist');
  app.el('decision-filter').listeners.change({target:{value:'shortlist'}});
  assert.ok(app.el('places').innerHTML.includes(place.name));
  assert.equal(app.el('visible-count').textContent,'1 shown');
  assert.equal(app.el('days').innerHTML,originalDays);
  await app.el('copy-shortlist').listeners.click();
  assert.ok(app.browser.copied[0].includes(place.name));
  const restored=mount({savedChoices:app.browser.savedChoices});await flush();
  assert.ok(restored.el('decision-summary').textContent.startsWith('1 shortlisted'));
});

test('blocked or malformed storage leaves choices usable and reports failed persistence',async()=>{
  for(const options of [{storageError:true},{savedChoices:'invalid json'}]){
    const app=mount(options);await flush();
    assert.ok(app.el('decision-summary').textContent.includes('could not be read'));
    app.el('places').listeners.change({target:{dataset:{decisionId:optionalPlaces[0].id},value:'later'}});
    assert.ok(app.el('decision-summary').textContent.includes('1 set aside'));
    if(options.storageError)assert.ok(app.el('decision-summary').textContent.includes('session only'));
  }
});

test('all controls exist and initial map clusters all saved destinations',async()=>{
  const app=mount();await flush();app.map.fire('style.load');
  assert.equal(app.map.sources['trip-places'].settings.cluster,true);
  assert.equal(app.map.sources['trip-places'].data.features.length,data.destinations.length);
  assert.equal(app.map.sources['trip-route'].data.features.length,currentRail.features.length);
  assert.equal(app.map.sources['trip-route'].data.features.filter(f=>f.properties.geometrySource==='railway-gis').length,9);
  assert.equal(app.el('count').textContent,data.destinations.length);
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
  assert.equal(app.map.sources['trip-places'].data.features.length,optionalPlaces.length);
  assert.ok(app.map.sources['trip-places'].data.features.every(f=>f.properties.isOptional===true));
  assert.equal(app.map.sources['trip-places'].data.features.filter(f=>f.properties.markerKind==='sushi').length,optionalSushi.length);
  assert.equal(app.map.sources['trip-places'].data.features.filter(f=>f.properties.markerKind==='optional').length,optionalPlaces.length-optionalSushi.length);
  assert.equal(app.map.sources['trip-route'].data.features.length,currentRail.features.length);
  const search=app.el('search');
  search.value='Castle';search.listeners.input({target:search});
  assert.equal(app.map.sources['trip-places'].data.features.length,1);
  app.el('reset-map').listeners.click();
  assert.equal(app.map.sources['trip-places'].data.features.length,data.destinations.length);
  assert.equal(app.el('day-select').value,'all');
});

test('clicking a day card focuses it without discarding destination data',async()=>{
  const app=mount();await flush();app.map.fire('style.load');
  const dayButton={dataset:{day:'13'}};
  app.el('days').listeners.click({target:{closest:()=>dayButton}});
  assert.ok(app.el('map-context').textContent.includes('Day 13'));
  assert.equal(app.map.sources['trip-places'].data.features.length,4);
  assert.equal(app.el('count').textContent,data.destinations.length);
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
  assert.equal(app.map.sources['trip-places'].data.features.length,data.destinations.length);
  app.browser.location.hash='#day=11';
  app.browser.listeners.hashchange();
  assert.equal(app.el('day-select').value,'11');
  assert.equal(app.map.sources['trip-places'].data.features.length,1);
  app.browser.location.hash='#unknown';
  app.browser.listeners.hashchange();
  assert.equal(app.el('day-select').value,'all');
  assert.equal(app.map.sources['trip-places'].data.features.length,data.destinations.length);
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

test('sushi restaurants keep distinctive pink S markers despite being unscheduled',async()=>{
  const app=mount();await flush();app.map.fire('style.load');
  const kind=app.el('kind-filter');
  kind.value='sushi';kind.listeners.change({target:kind});
  const pins=app.map.sources['trip-places'].data.features;
  assert.equal(pins.length,sushiPlaces.length);
  assert.ok(pins.every(pin=>pin.properties.markerKind==='sushi'));
  assert.ok(pins.every(pin=>pin.properties.markerLabel==='S'));
  assert.ok(pins.every(pin=>pin.properties.isOptional===true));
  const mapColor=app.map.layers['trip-markers'].paint['circle-color'];
  assert.ok(JSON.stringify(mapColor).includes('#ff6b99'),'dedicated sushi pin color');
  const list=app.el('places').innerHTML;
  assert.match(list,/Meal idea: Day 4/);
  assert.match(list,/Meal idea: Day 13/);
  assert.match(list,/¥41,800/);
});

test('omakase and casual filters match the current sushi wishlist',async()=>{
  const app=mount();await flush();app.map.fire('style.load');
  const kind=app.el('kind-filter');
  kind.value='sushi-omakase';kind.listeners.change({target:kind});
  assert.equal(app.map.sources['trip-places'].data.features.length,omakase.length);
  assert.match(app.el('places').innerHTML,/Sushi Gion Matsudaya/);
  assert.match(app.el('places').innerHTML,/Sushi Ginza Onodera/);
  assert.match(app.el('places').innerHTML,/Sushizen Honten/);
  assert.match(app.el('places').innerHTML,/Sukiyabashi Jiro/);
  kind.value='sushi-casual';kind.listeners.change({target:kind});
  assert.equal(app.map.sources['trip-places'].data.features.length,casualSushi.length);
  assert.match(app.el('places').innerHTML,/Harukoma Sushi Honten/);
  assert.match(app.el('places').innerHTML,/Nemuro Hanamaru/);
  assert.match(app.el('places').innerHTML,/Sushi no Midori/);
  assert.equal(app.map.sources['trip-route'].data.features.length,currentRail.features.length);
});

test('requested onigiri shops and mountain kaiseki appear as optional food pins with useful hints',async()=>{
  const app=mount();await flush();app.map.fire('style.load');
  const kind=app.el('kind-filter');
  kind.value='food';kind.listeners.change({target:kind});
  const names=app.map.sources['trip-places'].data.features.map(p=>p.properties.name);
  assert.ok(names.includes('Onigiri Bongo (Otsuka)'));
  assert.ok(names.includes('Onigiri Asakusa Yadoroku'));
  assert.ok(names.includes('Miyamasou (Hanase, Kyoto)'));
  const cards=app.el('places').innerHTML;
  assert.match(cards,/Onigiri Asakusa Yadoroku/);
  assert.match(cards,/Meal idea: Day 2/);
  assert.match(cards,/¥22,770/);
  assert.match(cards,/Miyamasou/);
});

test('new destinations stay unscheduled; onigiri Asakusa remains available on day 2 by search',async()=>{
  const app=mount();await flush();app.map.fire('style.load');
  const optional=app.el('plan-filter');optional.value='optional';optional.listeners.change({target:optional});
  assert.equal(app.map.sources['trip-places'].data.features.length,optionalPlaces.length);
  const search=app.el('search');search.value='Yadoroku';search.listeners.input({target:search});
  const matching=app.map.sources['trip-places'].data.features;
  assert.equal(matching.length,1);
  assert.equal(matching[0].properties.name,'Onigiri Asakusa Yadoroku');
  assert.equal(matching[0].properties.markerKind,'optional');
  assert.equal(matching[0].properties.isOptional,true);
});

test('wishlist filters do not re-upload the railway geometry or re-render day cards',async()=>{
  const app=mount();await flush();app.map.fire('style.load');
  const rail=app.map.sources['trip-route'],markers=app.map.sources['trip-places'];
  const before=rail.updateCount,previousMarkers=markers.updateCount;
  const dayCards=app.el('days').innerHTML;
  const search=app.el('search');search.value='Tokyo';search.listeners.input({target:search});
  search.value='Kyoto';search.listeners.input({target:search});
  const kind=app.el('kind-filter');kind.value='sushi';kind.listeners.change({target:kind});
  assert.equal(rail.updateCount,before,'do not reprocess railway lines on filters');
  assert.ok(markers.updateCount>previousMarkers,'pin markers must update');
  assert.equal(app.el('days').innerHTML,dayCards,'day cards should be preserved');
  const day=app.el('day-select');day.value='12';day.listeners.change({target:day});
  assert.equal(rail.updateCount,before+1,'day changes do update the route');
  const afterDay=rail.updateCount;
  search.value='Electric Town';search.listeners.input({target:search});
  assert.equal(rail.updateCount,afterDay);
});

test('railway GeoJSON can use browser caching, unlike the changing destination list',async()=>{
  const app=mount();await flush();app.map.fire('style.load');
  const rail=app.requests.find(x=>x.url.includes('rail-corridors.json'));
  const places=app.requests.find(x=>x.url.includes('destinations.json'));
  assert.ok(rail&&places);
  assert.equal(rail.cache,'default');
  assert.equal(places.cache,'no-store');
});

test('all ten late wishlist additions remain optional and each has a map pin',async()=>{
  const ids=[
    'hoshinoya-kyoto-arashiyama','gora-kadan-hakone','hakone-open-air-museum',
    'arashiyama-bamboo-grove','teamlab-borderless-azabudai',
    'shibuya-sky-observation-deck','meiji-jingu-shrine-tokyo',
    'omoide-yokocho-memory-lane','fushimi-inari-taisha-kyoto',
    'hakone-ropeway-owakudani'
  ];
  assert.equal(new Set(ids).size,10);
  for(const id of ids){
    const place=data.destinations.find(p=>p.id===id);
    assert.ok(place,'missing '+id);
    assert.equal(place.day,null);
    assert.equal(place.route_preference,'alternative');
    assert.ok(Number.isFinite(place.lat)&&Number.isFinite(place.lng));
    assert.ok(!currentPlan.dayById.has(id));
  }
  const app=mount();await flush();app.map.fire('style.load');
  const source=app.map.sources['trip-places'].data.features;
  assert.equal(source.length,data.destinations.length);
  for(const id of ids)assert.ok(source.some(f=>f.properties.id===id),'missing pin: '+id);
});

test('Hakone region filter isolates the new sightseeing and ryokan cluster',async()=>{
  const app=mount();await flush();app.map.fire('style.load');
  const area=app.el('area-filter');
  area.value='hakone';
  area.listeners.change({target:area});
  const items=app.map.sources['trip-places'].data.features;
  assert.deepEqual(items.map(f=>f.properties.id).sort(),[
    'gora-kadan-hakone','hakone-open-air-museum','hakone-ropeway-owakudani'
  ].sort());
  assert.equal(app.map.sources['trip-route'].data.features.length,currentRail.features.length);
});

test('optional Kyoto and Tokyo sights have visit labels, not dinner labels',async()=>{
  const app=mount();await flush();app.map.fire('style.load');
  const search=app.el('search');
  search.value='Sagano Bamboo Forest';
  search.listeners.input({target:search});
  assert.equal(app.map.sources['trip-places'].data.features.length,1);
  assert.match(app.el('places').innerHTML,/Possible visit: Day 9/);
  assert.ok(!app.el('places').innerHTML.includes('Dinner idea'));
  search.value='Gora Kadan';search.listeners.input({target:search});
  assert.match(app.el('places').innerHTML,/Possible stay around Day 12/);
  search.value='Memory Lane';search.listeners.input({target:search});
  assert.match(app.el('places').innerHTML,/Nightlife idea: Day 12/);
});

test('new Kagurazaka pizza, Ginza Sushi Yuu and Tsukiji market stay optional with visible pins',async()=>{
  const ids=['400c-pizza-tokyo-kagurazaka','sushi-yuu-ginza-itchome','tsukiji-outer-market-chuo'];
  for(const id of ids){
    const candidate=data.destinations.find(p=>p.id===id);
    assert.ok(candidate,'missing '+id);
    assert.equal(candidate.day,null);
    assert.equal(candidate.route_preference,'alternative');
    assert.ok(Number.isFinite(candidate.lat)&&Number.isFinite(candidate.lng));
    assert.ok(!currentPlan.dayById.has(id));
  }
  const app=mount();await flush();app.map.fire('style.load');
  const points=app.map.sources['trip-places'].data.features;
  assert.equal(points.length,data.destinations.length);
  for(const id of ids)assert.ok(points.some(p=>p.properties.id===id),'missing map pin '+id);
});

test('Ginza Sushi Yuu is a sushi pin and Tsukiji / pizza are food pins with booking guidance',async()=>{
  const app=mount();await flush();app.map.fire('style.load');
  const kind=app.el('kind-filter');
  kind.value='sushi-omakase';kind.listeners.change({target:kind});
  assert.ok(app.map.sources['trip-places'].data.features.some(f=>f.properties.id==='sushi-yuu-ginza-itchome'));
  const sushiCard=app.el('places').innerHTML;
  assert.match(sushiCard,/Sushi Yuu/);
  assert.match(sushiCard,/¥27,500/);
  assert.match(sushiCard,/Booking/);
  kind.value='food';kind.listeners.change({target:kind});
  const foodPins=app.map.sources['trip-places'].data.features;
  assert.ok(foodPins.some(f=>f.properties.id==='tsukiji-outer-market-chuo'));
  assert.ok(foodPins.some(f=>f.properties.id==='400c-pizza-tokyo-kagurazaka'));
  const foodCard=app.el('places').innerHTML;
  assert.match(foodCard,/TableCheck/);
  assert.match(foodCard,/Tsukiji Outer Market/);
  assert.match(foodCard,/Meal idea: Day 2/);
});

test('five Tokyo shopping and bar additions remain unscheduled and appear as optional map pins',async()=>{
  const ids=[
    'bar-centifolia-azabujuban','shibuya-loft','daikanyama-t-site-tsutaya',
    'ginza-itoya-main-store','kappabashi-dougu-street'
  ];
  assert.equal(new Set(ids).size,5);
  for(const id of ids){
    const stop=data.destinations.find(p=>p.id===id);
    assert.ok(stop,'missing '+id);
    assert.equal(stop.day,null);
    assert.equal(stop.route_preference,'alternative');
    assert.ok(Number.isFinite(stop.lat)&&Number.isFinite(stop.lng));
    assert.ok(!currentPlan.dayById.has(id));
  }
  const app=mount();await flush();app.map.fire('style.load');
  const mapPins=app.map.sources['trip-places'].data.features;
  assert.equal(mapPins.length,data.destinations.length);
  for(const id of ids)assert.ok(mapPins.some(f=>f.properties.id===id),'missing pin '+id);
});

test('shopping filter includes all four new retail destinations; bar is categorized as food and nightlife',async()=>{
  const app=mount();await flush();app.map.fire('style.load');
  const kind=app.el('kind-filter');
  kind.value='shopping';kind.listeners.change({target:kind});
  const shopping=app.map.sources['trip-places'].data.features.map(f=>f.properties.id);
  for(const id of ['shibuya-loft','daikanyama-t-site-tsutaya','ginza-itoya-main-store','kappabashi-dougu-street']){
    assert.ok(shopping.includes(id),'shopping filter missing '+id);
  }
  const search=app.el('search');search.value='Kappabashi Dougu Street';
  search.listeners.input({target:search});
  assert.equal(app.map.sources['trip-places'].data.features.length,1);
  assert.match(app.el('places').innerHTML,/Possible visit: Day 2/);
  kind.value='food';kind.listeners.change({target:kind});
  search.value='BAR CENTIFOLIA';search.listeners.input({target:search});
  assert.equal(app.map.sources['trip-places'].data.features.length,1);
  assert.match(app.el('places').innerHTML,/Nightlife idea: Day 2/);
  assert.match(app.el('places').innerHTML,/¥35,000/);
  assert.match(app.el('places').innerHTML,/Booking/);
});
