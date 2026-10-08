const fs=require('fs');
const cfg=JSON.parse(fs.readFileSync('sweep.config.json','utf8'));
const plan=JSON.parse(fs.readFileSync('sweep-output/plan.json','utf8'));
const key=process.env.OPENAI_API_KEY;
if(!key){console.log('OPENAI_API_KEY is not set; plan-only dry run.');process.exit(0);}
const schema={type:'object',additionalProperties:false,properties:{source_url:{type:'string'},events:{type:'array',items:{type:'object',additionalProperties:false,properties:{title:{type:'string'},date:{type:['string','null']},time:{type:['string','null']},venue_text:{type:['string','null']},event_url:{type:['string','null']},needs_review:{type:'boolean'},evidence:{type:'string'}},required:['title','date','time','venue_text','event_url','needs_review','evidence']}}},required:['source_url','events']};
function strip(html){return html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim().slice(0,120000);}
async function main(){
 const results=[];
 for(const src of plan.selected){
  try{
   const r=await fetch(src.url,{headers:{'user-agent':'CultradarSweep/0.1 (+https://github.com/timurspace/moscow-cultradar)'}});
   if(!r.ok)throw new Error('HTTP '+r.status);
   const text=strip(await r.text());
   const prompt=`Official venue: ${src.name}\nOfficial page: ${src.url}\nExtract only cultural events explicitly present in the supplied page text. Never guess date, time, venue, people, or URL. If an event cannot be tied to a date, omit it. Set needs_review=true for ambiguity. event_url must be null unless an event-specific absolute URL is explicitly present in the text. Page text:\n${text}`;
   const body={model:process.env.OPENAI_MODEL||cfg.model,reasoning:{effort:'none'},input:prompt,text:{format:{type:'json_schema',name:'cultradar_events',strict:true,schema}}};
   const api=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify(body)});
   const data=await api.json(); if(!api.ok)throw new Error(JSON.stringify(data));
   const outText=data.output_text||data.output?.flatMap(x=>x.content||[]).map(x=>x.text||'').join('')||'';
   results.push({source:src,extraction:JSON.parse(outText),usage:data.usage||null});
  }catch(e){results.push({source:src,error:String(e.message||e)});}
 }
 fs.writeFileSync('sweep-output/extraction.json',JSON.stringify({generated_at:new Date().toISOString(),model:process.env.OPENAI_MODEL||cfg.model,results},null,2)+'\n');
 console.log(JSON.stringify({sources:results.length,errors:results.filter(x=>x.error).length},null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});
