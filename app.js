const stateKey = 'afisha-private-v2';
let personal = {};
let events = [];
let category = 'all';
let tags = new Set();
let venue = 'all';

const editorialLabels = {
  attention: 'ОБРАТИТЬ ВНИМАНИЕ',
  candidate: 'СЕРЬЁЗНЫЙ КАНДИДАТ',
  decide: 'ЛУЧШЕ РЕШИТЬ ЗАРАНЕЕ'
};
const urgencyLabels = {
  none: '',
  no_rush: 'покупать сейчас не нужно',
  watch: 'стоит следить за продажей',
  buy: 'стоит покупать',
  low: 'осталось мало',
  soldout: 'sold out'
};
const categoryLabels = { music: 'МУЗЫКА', theatre: 'ТЕАТР', opera: 'ОПЕРА', talks: 'ЛЕКЦИИ / РАЗГОВОРЫ' };
const horizonMeta = {
  near: { title: 'Ближайшие', text: 'Следующие 2–3 недели — то, что требует решения сейчас. Театр и опера могут появляться здесь раньше даты, если продажа уже требует решения.' },
  buy: { title: 'Купить заранее', text: 'Событие может быть через месяц и дальше: сюда попадает всё, где решение о билете разумно принять уже сейчас.' },
  far: { title: 'Дальний радар', text: 'Редкие вещи: музыка обычно на 1–3 месяца, театр и опера — до 4–6 месяцев, плюс независимый watchlist.' }
};

function loadPersonal(){
  try { personal = JSON.parse(localStorage.getItem(stateKey) || '{}') || {}; }
  catch { personal = {}; }
}
function savePersonal(){ localStorage.setItem(stateKey, JSON.stringify(personal)); }
function esc(s=''){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function eventById(id){ return events.find(e => e.id === id); }
function dateObj(e){ return e.start ? new Date(e.start) : null; }
function isPast(e){ const d = e.end ? new Date(e.end) : dateObj(e); return d ? d < new Date() : false; }
function formatDate(e){
  const d = dateObj(e); if(!d) return {date:'дата не объявлена', dow:'watchlist'};
  const date = new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',timeZone:'Europe/Moscow'}).format(d).replace('.','');
  const dow = new Intl.DateTimeFormat('ru-RU',{weekday:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}).format(d).replace(',',' ·');
  return {date, dow};
}
function privateLabel(r){
  if(r.state==='bought') return 'Билет куплен';
  if(r.state==='want') return 'Собираюсь';
  if(r.state==='later') return 'Решить позже';
  if(r.state==='skip') return 'Пропустить';
  return '';
}
function urgencyClass(v){ return ['buy','low','soldout'].includes(v) ? 'urgent' : v==='no_rush' ? 'calm' : 'watch'; }
function renderCard(e){
  const d = formatDate(e); const r = personal[e.id] || {};
  const classes = ['card','event', e.featured ? 'feature' : '', r.state ? 'personal-'+r.state : ''].filter(Boolean).join(' ');
  const dateBox = e.featured ? `<div class="datebox"><span class="dow">${esc(d.dow)}</span><span class="date">${esc(d.date)}</span></div>` : '';
  const timofey = r.timofey ? `<span class="timofey-badge">с Тимофеем</span>` : '';
  const visibleTags = (e.visible_tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('');
  const urgency = urgencyLabels[e.ticket_urgency] || '';
  const source = e.source_url ? `<a class="button" href="${esc(e.source_url)}" target="_blank" rel="noopener">${esc(e.source_label||'Источник')}</a>` : '';
  const price = e.price ? `<span class="price">${esc(e.price)}</span>` : '';
  const calendarHint = r.state==='bought' && !r.calendar ? `<span class="calendar-added">билет куплен — добавьте событие в календарь</span>` : (r.calendar ? `<span class="calendar-added">календарь отмечен</span>` : '');
  const inner = `
    ${timofey}
    <div class="meta"><span class="tag ${esc(e.category)}">${esc(categoryLabels[e.category]||e.category)}</span>${visibleTags}</div>
    <div class="editorial ${esc(e.editorial_status)}">${esc(editorialLabels[e.editorial_status]||'')}</div>
    <div class="title">${esc(e.display_title||e.title)}</div>
    <div class="venue">${esc(e.venue)}</div>
    <div class="place">${esc(e.place||'')}</div>
    ${(e.people||price) ? `<div class="line">${esc(e.people||'')}${e.people&&price?' · ':''}${price}</div>` : ''}
    <div class="why"><strong>Почему попало:</strong> ${esc(e.why||'')}</div>
    ${urgency ? `<div class="statusline"><span class="status ${urgencyClass(e.ticket_urgency)}">Билеты: ${esc(urgency)}</span></div>` : ''}
    ${e.verified===false ? `<div class="unverified">Рабочая карточка: дату/цену/ссылку нужно перепроверить перед покупкой.</div>` : ''}
    ${e.details ? `<div class="details"><details><summary>${esc(e.details_label||'Подробнее')}</summary><div class="full">${esc(e.details)}</div></details></div>` : ''}
    <details class="private-notes">
      <summary>Личные заметки</summary>
      <div class="note-grid">
        <div class="note-field"><label for="before-${esc(e.id)}">До события</label><textarea id="before-${esc(e.id)}" data-note="before" data-id="${esc(e.id)}" placeholder="Зачем хочу пойти, с кем, что проверить…">${esc(r.noteBefore||'')}</textarea></div>
        <div class="note-field"><label for="after-${esc(e.id)}">Что осталось?</label><textarea id="after-${esc(e.id)}" data-note="after" data-id="${esc(e.id)}" placeholder="Одна мысль, образ, музыкальная фраза, раздражение, вопрос…">${esc(r.noteAfter||'')}</textarea></div>
      </div>
      <div class="private-hint">Хранится только в localStorage этого браузера и попадает в Ваш ручной экспорт JSON.</div>
    </details>
    <div class="card-footer">
      <div>
        <div class="actions">
          ${e.start ? `<button class="calendarBtn ${r.state==='bought'&&!r.calendar?'need-calendar':''}" data-id="${esc(e.id)}">.ics</button><button class="googleBtn" data-id="${esc(e.id)}">Google Calendar</button>` : ''}
          ${source}
        </div>
        ${calendarHint}
      </div>
      <div class="private-controls" data-private="${esc(e.id)}">
        <button data-state="want" class="${r.state==='want'?'selected':''}">Собираюсь</button>
        <button data-state="bought" class="${r.state==='bought'?'selected':''}">Куплено</button>
        <button data-state="later" class="${r.state==='later'?'selected':''}">Позже</button>
        <button data-state="timofey" class="${r.timofey?'selected':''}">С Тимофеем</button>
        <button data-state="skip" class="${r.state==='skip'?'selected':''}">Пропустить</button>
      </div>
    </div>`;
  return `<article class="${classes}" id="event-${esc(e.id)}" data-id="${esc(e.id)}" data-category="${esc(e.category)}" data-tags="${esc((e.tags||[]).join(','))}" data-venue="${esc(e.venue)}">${dateBox}<div>${inner}</div></article>`;
}
function renderMain(){
  const host = document.getElementById('mainContent');
  host.innerHTML = ['near','buy','far'].map(h=>{
    const list = events.filter(e=>e.horizon===h && !isPast(e));
    return `<section data-horizon="${h}"><div class="section-head"><div><h2>${horizonMeta[h].title}</h2><p>${horizonMeta[h].text}</p></div></div><div class="grid">${list.length?list.map(renderCard).join(''):'<div class="empty-section">Пока пусто.</div>'}</div></section>`;
  }).join('');
  populateVenues(); applyFilters(); renderPlans();
}
function populateVenues(){
  const select=document.getElementById('venueFilter');
  const current=select.value;
  select.innerHTML='<option value="all">Площадка: все</option>';
  [...new Set(events.map(x=>x.venue).filter(v=>v&&v!=='Watchlist'))].sort((a,b)=>a.localeCompare(b,'ru')).forEach(v=>{
    const o=document.createElement('option'); o.value=v; o.textContent=v; select.appendChild(o);
  });
  if([...select.options].some(o=>o.value===current)) select.value=current;
}
function applyFilters(){
  let visible = 0;
  document.querySelectorAll('section[data-horizon]').forEach(section=>{
    let sectionVisible = 0;
    section.querySelectorAll('.event').forEach(c=>{
      const catOk=category==='all'||c.dataset.category===category;
      const ctags=(c.dataset.tags||'').split(',').filter(Boolean);
      const tagOk=[...tags].every(t=>ctags.includes(t));
      const venueOk=venue==='all'||c.dataset.venue===venue;
      const match=catOk&&tagOk&&venueOk;
      c.classList.toggle('hidden',!match);
      c.style.display=match?'':'none';
      if(match){visible++;sectionVisible++;}
    });
    section.classList.toggle('section-filter-empty',sectionVisible===0);
  });
  const summary=document.getElementById('filterSummary');
  if(summary){
    const venueText=venue==='all'?'все площадки':venue;
    summary.textContent=`Показано: ${visible} · ${venueText}`;
  }
}
function countRange(days){
  const now=new Date(), until=new Date(now.getTime()+days*86400000);
  const rows=events.filter(e=>{const d=dateObj(e); const r=personal[e.id]||{}; return d&&d>=now&&d<=until&&['want','bought'].includes(r.state);});
  return {bought:rows.filter(e=>personal[e.id]?.state==='bought').length,want:rows.filter(e=>personal[e.id]?.state==='want').length};
}
function renderPlans(){
  const host=document.getElementById('plansList');
  const rows=events.filter(e=>{const r=personal[e.id]||{}; return (r.state&&r.state!=='skip')||r.timofey||r.calendar||r.noteBefore||r.noteAfter;}).sort((a,b)=>{
    const da=dateObj(a), db=dateObj(b); if(!da&&!db)return a.title.localeCompare(b.title,'ru'); if(!da)return 1;if(!db)return -1;return da-db;
  });
  host.innerHTML=rows.length?rows.map(e=>{const r=personal[e.id]||{};const d=formatDate(e);return `<div class="plan-item" data-jump="${esc(e.id)}"><strong>${esc(e.title)}</strong><div class="mini">${esc(d.date)} · ${esc(privateLabel(r)||'есть личная заметка')}${r.timofey?' · с Тимофеем':''}${r.noteAfter?' · есть «Что осталось?»':''}</div></div>`;}).join(''):'<span class="plan-empty">Пока ничего не отмечено.</span>';
  const w=countRange(7), m=countRange(30);
  document.getElementById('loadSummary').textContent=`Следующие 7 дней: ${w.bought} куплено · ${w.want} собираюсь. Следующие 30 дней: ${m.bought} куплено · ${m.want} собираюсь.`;
}
function updatePersonalState(id,state){
  personal[id]=personal[id]||{};
  if(state==='timofey') personal[id].timofey=!personal[id].timofey;
  else personal[id].state=personal[id].state===state?null:state;
  cleanRecord(id); savePersonal(); renderMain();
}
function cleanRecord(id){
  const r=personal[id]; if(!r)return;
  if(!r.state&&!r.timofey&&!r.calendar&&!r.noteBefore&&!r.noteAfter) delete personal[id];
}
function saveNote(id,kind,value){
  personal[id]=personal[id]||{};
  personal[id][kind==='before'?'noteBefore':'noteAfter']=value;
  cleanRecord(id); savePersonal(); renderPlans();
}
function icsEscape(s=''){return String(s).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');}
function fmtICS(dt){if(!dt)return '';const d=new Date(dt);const p=n=>String(n).padStart(2,'0');return d.getUTCFullYear()+p(d.getUTCMonth()+1)+p(d.getUTCDate())+'T'+p(d.getUTCHours())+p(d.getUTCMinutes())+p(d.getUTCSeconds())+'Z';}
function descriptionFor(e){return [e.details,e.why,e.source_url?`Источник: ${e.source_url}`:''].filter(Boolean).join('\n\n');}
function markCalendar(id){personal[id]=personal[id]||{}; personal[id].calendar=true; savePersonal(); renderMain();}
function downloadICS(e){
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Cultradar//RU','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${e.id}@cultradar`,`DTSTART:${fmtICS(e.start)}`,`DTEND:${fmtICS(e.end||e.start)}`,`SUMMARY:${icsEscape(e.title)}`,`LOCATION:${icsEscape(e.location||e.venue||'')}`,`DESCRIPTION:${icsEscape(descriptionFor(e))}`,e.source_url?`URL:${e.source_url}`:'','END:VEVENT','END:VCALENDAR'].filter(Boolean);
  const blob=new Blob([lines.join('\r\n')],{type:'text/calendar;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${e.id}.ics`;a.click();URL.revokeObjectURL(a.href);markCalendar(e.id);
}
function googleCalendar(e){
  const q=new URLSearchParams({action:'TEMPLATE',text:e.title,dates:`${fmtICS(e.start)}/${fmtICS(e.end||e.start)}`,details:descriptionFor(e),location:e.location||e.venue||'',ctz:'Europe/Moscow'});
  window.open(`https://calendar.google.com/calendar/render?${q.toString()}`,'_blank','noopener'); markCalendar(e.id);
}
function setupStaticControls(){
  document.querySelectorAll('#categoryNav button').forEach(b=>b.addEventListener('click',()=>{category=b.dataset.category;document.querySelectorAll('#categoryNav button').forEach(x=>x.classList.toggle('active',x===b));applyFilters();}));
  document.querySelectorAll('#tagFilters button').forEach(b=>b.addEventListener('click',()=>{const t=b.dataset.tag;tags.has(t)?tags.delete(t):tags.add(t);b.classList.toggle('on',tags.has(t));applyFilters();}));
  document.getElementById('venueFilter').addEventListener('change',e=>{venue=e.target.value;applyFilters();});
  document.getElementById('exportBtn').addEventListener('click',()=>{const payload={schema_version:3,exported_at:new Date().toISOString(),personal};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='cultradar-private.json';a.click();URL.revokeObjectURL(a.href);});
  document.getElementById('importInput').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());personal=(data&&data.personal)||data||{};savePersonal();renderMain();alert('Личные данные импортированы.');}catch{alert('Не удалось прочитать JSON.');}e.target.value='';});
  document.getElementById('togglePlans').addEventListener('click',e=>{const body=document.getElementById('plansBody');const hidden=body.hidden=!body.hidden;e.target.textContent=hidden?'Развернуть':'Свернуть';e.target.setAttribute('aria-expanded',String(!hidden));});
}
function setupDelegation(){
  document.addEventListener('click',e=>{
    const stateBtn=e.target.closest('[data-private] button'); if(stateBtn){updatePersonalState(stateBtn.closest('[data-private]').dataset.private,stateBtn.dataset.state);return;}
    const ics=e.target.closest('.calendarBtn'); if(ics){const ev=eventById(ics.dataset.id);if(ev)downloadICS(ev);return;}
    const g=e.target.closest('.googleBtn'); if(g){const ev=eventById(g.dataset.id);if(ev)googleCalendar(ev);return;}
    const jump=e.target.closest('[data-jump]'); if(jump){document.getElementById(`event-${jump.dataset.jump}`)?.scrollIntoView({behavior:'smooth',block:'center'});}
  });
  document.addEventListener('input',e=>{const ta=e.target.closest('textarea[data-note]');if(!ta)return;saveNote(ta.dataset.id,ta.dataset.note,ta.value);});
}
async function init(){
  loadPersonal(); setupStaticControls(); setupDelegation();
  try{
    const res=await fetch('events.json',{cache:'no-store'}); if(!res.ok)throw new Error(`HTTP ${res.status}`); const data=await res.json(); events=data.events||[];
    if(data.meta?.note){const n=document.getElementById('dataNote');n.textContent=`Обновлено ${data.meta.updated||''}. ${data.meta.note}`;n.hidden=false;}
    renderMain();
  }catch(err){document.getElementById('mainContent').innerHTML=`<div class="loading">Не удалось загрузить events.json: ${esc(err.message)}</div>`;}
}
init();