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
  const DEFAULT_DAY_BUDGET=600;
  const BREAK_BUFFER=45;
  const round5=n=>Math.ceil(n/5)*5;
  // Coarse door-to-door local transfer allowance, NOT a live transit timetable.
  // Urban train/road transfers typically require station access and waiting time.
  function localTransferMinutes(a,b){
    const km=distanceKm(a,b);
    if(!Number.isFinite(km)||km<0.15)return 0;
    if(km<0.8)return 10;
    return Math.min(150,round5(12+km*2.5));
  }
  function planInsertion(existing,p){
    const stops=[...existing].sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0));
    let position=stops.length,extraKm=Infinity;
    for(let i=0;i<=stops.length;i++){
      const before=stops[i-1],after=stops[i];
      const cost=(before?distanceKm(before,p):0)+(after?distanceKm(p,after):0)
        -(before&&after?distanceKm(before,after):0);
      if(cost<extraKm){extraKm=cost;position=i;}
    }
    const before=stops[position-1],after=stops[position];
    const left=before?Number(before.order)||0:null;
    const right=after?Number(after.order)||0:null;
    const order=left==null?(right==null?1:right-0.5):
      right==null?left+0.5:(left+right)/2;
    return {...p,order};
  }
  function assessDayLoad(trip,day,places){
    const dayMeta=(Array.isArray(trip?.days)?trip.days:[]).find(x=>x.day===day)||{};
    const items=places.filter(p=>p.day===day&&valid(p)).sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0));
    const activityMinutes=items.reduce((total,p)=>{
      const minutes=Number(p.estimated_minutes);
      // An overnight stay is a hotel choice, not 24 hours of sightseeing.
      return total+(Number.isFinite(minutes)&&minutes>=0&&minutes<900?minutes:90);
    },0);
    let localMinutes=0;
    for(let i=1;i<items.length;i++)localMinutes+=localTransferMinutes(items[i-1],items[i]);
    const baselineTravelMinutes=Math.max(0,Number(dayMeta.travel_minutes_estimate)||0);
    const bufferMinutes=items.length>0?BREAK_BUFFER:0;
    const totalMinutes=activityMinutes+localMinutes+baselineTravelMinutes+bufferMinutes;
    const limitMinutes=Math.max(180,Number(dayMeta.available_minutes)||DEFAULT_DAY_BUDGET);
    let risk='comfortable';
    if(totalMinutes>limitMinutes)risk='overloaded';
    else if(totalMinutes>limitMinutes*0.85)risk='busy';
    return {day,activityMinutes,localMinutes,baselineTravelMinutes,bufferMinutes,totalMinutes,limitMinutes,risk,
      overByMinutes:Math.max(0,totalMinutes-limitMinutes),count:items.length,
      travelNote:dayMeta.travel_note||null,approximate:true};
  }
  function inferMode(a,b){
    if(b.arrival_mode&&VALID_MODES.has(b.arrival_mode))return b.arrival_mode;
    const from=area(a),to=area(b),pair=from+'|'+to;
    if(shinkansenPairs.has(pair))return 'shinkansen';
    if(railPairs.has(pair))return 'rail';
    // Flag distant unverified transfers rather than inventing an air or train route.
    if(distanceKm(a,b)>280&&from!==to)return 'review';
    return 'ground';
  }
  function autoSuggest(destinations,trip={}){
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
        const trial=planInsertion(items,p);
        const candidate={...trial,day,suggested:true};
        const load=assessDayLoad(trip,day,[...items,candidate]);
        // Keep automatically suggested days within the stated planning budget.
        if(load.risk==='overloaded')continue;
        const score=3*nearest+load.totalMinutes/30;
        if(!best||score<best.score)best={day,score,candidate};
      }
      if(!best)continue;
      const copy=best.candidate;
      suggested.push(copy);
      byDay.get(best.day).push(copy);
    }
    return suggested;
  }
  function buildPlan(trip,destinations){
    if(!trip||!Array.isArray(destinations))throw Error('Invalid route planning input');
    const scheduled=destinations.filter(p=>valid(p)&&Number.isInteger(p.day)&&p.day>=1&&p.day<=14).map(p=>({...p,suggested:false}));
    const suggested=autoSuggest(destinations,trip);
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
    const assigned=[...scheduled,...suggested];
    const dailyLoads=Array.from({length:14},(_,i)=>assessDayLoad(trip,i+1,assigned));
    const assignedIds=new Set(assigned.map(p=>p.id));
    return {
      points:ordered,scheduled,suggested,dailyLoads,
      unplanned:destinations.filter(p=>!assignedIds.has(p.id)),
      geojson:{type:'FeatureCollection',features},
      dayById:new Map([...scheduled,...suggested].map(p=>[p.id,{day:p.day,order:p.order,suggested:!!p.suggested}])),
      modes:features.reduce((obj,f)=>(obj[f.properties.mode]=(obj[f.properties.mode]||0)+1,obj),{})
    };
  }
  return {buildPlan,inferMode,autoSuggest,distanceKm,localTransferMinutes,assessDayLoad,planInsertion};
});
