'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const trip=JSON.parse(fs.readFileSync(path.join(root,'data/destinations.json'),'utf8'));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const planner=require('../js/stay-planner.js');
const ui=require('../js/logistics-ui.js');

function fakeDocument(){
  const elements={};
  function el(id){
    assert.ok(html.includes('id="'+id+'"'),'Missing HTML element '+id);
    if(!elements[id])elements[id]={
      id, value:'all', textContent:'',innerHTML:'', listeners:{},
      addEventListener(type,fn){this.listeners[type]=fn}
    };
    return elements[id];
  }
  return {elements,getElementById:el};
}

test('13 trip nights have full coverage without gaps, overlaps or bookings',()=>{
  const output=planner.buildLogistics(trip.trip,trip.destinations);
  assert.equal(output.lastNight,13);
  assert.equal(output.coveredNights,13);
  assert.deepEqual(output.unassignedNights,[]);
  assert.deepEqual(output.warnings,[]);
  assert.equal(output.stays.length,7);
  assert.equal(output.hotelChanges,6);
  assert.equal(output.confirmedTasks,0);
  assert.equal(output.pendingTasks,trip.trip.booking_tasks.length);
  const kyoto=output.stays.find(s=>s.id==='kyoto');
  assert.deepEqual([kyoto.firstNight,kyoto.lastNight,kyoto.nightCount],[7,11,5]);
});

test('recommended ryokan candidates are linked to existing, unbooked destinations',()=>{
  const output=planner.buildLogistics(trip.trip,trip.destinations);
  const onsen=output.stays.filter(s=>['jozankei','noboribetsu'].includes(s.id));
  assert.equal(onsen.length,2);
  assert.ok(onsen.every(s=>s.candidates.length===1));
  assert.deepEqual(onsen.map(s=>s.candidates[0].id),['jozankei-suizantei','daiichi-takimotokan']);
  assert.ok(onsen.every(s=>s.candidates[0].status!=='booked'));
});

test('overlapping hotel nights are rejected, with missing nights flagged',()=>{
  const collision={...trip.trip,stays:[
    {id:'first',first_night:1,last_night:2,base:'Tokyo'},
    {id:'second',first_night:2,last_night:3,base:'Hokkaido'}
  ]};
  assert.throws(()=>planner.buildLogistics(collision,trip.destinations),/Overlapping hotel plans/);
  const incomplete={...trip.trip,stays:[{id:'one',first_night:1,last_night:2,base:'Tokyo'}]};
  const output=planner.buildLogistics(incomplete,trip.destinations);
  assert.equal(output.coveredNights,2);
  assert.equal(output.unassignedNights.length,11);
  assert.match(output.warnings.join(' '),/Unassigned nights/);
});

test('booking task filters and cards render safely and never pretend reservations are confirmed',()=>{
  const document=fakeDocument();
  const result=ui.render(trip,document);
  assert.equal(document.getElementById('night-count').textContent,13);
  assert.equal(document.getElementById('hotel-count').textContent,7);
  assert.equal(document.getElementById('hotel-moves').textContent,6);
  assert.equal(document.getElementById('pending-bookings').textContent,trip.trip.booking_tasks.length);
  assert.match(document.getElementById('stay-cards').innerHTML,/Nights 7–11/);
  assert.match(document.getElementById('stay-cards').innerHTML,/Jozankei Daiichi Hotel Suizantei/);
  assert.match(document.getElementById('booking-tasks').innerHTML,/Ghibli Museum/);
  assert.match(document.getElementById('booking-tasks').innerHTML,/Not recorded as booked/);
  assert.equal(result.warnings.length,0);
  const filter=document.getElementById('booking-filter');
  filter.value='hotel';filter.listeners.change();
  assert.equal((document.getElementById('booking-tasks').innerHTML.match(/class="booking-task"/g)||[]).length,trip.trip.booking_tasks.filter(t=>t.type==='hotel').length);
  filter.value='high';filter.listeners.change();
  assert.equal((document.getElementById('booking-tasks').innerHTML.match(/class="booking-task"/g)||[]).length,trip.trip.booking_tasks.filter(t=>t.priority==='high').length);
});

test('untrusted lodging and task text are escaped',()=>{
  const bogus={...trip.trip,
    stays:[{id:'test',first_night:1,last_night:13,base:'<img src=x onerror=alert(1)>'}],
    booking_tasks:[{id:'bad',title:'<script>alert(1)</script>',status:'research'}]
  };
  const model=planner.buildLogistics(bogus,trip.destinations);
  const stayMarkup=ui.staysMarkup(model),taskMarkup=ui.tasksMarkup(model.tasks);
  assert.ok(!stayMarkup.includes('<img'));
  assert.ok(stayMarkup.includes('&lt;img'));
  assert.ok(!taskMarkup.includes('<script>'));
  assert.ok(taskMarkup.includes('&lt;script&gt;'));
});

test('Jiro and Miyamasou reservation tasks are distinct, unbooked and high priority',()=>{
  const plan=planner.buildLogistics(trip.trip,trip.destinations);
  const jiro=plan.tasks.find(t=>t.id==='sukiyabashi-jiro-concierge');
  const miyamasou=plan.tasks.find(t=>t.id==='miyamasou-hanase-arrangements');
  assert.ok(jiro&&miyamasou);
  assert.equal(jiro.priority,'high');
  assert.equal(miyamasou.priority,'high');
  assert.equal(jiro.status,'research');
  assert.equal(miyamasou.status,'research');
  assert.match(jiro.note,/concierge/);
  assert.match(miyamasou.note,/mountain/);
  assert.equal(plan.confirmedTasks,0);
});

test('Tokyo sushi and pizza booking research tasks are unbooked and linked to real stops',()=>{
  const model=planner.buildLogistics(trip.trip,trip.destinations);
  for(const id of ['400c-pizza-kagurazaka-reservation','sushi-yuu-ginza-omakase']){
    const task=model.tasks.find(t=>t.id===id);
    assert.ok(task,id);
    assert.equal(task.status,'research');
    assert.equal(task.type,'experience');
    assert.ok(task.destinationId);
    assert.ok(task.url);
  }
  assert.equal(model.confirmedTasks,0);
});

test('BAR CENTIFOLIA premium booking-fee reminder is linked and unbooked',()=>{
  const model=planner.buildLogistics(trip.trip,trip.destinations);
  const task=model.tasks.find(t=>t.id==='bar-centifolia-reservation-costs');
  assert.ok(task);
  assert.equal(task.priority,'high');
  assert.equal(task.status,'research');
  assert.equal(task.destinationId,'bar-centifolia-azabujuban');
  assert.match(task.note,/NONREFUNDABLE/);
  assert.match(task.note,/¥70,000/);
  assert.equal(model.confirmedTasks,0);
});
