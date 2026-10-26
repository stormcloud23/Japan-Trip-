/* Pure accommodation / booking-readiness model.
 * Static website; statuses are read from data/destinations.json and are NOT saved
 * by clicking around the browser. No personal booking details belong in a public repo.
 * Browser: JapanStayPlanner. Node: require('./stay-planner.js').
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.JapanStayPlanner=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const statuses=new Set(['research','planned','booked','completed']);
  const priorities=new Set(['high','medium','low']);
  const types=new Set(['hotel','transport','experience','other']);
  const defaultString=(value,fallback)=>typeof value==='string'&&value.trim()?value.trim():fallback;
  function buildLogistics(trip,destinations){
    if(!trip||!Array.isArray(destinations))throw Error('Trip and destinations are required');
    const totalDays=Number(trip.duration_days)||14;
    const lastNight=totalDays-1;
    const byId=new Map(destinations.map(d=>[d.id,d]));
    const rawStays=Array.isArray(trip.stays)?trip.stays:[];
    const warnings=[];
    const nightAssignments=new Map();
    const stays=rawStays.map((s,index)=>{
      if(!s||!Number.isInteger(s.first_night)||!Number.isInteger(s.last_night)||
        s.first_night<1||s.last_night>lastNight||s.last_night<s.first_night)throw Error('Invalid stay night range at index '+index);
      for(let night=s.first_night;night<=s.last_night;night++){
        if(nightAssignments.has(night))throw Error('Overlapping hotel plans on night '+night);
        nightAssignments.set(night,s.id);
      }
      const candidates=(Array.isArray(s.candidate_destination_ids)?s.candidate_destination_ids:[])
        .map(id=>{
          const venue=byId.get(id);
          if(!venue)warnings.push('Unknown hotel candidate '+id);
          return venue||null;
        }).filter(Boolean).map(venue=>({
          id:venue.id,name:venue.name,url:venue.url||null,status:venue.status||'wishlist'
        }));
      return {
        id:defaultString(s.id,'stay-'+index),
        base:defaultString(s.base,'Hotel base not selected'),
        firstNight:s.first_night,lastNight:s.last_night,
        nightCount:s.last_night-s.first_night+1,
        note:defaultString(s.note,''),
        lodgingStatus:statuses.has(s.status)?s.status:'research',
        candidates
      };
    }).sort((a,b)=>a.firstNight-b.firstNight);
    const unassignedNights=Array.from({length:lastNight},(_,i)=>i+1)
      .filter(n=>!nightAssignments.has(n));
    if(unassignedNights.length)warnings.push('Unassigned nights: '+unassignedNights.join(', '));
    const rawTasks=Array.isArray(trip.booking_tasks)?trip.booking_tasks:[];
    const tasks=rawTasks.map((task,index)=>{
      if(!task||!task.id||!task.title)throw Error('Invalid booking checklist item at index '+index);
      const venue=task.destination_id?byId.get(task.destination_id):null;
      if(task.destination_id&&!venue)warnings.push('Unknown booking venue '+task.destination_id);
      const status=statuses.has(task.status)?task.status:'research';
      return {
        id:task.id,title:task.title,
        type:types.has(task.type)?task.type:'other',
        priority:priorities.has(task.priority)?task.priority:'medium',
        day:Number.isInteger(task.day)?task.day:null,
        status,
        note:defaultString(task.notes,''),
        destinationId:venue?.id||null,
        destinationName:venue?.name||null,
        url:venue?.url||null
      };
    }).sort((a,b)=>{
      const priority={high:0,medium:1,low:2};
      return priority[a.priority]-priority[b.priority]||
        (a.day??99)-(b.day??99)||a.title.localeCompare(b.title);
    });
    return {
      lastNight,stays,unassignedNights,
      coveredNights:lastNight-unassignedNights.length,
      hotelChanges:stays.length>0?stays.length-1:0,
      tasks,
      pendingTasks:tasks.filter(t=>t.status!=='booked'&&t.status!=='completed').length,
      confirmedTasks:tasks.filter(t=>t.status==='booked'||t.status==='completed').length,
      warnings
    };
  }
  return {buildLogistics};
});
