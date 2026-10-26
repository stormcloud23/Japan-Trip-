/* Offline cached Japanese railway GIS overlay for schematic itinerary legs.
 * Routes extracted from Japanese MLIT N02 railway centerline geometry (2024).
 * Non-matching / newly added itinerary legs retain straight-line fallback.
 * Browser global: JapanRailGeometry. Node tests: require('./rail-geometry.js').
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.JapanRailGeometry=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const RAD=Math.PI/180;
  function valid(p){return Array.isArray(p)&&p.length>=2&&p.every((x,i)=>i>=2||Number.isFinite(x))&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90;}
  function km(a,b){
    const mean=(a[1]+b[1])/2*RAD;
    return Math.hypot((a[0]-b[0])*111.195*Math.cos(mean),(a[1]-b[1])*111.195);
  }
  const MATCH_TOLERANCE_KM=0.4;
  const ACCESS_THRESHOLD_KM=0.20;
  function verifiedCorridors(catalog){
    if(!catalog||!Array.isArray(catalog.corridors))return [];
    return catalog.corridors.filter(c=>
      c&&['rail','shinkansen'].includes(c.mode)&&valid(c.from)&&valid(c.to)&&
      Array.isArray(c.coordinates)&&c.coordinates.length>=2&&
      c.coordinates.every(p=>valid(p))
    );
  }
  function matching(feature,corridors){
    if(!feature||feature.geometry?.type!=='LineString'||!['rail','shinkansen'].includes(feature.properties?.mode))return null;
    const input=feature.geometry.coordinates;
    if(!Array.isArray(input)||input.length<2||!valid(input[0])||!valid(input.at(-1)))return null;
    const a=input[0],b=input.at(-1);
    let match=null;
    for(const c of corridors){
      if(c.mode!==feature.properties.mode)continue;
      for(const reversed of [false,true]){
        const from=reversed?c.to:c.from,to=reversed?c.from:c.to;
        const before=km(a,from),after=km(b,to);
        if(before>MATCH_TOLERANCE_KM||after>MATCH_TOLERANCE_KM)continue;
        const score=before+after;
        if(!match||score<match.score)match={corridor:c,reversed,score};
      }
    }
    return match;
  }
  function applyCorridors(featureCollection,catalog){
    if(!featureCollection||featureCollection.type!=='FeatureCollection'||!Array.isArray(featureCollection.features)){
      throw Error('Expected itinerary GeoJSON FeatureCollection');
    }
    const corridors=verifiedCorridors(catalog);
    const features=[],mappedLegs=new Set();
    let mapped=0,fallback=0,access=0;
    for(const feature of featureCollection.features){
      const found=matching(feature,corridors);
      if(!found){
        features.push(feature);
        if(['rail','shinkansen'].includes(feature.properties?.mode))fallback++;
        continue;
      }
      const corridor=found.corridor,geometry=found.reversed?
        [...corridor.coordinates].reverse():corridor.coordinates;
      const original=feature.geometry.coordinates;
      const a=original[0],b=original.at(-1),entry=geometry[0],exit=geometry.at(-1);
      const originDistance=km(a,entry),destinationDistance=km(exit,b);
      const metadata={...feature.properties,corridorId:corridor.id,source:'MLIT-N02-2024',
        routeTrackKm:corridor.track_km,geometrySource:'railway-gis',schematic:false};
      if(originDistance>ACCESS_THRESHOLD_KM){
        features.push({
          type:'Feature',
          properties:{...feature.properties,mode:'ground',geometrySource:'approximate-access',
            accessEnd:'origin',approxDistanceKm:+originDistance.toFixed(2)},
          geometry:{type:'LineString',coordinates:[a,entry]}
        });access++;
      }
      features.push({type:'Feature',properties:metadata,
        geometry:{type:'LineString',coordinates:geometry}});
      mapped++;mappedLegs.add(corridor.id);
      if(destinationDistance>ACCESS_THRESHOLD_KM){
        features.push({
          type:'Feature',
          properties:{...feature.properties,mode:'ground',geometrySource:'approximate-access',
            accessEnd:'destination',approxDistanceKm:+destinationDistance.toFixed(2)},
          geometry:{type:'LineString',coordinates:[exit,b]}
        });access++;
      }
    }
    return {type:'FeatureCollection',features,
      summary:{mappedRailLegs:mapped,unmappedRailLegs:fallback,accessConnectors:access,
        matchedCorridors:[...mappedLegs]}};
  }
  return {applyCorridors,verifiedCorridors,matching,km};
});
