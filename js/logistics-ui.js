/* Read-only overnight planner and reservation checklist.
 * GitHub Pages has no booking backend; all status updates come from trip JSON.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.JapanLogisticsUI=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validLink=value=>{
    try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null}
    catch{return null}
  };
  const priorityLabel=priority=>priority==='high'?'Plan early':priority==='low'?'Later':'To arrange';
  function staysMarkup(logistics){
    return logistics.stays.map(stay=>{
      const nights=stay.firstNight===stay.lastNight?
        'Night '+stay.firstNight:
        'Nights '+stay.firstNight+'–'+stay.lastNight;
      const candidates=stay.candidates.map(c=>{
        const link=validLink(c.url);
        return '<div class="stay-candidate">'+
          '<span>Possible stay: </span>'+
          (link?'<a href="'+esc(link)+'" target="_blank" rel="noopener noreferrer">'+esc(c.name)+'</a>':esc(c.name))+
          '</div>';
      }).join('');
      return '<article class="stay-card">'+
        '<div class="stay-card-top"><span class="pill">'+esc(nights)+'</span>'+
        '<span class="stay-duration">'+stay.nightCount+' '+(stay.nightCount===1?'night':'nights')+'</span></div>'+
        '<h4>'+esc(stay.base)+'</h4>'+
        (stay.note?'<p>'+esc(stay.note)+'</p>':'')+
        (candidates||'<p class="stay-unselected">Hotel not selected</p>')+
        '</article>';
    }).join('');
  }
  function tasksMarkup(tasks){
    if(!tasks.length)return '<div class="empty">No reservations in this filter.</div>';
    return tasks.map(task=>{
      const link=validLink(task.url);
      return '<article class="booking-task">'+
        '<div class="booking-title"><h4>'+esc(task.title)+'</h4>'+
        '<span class="priority-tag '+esc(task.priority)+'">'+esc(priorityLabel(task.priority))+'</span></div>'+
        '<div class="booking-meta"><span>'+esc(task.type==='experience'?'Tickets / dining':task.type==='hotel'?'Accommodation':task.type==='transport'?'Transport':'Other')+'</span>'+
        (task.day?'<span>Trip Day '+esc(task.day)+'</span>':'')+
        '<span>'+esc(task.status==='booked'||task.status==='completed'?'Recorded as reserved':'Not recorded as booked')+'</span></div>'+
        (task.note?'<p>'+esc(task.note)+'</p>':'')+
        (link?'<a href="'+esc(link)+'" target="_blank" rel="noopener noreferrer">Venue details ↗</a>':'')+
        '</article>';
    }).join('');
  }
  let current=null,initializedFilter=false;
  function filterTasks(model,filter){
    if(filter==='high')return model.tasks.filter(task=>task.priority==='high');
    if(['hotel','transport','experience'].includes(filter))return model.tasks.filter(task=>task.type===filter);
    return model.tasks;
  }
  function render(data,doc){
    const documentRef=doc||(typeof document!=='undefined'?document:null);
    if(!documentRef)throw Error('Document is required to display logistics');
    if(!data||!data.trip||!Array.isArray(data.destinations))throw Error('Trip data missing');
    const model=JapanStayPlanner.buildLogistics(data.trip,data.destinations);
    const $=id=>documentRef.getElementById(id);
    $('night-count').textContent=model.coveredNights;
    $('hotel-count').textContent=model.stays.length;
    $('hotel-moves').textContent=model.hotelChanges;
    $('pending-bookings').textContent=model.pendingTasks;
    $('stay-cards').innerHTML=staysMarkup(model);
    $('logistics-warning').textContent=model.warnings.length?model.warnings.join(' · '):'';
    const selector=$('booking-filter');
    current=model;
    const update=()=>{
      const filter=selector.value||'all';
      $('booking-tasks').innerHTML=tasksMarkup(filterTasks(current,filter));
    };
    // Register the change handler only once, even if destination data is reloaded.
    if(!initializedFilter){selector.addEventListener('change',update);initializedFilter=true;}
    update();
    return model;
  }
  return {render,filterTasks,staysMarkup,tasksMarkup};
});
