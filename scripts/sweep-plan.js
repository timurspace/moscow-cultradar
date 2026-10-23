const fs=require('fs');
const sources=JSON.parse(fs.readFileSync('sources.json','utf8'));
const cfg=JSON.parse(fs.readFileSync('sweep.config.json','utf8'));
const today=new Date(process.env.SWEEP_DATE||new Date().toISOString().slice(0,10)+'T00:00:00Z');
const day=86400000;
function tier(v){
  const o=cfg.overrides[v.name]; if(o?.tier)return o.tier;
  if((v.event_count||0)>=cfg.tiers.heavy.min_event_count)return 'heavy';
  if((v.event_count||0)>=cfg.tiers.regular.min_event_count)return 'regular';
  return 'light';
}
const rows=sources.venues.filter(v=>v.role==='venue'&&v.coverage_status!=='closed').map(v=>{
  const t=tier(v), cadence=cfg.overrides[v.name]?.cadence_days||cfg.tiers[t].cadence_days;
  const last=v.last_checked?new Date(v.last_checked+'T00:00:00Z'):new Date(0);
  const age=Math.floor((today-last)/day);
  return {name:v.name,url:v.url,event_count:v.event_count||0,last_checked:v.last_checked||null,tier:t,cadence_days:cadence,age_days:age,due:age>=cadence};
}).sort((a,b)=>(b.due-a.due)||({heavy:3,regular:2,light:1}[b.tier]-{heavy:3,regular:2,light:1}[a.tier])||(b.age_days-a.age_days)||(b.event_count-a.event_count));
const due=rows.filter(x=>x.due);
const selected=[]; const seenUrls=new Set();
for(const row of due){if(selected.length>=cfg.max_sources_per_run)break;if(!row.url||seenUrls.has(row.url))continue;seenUrls.add(row.url);selected.push(row);}
const out={generated_at:new Date().toISOString(),model:cfg.model,total_venues:rows.length,due_count:due.length,selected};
fs.mkdirSync('sweep-output',{recursive:true});fs.writeFileSync('sweep-output/plan.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
