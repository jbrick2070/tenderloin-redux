import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { project } from './build-godot-data.mjs';

export function deriveVotingPlaces(text, addresses, map) {
  const rows=text.trim().split(/\r?\n/).slice(1).map(line=>line.split('\t'));
  const streets=[...map.streets,...map.wider_streets].filter(s=>s.name==='Eddy Street');
  const sites=[['750','490999',6,'Cadillac Hotel','380 Eddy St','Lobby'],['2092','490979',8,'Boeddeker Park & Clubhouse','246 Eddy St','Meeting Room']].map(([id,eas,offset,name,address,room])=>{
    const row=rows.find(r=>r[0]==='2024NOVGEN'&&r[1]===id);
    const point=addresses.find(a=>a.eas_address_id===eas);
    if (!row||row[5]!==address||!row[4].includes(room)||!point) throw Error('Missing exact historical polling/site identity');
    const lonlat=[Number(point.longitude),Number(point.latitude)],xz=project(lonlat);
    let nearest=null;
    for(const street of streets)for(let i=1;i<street.points.length;i++){
      const a=street.points[i-1],b=street.points[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
      const t=Math.max(0,Math.min(1,((xz[0]-a[0])*dx+(xz[1]-a[1])*dz)/(length*length)));
      const p=[a[0]+t*dx,a[1]+t*dz],d=Math.hypot(p[0]-xz[0],p[1]-xz[1]);
      if(!nearest||d<nearest.distance){const sign=(xz[0]-p[0])*(-dz)+(xz[1]-p[1])*dx>=0?1:-1;nearest={distance:d,street_id:street.id,centerline:p,observation:[p[0]-dz/length*offset*sign,p[1]+dx/length*offset*sign]};}
    }
    if(!nearest||nearest.distance>40)throw Error('No nearby sourced Eddy observation');
    return {id,name,address,room,eas_id:eas,lonlat,xz,...nearest,offset_m:offset,listed_description:row[4],list_date:'2024-10-03'};
  });
  return {format:1,election:'2024-11-05',published:'2024-10-03',sites,streets:[...new Map([...map.streets,...map.wider_streets].map(street=>[street.id,street])).values()].filter(s=>['Eddy Street','Turk Street','Taylor Street','Jones Street','Leavenworth Street'].includes(s.name)&&s.points.some(p=>p[0]>-340&&p[0]<30&&p[1]>-140&&p[1]<70)),precision:'Two entries from a dated official published list. City address pins are not surveyed historical entrances or rooms. Outdoor observation positions are derived game stops, not polling doors. Later relocations unverified.',url:'https://sfelections.org/tools/election_data/datasets/2024-11-05/PODJ011_PollingPlaces_20241003.txt'};
}
export async function buildVotingPlaces(){
  const paths=['docs/research/2026-10-22-episode-locations/polling-2024-official-selected-rows.tsv','docs/research/2026-10-22-episode-locations/polling-addresses.json','godot/data/buildings.json'];
  const bytes=await Promise.all(paths.map(p=>readFile(p)));
  const result=deriveVotingPlaces(bytes[0].toString('utf8'),JSON.parse(bytes[1]),JSON.parse(bytes[2]));
  result.source_sha256=Object.fromEntries(paths.map((p,i)=>[p,createHash('sha256').update(bytes[i]).digest('hex')]));
  await writeFile('godot/data/voting_places.json',JSON.stringify(result,null,2)+'\n');return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await buildVotingPlaces();
