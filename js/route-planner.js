/* Data-driven schematic route planner for Japan Honeymoon Planner.
 * Loaded on every website visit: changes to destinations.json recalculate the route.
 * No external transit API; lines indicate stops/transfers, not track or flight geometry.
 * CommonJS and browser-compatible for dependency-free tests.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.JapanRoutePlanner=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VALID_MODES=new Set(['ground','rail','shinkansen','flight','review']);
  function valid(p){return p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;}
  function distanceKm(a,b){
    if(!valid(a)||!valid(b))return Infinity;
    const rad=Math.PI/180,dLat=(b.lat-a.lat)*rad,dLng=(b.lng-a.lng)*rad;
    const h=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLng/2)**2;
    return 6371*2*Math.asin(Math.min(1,Math.sqrt(h)));
  }
  function area(p){
    if(p.route_area)return p.route_area;
    const city=String(p.city||'').toLowerCase(),region=String(p.region||'').toLowerCase();
    if(city==='himeji')return 'himeji';
    if(city==='osaka')return 'osaka';
    if(city==='kyoto')return 'kyoto';
    if(['tokyo','mitaka'].includes(city)||region.includes('tokyo metropolis'))return 'tokyo';
    if(['sapporo','asahikawa','noboribetsu','biei','higashikawa','kutchan','toyako'].includes(city)||region.includes('hokkaido'))return 'hokkaido';
    if(city==='minakami')return 'minakami';
    return city||'unknown';
  }
  const shinkansenPairs=new Set(['kyoto|tokyo','tokyo|kyoto','osaka|tokyo','tokyo|osaka','kyoto|himeji','himeji|kyoto','osaka|himeji','himeji|osaka']);
  const railPairs=new Set(['kyoto|osaka','osaka|kyoto']);
  function inferMode(a,b){
    if(b.arrival_mode&&VALID_MODES.has(b.arrival_mode))return b.arrival_mode;
    const from=area(a),to=area(b),pair=from+'|'+to;
    if(shinkansenPairs.has(pair))return 'shinkansen';
    if(railPairs.has(pair))return 'rail';
    // Flag distant unverified transfers rather than inventing an air or train route.
    if(distanceKm(a,b)>280&&from!==to)return 'review';
    return 'ground';
  }
  function autoSuggest(destinations){
    const byDay=new Map();
    for(const p of destinations){
      if(!valid(p)||!Number.isInteger(p.day)||p.day<1||p.day>14)continue;
      if(!byDay.has(p.day))byDay.set(p.day,[]);
      byDay.get(p.day).push(p);
    }
    const suggested=[];
    for(const p of destinations){
      if(!valid(p)||p.day!=null||['alternative','unplanned'].includes(p.route_preference))continue;
      // An optional overnight hotel cannot be treated as an automatically booked stop.
      if((Number(p.estimated_minutes)||0)>=900)continue;
      let best=null;
      for(const [day,items] of byDay){
        if([1,3,7,14].includes(day)||items.length===0)continue;
        const nearest=Math.min(...items.map(x=>distanceKm(p,x)));
        const maxKm=area(p)==='hokkaido'?45:area(p)==='himeji'?25:20;
        if(nearest>maxKm)continue;
        const used=items.reduce((n,x)=>n+(Number(x.estimated_minutes)||90),0);
        if(used+(Number(p.estimated_minutes)||90)>480)continue;
        const score=3*nearest+used/30;
        if(!best||score<best.score)best={day,score};
      }
      if(!best)continue;
      const members=byDay.get(best.day);
      const order=Math.max(0,...members.map(x=>Number(x.order)||0))+0.5;
      const copy={...p,day:best.day,order,suggested:true};
      suggested.push(copy);members.push(copy);
    }
    return suggested;
  }
  function buildPlan(trip,destinations){
    if(!trip||!Array.isArray(destinations))throw Error('Invalid route planning input');
    const scheduled=destinations.filter(p=>valid(p)&&Number.isInteger(p.day)&&p.day>=1&&p.day<=14).map(p=>({...p,suggested:false}));
    const suggested=autoSuggest(destinations);
    const anchors=(Array.isArray(trip.travel_anchors)?trip.travel_anchors:[])
      .filter(p=>valid(p)&&Number.isInteger(p.day)&&p.day>=1&&p.day<=14)
      .map(p=>({...p,anchor:true,order:Number(p.order)||0}));
    const points=[...scheduled,...suggested,...anchors].sort((a,b)=>a.day-b.day||(Number(a.order)||0)-(Number(b.order)||0)||(a.anchor?-1:1));
    const ordered=[];
    for(const p of points){
      const last=ordered[ordered.length-1];
      if(last&&distanceKm(last,p)<0.15&&!p.arrival_mode)continue;
      ordered.push(p);
    }
    const features=[];
    for(let i=1;i<ordered.length;i++){
      const a=ordered[i-1],b=ordered[i],km=distanceKm(a,b);
      if(km<0.15)continue;
      features.push({
        type:'Feature',
        properties:{from:a.name,to:b.name,fromDay:a.day,toDay:b.day,mode:inferMode(a,b),approxDistanceKm:Math.round(km),schematic:true},
        geometry:{type:'LineString',coordinates:[[a.lng,a.lat],[b.lng,b.lat]]}
      });
    }
    return {
      points:ordered,scheduled,suggested,
      unplanned:destinations.filter(p=>!scheduled.some(x=>x.id===p.id)&&!suggested.some(x=>x.id===p.id)),
      geojson:{type:'FeatureCollection',features},
      dayById:new Map([...scheduled,...suggested].map(p=>[p.id,{day:p.day,order:p.order,suggested:!!p.suggested}])),
      modes:features.reduce((obj,f)=>(obj[f.properties.mode]=(obj[f.properties.mode]||0)+1,obj),{})
    };
  }
  return {buildPlan,inferMode,autoSuggest,distanceKm};
});
