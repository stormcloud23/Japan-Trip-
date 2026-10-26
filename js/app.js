/* MapLibre interface for the Japan honeymoon planner.
 * Map markers and itineraries are derived from destinations.json on every page load.
 * The route-planner module owns day workloads, routing suggestions and travel legs.
 */
(()=>{
'use strict';
const $=selector=>document.querySelector(selector);
const $$=selector=>Array.from(document.querySelectorAll(selector));
const escapeHtml=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=value=>{try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)?url.href:null}catch{return null}};
const color={ground:'#e9a25b',rail:'#008e86',shinkansen:'#1a9d47',flight:'#ff2477',review:'#a5acb4'};
const kindColors={sightseeing:'#dc806a',nature:'#5da977',history:'#b58ad7',food:'#e7ac62',shopping:'#62badd',lodging:'#b99aee',optional:'#919da7'};
const state={day:null,area:'all',plan:'all',kind:'all',status:'all',search:''};
let destinations=[],trip={},routePlan=null,styleReady=false,usingFallback=false,providerErrors=0,initialFocus=true;
const map=new maplibregl.Map({
  container:'map',
  style:'https://tiles.openfreemap.org/styles/liberty',
  center:[138.25,36.2],zoom:4.7
});
map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
const fallbackStyle={version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'osm-tiles',type:'raster',source:'osm'}]};
const emptyCollection=()=>({type:'FeatureCollection',features:[]});
const nameFields=['name:en','name_en','name:latin','name_int','name'];
function preferEnglishLabels(){
  if(usingFallback)return;
  const expr=['coalesce',...nameFields.map(field=>['get',field])];
  for(const layer of map.getStyle().layers||[]){
    if(layer.type!=='symbol'||!['place','poi','park','water_name','waterway','mountain_peak'].includes(layer['source-layer']))continue;
    if(!layer.layout?.['text-field'])continue;
    try{map.setLayoutProperty(layer.id,'text-field',expr)}catch(error){console.debug('Left this label unchanged:',layer.id,error)}
  }
}
function areaOf(p){
  const city=String(p.city||'').toLowerCase(),region=String(p.region||'').toLowerCase();
  if(region.includes('hokkaido')||['biei','higashikawa','sapporo','asahikawa','noboribetsu','kutchan','toyako'].includes(city))return 'hokkaido';
  if(['tokyo','mitaka'].includes(city)||region.includes('tokyo metropolis'))return 'tokyo';
  if(['kyoto','osaka','himeji','hikone'].includes(city)||region.includes('hyogo')||region.includes('shiga'))return 'kansai';
  return 'other';
}
function kindOf(p){
  const c=String(p.category||'').toLowerCase();
  if(/hotel|ryokan|onsen/.test(c))return 'lodging';
  if(/temple|shrine|castle|historic|history/.test(c))return 'history';
  if(/nature|lake|waterfront|park/.test(c))return 'nature';
  if(/restaurant|cafe|dining|food/.test(c))return 'food';
  if(/gaming|shopping/.test(c))return 'shopping';
  return 'sightseeing';
}
function assigned(p){return routePlan?.dayById.get(p.id)||null}
function matches(p){
  const a=assigned(p);
  if(state.day!==null&&a?.day!==state.day)return false;
  if(state.area!=='all'&&areaOf(p)!==state.area)return false;
  if(state.plan==='scheduled'&&!a)return false;
  if(state.plan==='optional'&&a)return false;
  if(state.kind!=='all'&&kindOf(p)!==state.kind)return false;
  if(state.status!=='all'&&p.status!==state.status)return false;
  const q=state.search.trim().toLowerCase();
  return !q||[p.name,p.city,p.region,p.category,p.notes].some(x=>String(x||'').toLowerCase().includes(q));
}
function visiblePlaces(){
  return destinations.filter(matches).sort((a,b)=>{
    const x=assigned(a),y=assigned(b);
    return (x?.day??99)-(y?.day??99)||(x?.order??99)-(y?.order??99)||String(a.name).localeCompare(String(b.name));
  });
}
function minutes(n){
  const value=Math.max(0,Math.round(n||0));
  const h=Math.floor(value/60),m=value%60;
  return h?(h+'h'+(m?' '+m+'m':'')):(m+'m');
}
function statusLabel(risk){
  return risk==='overloaded'?'Packed':risk==='busy'?'Busy':'Comfortable';
}
function popupFor(p){
  const a=assigned(p),link=safeUrl(p.url),notes=String(p.notes||'');
  const shortNotes=notes.length>230?notes.slice(0,227)+'...':notes;
  return '<strong>'+escapeHtml(p.name)+'</strong>'+
    '<p>'+escapeHtml([p.city,p.region].filter(Boolean).join(', '))+'</p>'+
    '<p>'+(a?(a.suggested?'Suggested Day ':'Day ')+escapeHtml(a.day):'Optional / unscheduled')+' · '+escapeHtml(p.category||'Place')+'</p>'+
    (shortNotes?'<p>'+escapeHtml(shortNotes)+'</p>':'')+
    (link?'<a href="'+escapeHtml(link)+'" target="_blank" rel="noopener noreferrer">Location details ↗</a>':'');
}
function popupAt(p){
  new maplibregl.Popup({offset:18,maxWidth:'300px'}).setLngLat([p.lng,p.lat]).setHTML(popupFor(p)).addTo(map);
}
function addMapLayers(){
  map.addSource('trip-route',{type:'geojson',data:emptyCollection()});
  for(const mode of ['ground','rail','shinkansen','review','flight']){
    map.addLayer({
      id:'trip-route-'+mode,type:'line',source:'trip-route',
      filter:['==',['get','mode'],mode],
      layout:{'line-join':'round','line-cap':'round'},
      paint:{
        'line-color':color[mode],
        'line-width':mode==='flight'?4:mode==='shinkansen'?3.5:3,
        'line-dasharray':mode==='flight'?[2,2]:mode==='ground'?[2,2]:mode==='review'?[1,3]:mode==='rail'?[4,1.5]:[5,1],
        'line-opacity':0.95
      }
    });
  }
  map.addSource('trip-places',{type:'geojson',data:emptyCollection(),cluster:true,clusterMaxZoom:11,clusterRadius:49});
  map.addLayer({id:'trip-clusters',type:'circle',source:'trip-places',filter:['has','point_count'],
    paint:{'circle-color':'#9c6159','circle-radius':['step',['get','point_count'],17,5,21,12,26],
      'circle-stroke-width':2.5,'circle-stroke-color':'#142530'}});
  map.addLayer({id:'trip-cluster-count',type:'symbol',source:'trip-places',filter:['has','point_count'],
    layout:{'text-field':['get','point_count_abbreviated'],'text-size':12,'text-allow-overlap':true},
    paint:{'text-color':'#fff'}});
  map.addLayer({id:'trip-markers',type:'circle',source:'trip-places',filter:['!', ['has','point_count']],
    paint:{
      'circle-color':['match',['get','markerKind'],
        'nature',kindColors.nature,'history',kindColors.history,'food',kindColors.food,
        'shopping',kindColors.shopping,'lodging',kindColors.lodging,'optional',kindColors.optional,kindColors.sightseeing],
      'circle-radius':['case',['==',['get','markerKind'],'optional'],9,13],
      'circle-opacity':['case',['==',['get','markerKind'],'optional'],0.8,1],
      'circle-stroke-width':2.5,
      'circle-stroke-color':'#172530'
    }});
  map.addLayer({id:'trip-marker-numbers',type:'symbol',source:'trip-places',filter:['!', ['has','point_count']],
    layout:{'text-field':['get','markerLabel'],'text-size':10,'text-font':['Noto Sans Bold'],'text-allow-overlap':true,'text-ignore-placement':true},
    paint:{'text-color':'#101820','text-halo-color':'#edf4f7','text-halo-width':0.3}});
  map.on('click','trip-clusters',event=>{
    const feature=map.queryRenderedFeatures(event.point,{layers:['trip-clusters']})[0];
    if(!feature)return;
    const source=map.getSource('trip-places');
    const zoomPromise=source.getClusterExpansionZoom(feature.properties.cluster_id);
    Promise.resolve(zoomPromise).then(zoom=>map.easeTo({center:feature.geometry.coordinates,zoom:Math.min(zoom,16)})).catch(console.warn);
  });
  map.on('click','trip-markers',event=>{
    const feature=event.features?.[0];if(!feature)return;
    const p=destinations.find(x=>x.id===feature.properties.id);
    if(p)popupAt(p);
  });
  for(const layer of ['trip-clusters','trip-markers',...['ground','rail','shinkansen','review','flight'].map(x=>'trip-route-'+x)]){
    map.on('mouseenter',layer,()=>{map.getCanvas().style.cursor='pointer'});
    map.on('mouseleave',layer,()=>{map.getCanvas().style.cursor=''});
  }
  const modeNames={ground:'Local or ground transfer',rail:'Regular train',shinkansen:'Shinkansen',flight:'Domestic flight',review:'Transfer needs verification'};
  for(const mode of ['ground','rail','shinkansen','review','flight']){
    map.on('click','trip-route-'+mode,event=>{
      const p=event.features?.[0]?.properties;if(!p)return;
      new maplibregl.Popup({offset:12,maxWidth:'290px'})
        .setLngLat(event.lngLat)
        .setHTML('<strong>'+escapeHtml(modeNames[mode])+'</strong>'+
          '<p>'+escapeHtml(p.from)+' → '+escapeHtml(p.to)+'</p>'+
          '<p>Schematic connection only. Check transport routes and schedules before booking.</p>')
        .addTo(map);
    });
  }
}
function dayStops(day){
  return [...(routePlan?.scheduled||[]),...(routePlan?.suggested||[])]
    .filter(p=>p.day===day).sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0));
}
function markerFeature(p){
  const a=assigned(p);
  const order=a?(state.day!==null?dayStops(a.day).findIndex(x=>x.id===p.id)+1:a.day):null;
  return {
    type:'Feature',
    properties:{id:p.id,name:p.name,markerKind:a?kindOf(p):'optional',markerLabel:order===null?'':String(order)},
    geometry:{type:'Point',coordinates:[p.lng,p.lat]}
  };
}
function routesToDisplay(){
  if(!routePlan)return emptyCollection();
  if(state.day===null)return routePlan.geojson;
  return {type:'FeatureCollection',features:routePlan.geojson.features.filter(f=>
    f.properties.toDay===state.day&&f.properties.fromDay===state.day)};
}
function focusMap(shown,force=false){
  if(!styleReady||!routePlan||(!force&&!initialFocus))return;
  initialFocus=false;
  let points=shown.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
  if(state.day!==null&&points.length===0){
    points=(trip.travel_anchors||[]).filter(p=>p.day===state.day);
  }
  if(points.length===0)return;
  if(points.length===1){
    map.easeTo({center:[points[0].lng,points[0].lat],zoom:11,duration:450});
    return;
  }
  const bounds=new maplibregl.LngLatBounds();
  points.forEach(p=>bounds.extend([p.lng,p.lat]));
  map.fitBounds(bounds,{padding:{top:65,bottom:65,left:45,right:45},maxZoom:11,duration:450});
}
function updateMap(shown,fit=false){
  if(!styleReady||!routePlan)return;
  const points=shown.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
  map.getSource('trip-places')?.setData({type:'FeatureCollection',features:points.map(markerFeature)});
  map.getSource('trip-route')?.setData(routesToDisplay());
  focusMap(points,fit);
}
function renderPlaces(shown){
  $('#visible-count').textContent=shown.length+' shown';
  $('#places').innerHTML=shown.length?shown.map(p=>{
    const a=assigned(p),link=safeUrl(p.url),placeKind=a?kindOf(p):'optional';
    return '<article class="place">'+
      '<div class="place-head"><div><h3>'+escapeHtml(p.name)+'</h3><div class="meta">'+escapeHtml([p.city,p.region].filter(Boolean).join(', '))+'</div></div>'+
      '<span class="legend-dot" style="background:'+kindColors[placeKind]+'" aria-label="'+escapeHtml(placeKind)+'"></span></div>'+
      '<span class="pill">'+escapeHtml(p.status||'wishlist')+'</span>'+
      '<span class="pill">'+(a?(a.suggested?'Suggested Day ':'Day ')+escapeHtml(a.day):'Optional')+'</span>'+
      '<span class="pill">'+escapeHtml(p.category||'Place')+'</span>'+
      (p.notes?'<p>'+escapeHtml(p.notes)+'</p>':'')+
      '<div class="actions"><button type="button" data-focus-id="'+escapeHtml(p.id)+'">Show on map</button>'+
      (link?'<a href="'+escapeHtml(link)+'" target="_blank" rel="noopener noreferrer">Details ↗</a>':'')+'</div></article>';
  }).join(''):'<div class="empty">No places match these filters. Try All Japan or clear the filters.</div>';
}
function dayCard(day){
  const meta=(trip.days||[]).find(x=>x.day===day)||{};
  const places=dayStops(day);
  const load=routePlan.dailyLoads[day-1];
  const active=state.day===day;
  const pct=Math.min(100,Math.round(load.totalMinutes/load.limitMinutes*100));
  const name=meta.title||'Open for planning';
  const note=meta.description||'No details added yet';
  return '<article class="day-card'+(active?' active':'')+'">'+
    '<button type="button" class="day-card-button" data-day="'+day+'" aria-pressed="'+active+'">'+
      '<div class="day-head"><h3>Day '+day+' · '+escapeHtml(name)+'</h3>'+
      (places.length?'<span class="load-status '+load.risk+'">'+statusLabel(load.risk)+'</span>':'')+'</div>'+
      '<p class="meta">'+escapeHtml(note)+'</p>'+
      places.map(p=>'<div class="item">• '+escapeHtml(p.name)+(p.suggested?' <span class="pill">Suggested</span>':'')+'</div>').join('')+
      (places.length===0?'<div class="item">Travel / flexible day</div>':'')+
      '<div class="progress" aria-hidden="true"><span class="'+load.risk+'" style="width:'+pct+'%"></span></div>'+
      '<div class="load-caption">~'+minutes(load.totalMinutes)+' allocated / '+minutes(load.limitMinutes)+' target</div>'+
    '</button>'+
    '<details><summary>Time breakdown</summary>'+
      '<p>Activities: '+minutes(load.activityMinutes)+'</p>'+
      '<p>Major travel allowance: ~'+minutes(load.baselineTravelMinutes)+'</p>'+
      '<p>Between-stop transfers: ~'+minutes(load.localMinutes)+'</p>'+
      '<p>Break buffer: '+minutes(load.bufferMinutes)+'</p>'+
      (load.overByMinutes?'<p><strong>Over target by ~'+minutes(load.overByMinutes)+'</strong></p>':'')+
      (load.travelNote?'<p>'+escapeHtml(load.travelNote)+'</p>':'')+
      '<p>Rough planning estimates, not confirmed timetables.</p>'+
    '</details></article>';
}
function renderDays(){
  $('#days').innerHTML=Array.from({length:14},(_,i)=>dayCard(i+1)).join('');
}
function renderDayControls(){
  $('#day-select').value=state.day===null?'all':String(state.day);
  $('#previous-day').disabled=state.day===null||state.day<=1;
  $('#next-day').disabled=state.day===null||state.day>=14;
  const load=state.day===null?null:routePlan?.dailyLoads[state.day-1];
  const dayMeta=state.day===null?null:(trip.days||[]).find(x=>x.day===state.day);
  $('#map-context').textContent=state.day===null?
    'Whole-trip overview. Select a day to zoom in and isolate its stops and connections.':
    'Day '+state.day+(dayMeta?.title?' · '+dayMeta.title:'')+
    (load?' · ~'+minutes(load.totalMinutes)+' planned · '+statusLabel(load.risk):'');
  $('#reset-map').disabled=state.day===null&&state.area==='all'&&state.plan==='all'&&state.kind==='all'&&state.status==='all'&&!state.search;
}
function renderStats(){
  $('#count').textContent=destinations.length;
  $('#booked').textContent=destinations.filter(p=>p.status==='booked').length;
  $('#overloaded-count').textContent=routePlan?.dailyLoads.filter(p=>p.risk==='overloaded').length||0;
}
function render(fit=false){
  if(!routePlan)return;
  const shown=visiblePlaces();
  renderStats();renderDayControls();renderPlaces(shown);renderDays();updateMap(shown,fit);
}
function changeDay(value,scroll){
  state.day=value===null?null:Math.max(1,Math.min(14,Number(value)));
  state.plan='all';$('#plan-filter').value='all';
  if(state.day!==null){
    state.area='all';state.kind='all';state.status='all';state.search='';
    $('#area-filter').value='all';$('#kind-filter').value='all';
    $('#status').value='all';$('#search').value='';
  }
  render(true);
  if(scroll)$('#map').scrollIntoView({behavior:'smooth',block:'center'});
}
function clearFilters(){
  state.day=null;state.area='all';state.plan='all';state.kind='all';state.status='all';state.search='';
  $('#day-select').value='all';$('#area-filter').value='all';$('#plan-filter').value='all';
  $('#kind-filter').value='all';$('#status').value='all';$('#search').value='';
  render(true);
}
function setupEvents(){
  $('#day-select').addEventListener('change',event=>changeDay(event.target.value==='all'?null:Number(event.target.value),false));
  $('#previous-day').addEventListener('click',()=>state.day!==null&&changeDay(state.day-1,false));
  $('#next-day').addEventListener('click',()=>state.day!==null&&changeDay(state.day+1,false));
  $('#reset-map').addEventListener('click',clearFilters);
  $('#clear-filters').addEventListener('click',clearFilters);
  $('#days').addEventListener('click',event=>{
    const button=event.target.closest('button[data-day]');
    if(button)changeDay(Number(button.dataset.day),true);
  });
  $('#places').addEventListener('click',event=>{
    const button=event.target.closest('button[data-focus-id]');
    if(!button)return;
    const p=destinations.find(x=>x.id===button.dataset.focusId);
    if(!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lng))return;
    map.flyTo({center:[p.lng,p.lat],zoom:Math.max(12,map.getZoom()),duration:500});
    popupAt(p);
    $('#map').scrollIntoView({behavior:'smooth',block:'center'});
  });
  for(const [id,key,eventName] of [['search','search','input'],['status','status','change'],['area-filter','area','change'],['kind-filter','kind','change'],['plan-filter','plan','change']]){
    $(('#'+id)).addEventListener(eventName,event=>{state[key]=event.target.value;render(true)});
  }
}
function setupDayOptions(){
  const existing=state.day;
  $('#day-select').innerHTML='<option value="all">All Japan · 14 days</option>'+
    Array.from({length:14},(_,i)=>{
      const d=i+1,meta=(trip.days||[]).find(x=>x.day===d);
      return '<option value="'+d+'">Day '+d+' · '+escapeHtml(meta?.title||'Open')+'</option>';
    }).join('');
  $('#day-select').value=existing===null?'all':String(existing);
}
map.on('style.load',()=>{
  styleReady=true;
  preferEnglishLabels();
  addMapLayers();
  render(initialFocus);
});
map.on('error',event=>{
  console.warn('Map error:',event.error||event);
  if(usingFallback)return;
  providerErrors++;
  if(providerErrors<3)return;
  usingFallback=true;styleReady=false;
  $('#map-warning').textContent=' Vector tiles unavailable; showing OpenStreetMap backup.';
  map.setStyle(fallbackStyle);
});
setupEvents();
fetch('./data/destinations.json',{cache:'no-store'})
  .then(response=>{if(!response.ok)throw Error('Destination file unavailable ('+response.status+')');return response.json()})
  .then(data=>{
    if(!Array.isArray(data.destinations)||!data.trip)throw Error('Invalid trip data');
    destinations=data.destinations;trip=data.trip;
    routePlan=JapanRoutePlanner.buildPlan(trip,destinations);
    setupDayOptions();render(true);
  })
  .catch(error=>{
    console.error(error);
    $('#error').textContent='Unable to load destination data: '+error.message;
  });
})();
