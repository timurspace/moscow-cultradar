const stateKey = 'afisha-private-v2';
const densityKey = 'cultradar-density-v1';
let personal = {};
let events = [];
let category = 'all';
let tags = new Set();
let selectedVenues = new Set();
let venueGroups = [];
let venueUrls = {};
let rangeDays = 'all';
let cardTag = 'all';
let editorialFilter = 'all';
let cardDensity = '2';

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
const categoryLabels = { music: 'МУЗЫКА', theatre: 'ТЕАТР', opera: 'ОПЕРА / БАЛЕТ', talks: 'ЛЕКЦИИ / РАЗГОВОРЫ' };
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
function loadDensity(){
  const saved=localStorage.getItem(densityKey);
  cardDensity=['1','2','3'].includes(saved)?saved:'2';
}
function applyDensity(){
  document.body.dataset.density=cardDensity;
  document.querySelectorAll('#densityNav button').forEach(b=>b.classList.toggle('active',b.dataset.density===cardDensity));
}
function setDensity(value){
  if(!['1','2','3'].includes(value))return;
  cardDensity=value;
  localStorage.setItem(densityKey,cardDensity);
  applyDensity();
}
function esc(s=''){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function eventById(id){ return events.find(e => e.id === id); }
function eventLink(e){ return e?.source_url || venueUrls[e?.venue] || ''; }
function dateObj(e){ if(e.start) return new Date(e.start); if(e.date_only) return new Date(e.date_only+'T12:00:00+03:00'); return null; }
function isPast(e){ const d = e.end ? new Date(e.end) : dateObj(e); return d ? d < new Date() : false; }
function formatDate(e){
  const d = dateObj(e); if(!d) return {date:'дата не объявлена', dow:'watchlist'};
  const date = new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',timeZone:'Europe/Moscow'}).format(d).replace('.','');
  const dow = e.start ? new Intl.DateTimeFormat('ru-RU',{weekday:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}).format(d).replace(',',' ·') : new Intl.DateTimeFormat('ru-RU',{weekday:'short',timeZone:'Europe/Moscow'}).format(d);
  return {date, dow};
}
function privateLabel(r){
  if(r.state==='bought') return 'Билет куплен';
  if(r.state==='want') return 'Собираюсь';
  if(r.state==='later') return 'Решить позже';
  if(r.state==='skip') return 'Пропустить';
  if(r.state==='visited') return 'Был';
  return '';
}
function urgencyClass(v){ return ['buy','low','soldout'].includes(v) ? 'urgent' : v==='no_rush' ? 'calm' : 'watch'; }
function renderCard(e){
  const d = formatDate(e); const r = personal[e.id] || {};
  const classes = ['card','event', e.featured ? 'feature' : '', r.state ? 'personal-'+r.state : ''].filter(Boolean).join(' ');
  const dateBox = `<div class="datebox"><span class="dow">${esc(d.dow)}</span><span class="date">${esc(d.date)}</span></div>`;
  const timofey = r.timofey ? `<span class="timofey-badge">с Тимофеем</span>` : '';
  const visibleTags = (e.visible_tags||[]).map(t=>`<button type="button" class="tag card-tag" data-card-tag="${esc(t)}" title="Показать события с меткой «${esc(t)}»">${esc(t)}</button>`).join('');
  const urgency = urgencyLabels[e.ticket_urgency] || '';
  const sourceHref = eventLink(e);
  const sourceIsVenue = e.source_scope==='venue' || (!e.source_url && Boolean(venueUrls[e.venue]));
  const source = sourceHref ? `<a class="button event-source" href="${esc(sourceHref)}" target="_blank" rel="noopener" title="${esc(e.source_label||e.venue||'Источник')}">${sourceIsVenue?'Сайт площадки ↗':'Открыть событие ↗'}</a>` : '';
  const price = e.price ? `<span class="price">${esc(e.price)}</span>` : '';
  const calendarHint = r.state==='bought' && !r.calendar ? `<span class="calendar-added">билет куплен — добавьте событие в календарь</span>` : (r.calendar ? `<span class="calendar-added">календарь отмечен</span>` : '');
  const inner = `
    ${timofey}
    <div class="meta"><button type="button" class="tag card-category ${esc(e.category)}" data-card-category="${esc(e.category)}" title="Фильтровать по разделу">${esc(categoryLabels[e.category]||e.category)}</button>${e.venue_short?`<button type="button" class="tag venue-short card-venue" data-card-venue="${esc(e.venue)}" title="Показать события этой площадки">${esc(e.venue_short)}</button>`:''}${visibleTags}</div>
    <button type="button" class="editorial editorial-filter ${esc(e.editorial_status)}" data-editorial="${esc(e.editorial_status)}" title="Фильтровать по редакционному статусу">${esc(editorialLabels[e.editorial_status]||'')}</button>
    <div class="title">${esc(e.display_title||e.title)}</div>
    ${Array.isArray(e.composers)&&e.composers.length?`<div class="composer-line"><strong>Композиторы:</strong> ${esc(e.composers.join(' · '))}</div>`:''}
    ${Array.isArray(e.works)&&e.works.length?`<div class="works-line"><strong>Программа:</strong> ${esc(e.works.slice(0,3).join(' · '))}${e.works.length>3?` <span class="works-more">+ ещё ${e.works.length-3}</span>`:''}</div>`:(e.program_status?`<div class="works-line program-status"><strong>Программа:</strong> ${esc(e.program_status)}</div>`:'')}
    <div class="venue">${esc(e.venue)}</div>
    <div class="place">${esc(e.place||'')}</div>
    ${(e.people||price) ? `<div class="line">${esc(e.people||'')}${e.people&&price?' · ':''}${price}</div>` : ''}
    <div class="why"><strong>Почему попало:</strong> ${esc(e.why||'')}</div>
    ${urgency ? `<div class="statusline"><span class="status ${urgencyClass(e.ticket_urgency)}">Билеты: ${esc(urgency)}</span>${e.sales_status?`<span class="status sales-status">${esc(e.sales_status)}</span>`:''}</div>` : (e.sales_status?`<div class="statusline"><span class="status sales-status">${esc(e.sales_status)}</span></div>`:'')}
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
        <button data-state="visited" class="${r.state==='visited'?'selected':''}">Был</button>
        <button data-state="skip" class="${r.state==='skip'?'selected':''}">Пропустить</button>
      </div>
    </div>`;
  return `<article class="${classes}" id="event-${esc(e.id)}" data-id="${esc(e.id)}" data-category="${esc(e.category)}" data-tags="${esc((e.tags||[]).join(','))}" data-visible-tags="${esc((e.visible_tags||[]).join('||'))}" data-venue="${esc(e.venue)}">${dateBox}<div>${inner}</div></article>`;
}
function renderMain(){
  const host = document.getElementById('mainContent');
  host.innerHTML = ['near','buy','far'].map(h=>{
    const list = events.filter(e=>e.horizon===h && !isPast(e)).sort((a,b)=>{
      const da=dateObj(a), db=dateObj(b);
      if(!da&&!db) return (a.title||'').localeCompare(b.title||'','ru');
      if(!da) return 1;
      if(!db) return -1;
      return da-db;
    });
    return `<section data-horizon="${h}"><div class="section-head"><div><h2>${horizonMeta[h].title}</h2><p>${horizonMeta[h].text}</p></div></div><div class="grid">${list.length?list.map(renderCard).join(''):'<div class="empty-section">Пока пусто.</div>'}</div></section>`;
  }).join('');
  populateVenues(); applyFilters(); renderPlans(); renderVisited();
}
function populateVenues(){
  const host=document.getElementById('venueFilters');
  if(!host)return;
  const eventVenues=[...new Set(events.map(x=>x.venue).filter(v=>v&&v!=='Watchlist'))].sort((a,b)=>a.localeCompare(b,'ru'));
  const eventVenueSet=new Set(eventVenues);
  const groups=(venueGroups||[]).map(g=>({
    name:g.name,
    member_venues:(g.member_venues||[]).filter(v=>eventVenueSet.has(v))
  })).filter(g=>g.member_venues.length);
  const grouped=new Set(groups.flatMap(g=>g.member_venues));
  const others=eventVenues.filter(v=>!grouped.has(v));
  const venueRow=v=>`<label class="venue-check venue-child"><input type="checkbox" data-venue="${esc(v)}"><span>${esc(v)}</span></label>`;
  host.innerHTML=`
    <div class="venue-filter-head"><strong>Площадки</strong><button type="button" class="venue-close" aria-label="Свернуть выбор площадок">Свернуть</button></div>
    <label class="venue-check venue-all"><input type="checkbox" data-venue-all><span>Все площадки</span></label>
    <div class="venue-groups">
      ${groups.map((g,i)=>`<div class="venue-group">
        <label class="venue-check venue-parent"><input type="checkbox" data-venue-group="${i}"><strong>${esc(g.name)}</strong></label>
        <div class="venue-children">${g.member_venues.map(venueRow).join('')}</div>
      </div>`).join('')}
      ${others.length?`<div class="venue-group"><div class="venue-parent venue-other-title"><strong>Другие площадки</strong></div><div class="venue-children">${others.map(venueRow).join('')}</div></div>`:''}
    </div><div class="venue-filter-foot"><button type="button" class="venue-close venue-close-bottom" aria-label="Свернуть выбор площадок">Свернуть площадки</button></div>`;
  host._venueGroupData=groups;
  updateVenueFilterUI();
}
function updateVenueFilterUI(){
  const host=document.getElementById('venueFilters');
  if(!host)return;
  const eventVenues=[...new Set(events.map(x=>x.venue).filter(v=>v&&v!=='Watchlist'))];
  const all=host.querySelector('[data-venue-all]');
  if(all)all.checked=selectedVenues.size===0;
  host.querySelectorAll('[data-venue]').forEach(input=>{
    input.checked=selectedVenues.has(input.dataset.venue);
  });
  const groups=host._venueGroupData||[];
  host.querySelectorAll('[data-venue-group]').forEach(input=>{
    const members=groups[Number(input.dataset.venueGroup)]?.member_venues||[];
    const selected=members.filter(v=>selectedVenues.has(v)).length;
    input.checked=members.length>0&&selected===members.length;
    input.indeterminate=selected>0&&selected<members.length;
  });
  const label=document.getElementById('venueFilterLabel');
  if(label){
    if(selectedVenues.size===0)label.textContent='Площадки: все';
    else if(selectedVenues.size===1)label.textContent=`Площадка: ${[...selectedVenues][0]}`;
    else label.textContent=`Площадки: выбрано ${selectedVenues.size}`;
  }
  document.querySelectorAll('.card-venue').forEach(b=>b.classList.toggle('on',selectedVenues.size===1&&selectedVenues.has(b.dataset.cardVenue)));
  if(selectedVenues.size>eventVenues.length){
    selectedVenues=new Set([...selectedVenues].filter(v=>eventVenues.includes(v)));
  }
}
function handleVenueFilterChange(e){
  const input=e.target.closest('#venueFilters input[type="checkbox"]');
  if(!input)return;
  const host=document.getElementById('venueFilters');
  if(input.hasAttribute('data-venue-all')){
    selectedVenues.clear();
  }else if(input.hasAttribute('data-venue-group')){
    const group=(host._venueGroupData||[])[Number(input.dataset.venueGroup)];
    const members=group?.member_venues||[];
    if(input.checked)members.forEach(v=>selectedVenues.add(v));
    else members.forEach(v=>selectedVenues.delete(v));
  }else if(input.dataset.venue){
    if(input.checked)selectedVenues.add(input.dataset.venue);
    else selectedVenues.delete(input.dataset.venue);
  }
  updateVenueFilterUI();
  applyFilters();
}
function applyFilters(){
  let visible = 0;
  document.querySelectorAll('section[data-horizon]').forEach(section=>{
    let sectionVisible = 0;
    section.querySelectorAll('.event').forEach(c=>{
      const catOk=category==='all'||c.dataset.category===category;
      const ctags=(c.dataset.tags||'').split(',').filter(Boolean);
      const tagOk=[...tags].every(t=>ctags.includes(t));
      const venueOk=selectedVenues.size===0||selectedVenues.has(c.dataset.venue);
      const cVisibleTags=(c.dataset.visibleTags||'').split('||').filter(Boolean);
      const cardTagOk=cardTag==='all'||cVisibleTags.includes(cardTag);
      const ev=eventById(c.dataset.id);
      const editorialOk=editorialFilter==='all'||ev?.editorial_status===editorialFilter;
      let rangeOk=true;
      if(rangeDays!=='all'){
        const d=ev?dateObj(ev):null;
        if(!d){ rangeOk=false; }
        else{
          const now=new Date();
          const until=new Date(now.getTime()+Number(rangeDays)*86400000);
          rangeOk=d>=now&&d<=until;
        }
      }
      const match=catOk&&tagOk&&venueOk&&cardTagOk&&editorialOk&&rangeOk;
      c.classList.toggle('hidden',!match);
      c.style.display=match?'':'none';
      if(match){visible++;sectionVisible++;}
    });
    section.classList.toggle('section-filter-empty',sectionVisible===0);
  });
  const summary=document.getElementById('filterSummary');
  if(summary){
    const venueText=selectedVenues.size===0?'все площадки':selectedVenues.size===1?[...selectedVenues][0]:`площадок: ${selectedVenues.size}`;
    const rangeText=rangeDays==='all'?'весь горизонт':`${rangeDays} дней`;
    const tagText=cardTag==='all'?'':` · метка: ${cardTag}`;
    const editorialText=editorialFilter==='all'?'':` · статус: ${editorialLabels[editorialFilter]||editorialFilter}`;
    summary.textContent=`Показано: ${visible} · ${venueText} · ${rangeText}${tagText}${editorialText}`;
  }
}
function countRange(days){
  const now=new Date(), until=new Date(now.getTime()+days*86400000);
  const rows=events.filter(e=>{const d=dateObj(e); const r=personal[e.id]||{}; return d&&d>=now&&d<=until&&['want','bought'].includes(r.state);});
  return {bought:rows.filter(e=>personal[e.id]?.state==='bought').length,want:rows.filter(e=>personal[e.id]?.state==='want').length};
}
function renderPlans(){
  const host=document.getElementById('plansList');
  const rows=events.filter(e=>{
    const r=personal[e.id]||{};
    if(r.state==='visited')return false;
    return ((r.state&&r.state!=='skip')||r.timofey||r.calendar||r.noteBefore||r.noteAfter);
  }).sort((a,b)=>{
    const da=dateObj(a), db=dateObj(b); if(!da&&!db)return a.title.localeCompare(b.title,'ru'); if(!da)return 1;if(!db)return -1;return da-db;
  });
  host.innerHTML=rows.length?rows.map(e=>{
    const r=personal[e.id]||{}; const d=formatDate(e); const stateClass=r.state?` plan-${esc(r.state)}`:'';
    const visitAction=isPast(e)?`<button type="button" class="plan-visited-btn" data-mark-visited="${esc(e.id)}">Был</button>`:'';
    return `<div class="plan-item${stateClass}" data-jump="${esc(e.id)}"><div class="plan-main"><strong>${esc(e.title)}</strong><div class="mini">${esc(d.date)} · ${esc(privateLabel(r)||'есть личная заметка')}${r.timofey?' · с Тимофеем':''}${r.noteAfter?' · есть «Что осталось?»':''}</div></div>${visitAction}</div>`;
  }).join(''):'<span class="plan-empty">Пока ничего не отмечено.</span>';
  const w=countRange(7), m=countRange(30);
  document.getElementById('loadSummary').textContent=`Следующие 7 дней: ${w.bought} куплено · ${w.want} собираюсь. Следующие 30 дней: ${m.bought} куплено · ${m.want} собираюсь.`;
}
function snapshotEvent(e){
  if(!e)return null;
  return {
    id:e.id,
    title:e.title||'',
    display_title:e.display_title||'',
    category:e.category||'',
    start:e.start||'',
    date_only:e.date_only||'',
    venue:e.venue||'',
    place:e.place||'',
    location:e.location||'',
    people:e.people||'',
    details:e.details||'',
    details_label:e.details_label||'',
    source_url:e.source_url||'',
    source_label:e.source_label||'',
    visible_tags:Array.isArray(e.visible_tags)?[...e.visible_tags]:[]
  };
}
function renderVisited(){
  const host=document.getElementById('visitedList');
  const count=document.getElementById('visitedCount');
  if(!host)return;
  const rows=Object.entries(personal)
    .filter(([,r])=>r?.state==='visited'&&r?.snapshot)
    .map(([id,r])=>({id,r,s:r.snapshot}))
    .sort((a,b)=>{
      const da=dateObj(a.s), db=dateObj(b.s);
      if(!da&&!db)return (a.s.title||'').localeCompare(b.s.title||'','ru');
      if(!da)return 1;if(!db)return -1;return db-da;
    });
  if(count)count.textContent=rows.length?String(rows.length):'';
  host.innerHTML=rows.length?rows.map(({id,r,s})=>{
    const d=formatDate(s);
    const tags=(s.visible_tags||[]).slice(0,4).map(t=>`<span class="visited-tag">${esc(t)}</span>`).join('');
    return `<article class="visited-item">
      <div class="visited-head">
        <div>
          <div class="visited-date">${esc(d.date)}${d.dow&&d.dow!=='watchlist'?` · ${esc(d.dow)}`:''}</div>
          <strong>${esc(s.display_title||s.title||id)}</strong>
          <div class="visited-venue">${esc(s.venue||'')}${s.place?` · ${esc(s.place)}`:''}</div>
        </div>
        <button type="button" class="visited-remove" data-unvisit="${esc(id)}">Убрать отметку</button>
      </div>
      ${tags?`<div class="visited-tags">${tags}</div>`:''}
      ${s.people?`<div class="visited-people">${esc(s.people)}</div>`:''}
      <label class="visited-note-label" for="visited-after-${esc(id)}">Что осталось?</label>
      <textarea id="visited-after-${esc(id)}" data-note="after" data-id="${esc(id)}" placeholder="Мысль, образ, музыкальная фраза, раздражение, вопрос…">${esc(r.noteAfter||'')}</textarea>
    </article>`;
  }).join(''):'<span class="plan-empty">Здесь появятся события, которые Вы отметите «Был».</span>';
}
function updatePersonalState(id,state){
  personal[id]=personal[id]||{};
  if(state==='timofey'){
    personal[id].timofey=!personal[id].timofey;
  }else if(state==='visited'){
    if(personal[id].state==='visited'){
      personal[id].state=null;
      delete personal[id].snapshot;
      delete personal[id].visitedAt;
    }else{
      const e=eventById(id);
      personal[id].state='visited';
      personal[id].snapshot=snapshotEvent(e)||personal[id].snapshot||{id,title:id};
      personal[id].visitedAt=new Date().toISOString();
    }
  }else{
    personal[id].state=personal[id].state===state?null:state;
  }
  cleanRecord(id); savePersonal(); renderMain();
}
function cleanRecord(id){
  const r=personal[id]; if(!r)return;
  if(r.state!=='visited'&&r.snapshot)delete r.snapshot;
  if(!r.state&&!r.timofey&&!r.calendar&&!r.noteBefore&&!r.noteAfter) delete personal[id];
}
function saveNote(id,kind,value){
  personal[id]=personal[id]||{};
  personal[id][kind==='before'?'noteBefore':'noteAfter']=value;
  cleanRecord(id); savePersonal(); renderPlans();
}
function icsEscape(s=''){return String(s).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');}
function fmtICS(dt){if(!dt)return '';const d=new Date(dt);const p=n=>String(n).padStart(2,'0');return d.getUTCFullYear()+p(d.getUTCMonth()+1)+p(d.getUTCDate())+'T'+p(d.getUTCHours())+p(d.getUTCMinutes())+p(d.getUTCSeconds())+'Z';}
function descriptionFor(e){const url=eventLink(e);return [e.details,e.why,url?`Источник: ${url}`:''].filter(Boolean).join('\n\n');}
function markCalendar(id){personal[id]=personal[id]||{}; personal[id].calendar=true; savePersonal(); renderMain();}
function downloadICS(e){
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Cultradar//RU','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${e.id}@cultradar`,`DTSTART:${fmtICS(e.start)}`,`DTEND:${fmtICS(e.end||e.start)}`,`SUMMARY:${icsEscape(e.title)}`,`LOCATION:${icsEscape(e.location||e.venue||'')}`,`DESCRIPTION:${icsEscape(descriptionFor(e))}`,eventLink(e)?`URL:${eventLink(e)}`:'','END:VEVENT','END:VCALENDAR'].filter(Boolean);
  const blob=new Blob([lines.join('\r\n')],{type:'text/calendar;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${e.id}.ics`;a.click();URL.revokeObjectURL(a.href);markCalendar(e.id);
}
function googleCalendar(e){
  const q=new URLSearchParams({action:'TEMPLATE',text:e.title,dates:`${fmtICS(e.start)}/${fmtICS(e.end||e.start)}`,details:descriptionFor(e),location:e.location||e.venue||'',ctz:'Europe/Moscow'});
  window.open(`https://calendar.google.com/calendar/render?${q.toString()}`,'_blank','noopener'); markCalendar(e.id);
}
function setupStaticControls(){
  document.querySelectorAll('#categoryNav button').forEach(b=>b.addEventListener('click',()=>{category=b.dataset.category;document.querySelectorAll('#categoryNav button').forEach(x=>x.classList.toggle('active',x===b));applyFilters();}));
  document.querySelectorAll('#densityNav button').forEach(b=>b.addEventListener('click',()=>setDensity(b.dataset.density)));
  document.querySelectorAll('#rangeNav button').forEach(b=>b.addEventListener('click',()=>{
    rangeDays=b.dataset.range;
    document.querySelectorAll('#rangeNav button').forEach(x=>x.classList.toggle('active',x===b));
    applyFilters();
  }));
  document.querySelectorAll('#tagFilters button').forEach(b=>b.addEventListener('click',()=>{const t=b.dataset.tag;tags.has(t)?tags.delete(t):tags.add(t);b.classList.toggle('on',tags.has(t));applyFilters();}));
  document.getElementById('venueFilters').addEventListener('change',handleVenueFilterChange);
  document.getElementById('venueFilters').addEventListener('click',e=>{
    if(e.target.closest('.venue-close')) document.getElementById('venueFilterBox').open=false;
  });
  document.getElementById('exportBtn').addEventListener('click',()=>{const payload={schema_version:4,exported_at:new Date().toISOString(),personal};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='cultradar-private.json';a.click();URL.revokeObjectURL(a.href);});
  document.getElementById('importInput').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());personal=(data&&data.personal)||data||{};savePersonal();renderMain();alert('Личные данные импортированы.');}catch{alert('Не удалось прочитать JSON.');}e.target.value='';});
  document.getElementById('togglePlans').addEventListener('click',e=>{const body=document.getElementById('plansBody');const hidden=body.hidden=!body.hidden;e.target.textContent=hidden?'Развернуть':'Свернуть';e.target.setAttribute('aria-expanded',String(!hidden));});
  document.getElementById('toggleVisited').addEventListener('click',e=>{const body=document.getElementById('visitedBody');const hidden=body.hidden=!body.hidden;e.target.textContent=hidden?'Развернуть':'Свернуть';e.target.setAttribute('aria-expanded',String(!hidden));});
}
function setupDelegation(){
  document.addEventListener('click',e=>{
    const cardCategory=e.target.closest('.card-category'); if(cardCategory){
      category=cardCategory.dataset.cardCategory;
      document.querySelectorAll('#categoryNav button').forEach(x=>x.classList.toggle('active',x.dataset.category===category));
      applyFilters(); return;
    }
    const cardVenueBtn=e.target.closest('.card-venue'); if(cardVenueBtn){
      const value=cardVenueBtn.dataset.cardVenue;
      if(selectedVenues.size===1&&selectedVenues.has(value))selectedVenues.clear();
      else selectedVenues=new Set([value]);
      updateVenueFilterUI(); applyFilters(); return;
    }
    const cardTagBtn=e.target.closest('.card-tag'); if(cardTagBtn){
      const value=cardTagBtn.dataset.cardTag;
      cardTag=cardTag===value?'all':value;
      document.querySelectorAll('.card-tag').forEach(x=>x.classList.toggle('on',cardTag!=='all'&&x.dataset.cardTag===cardTag));
      applyFilters(); return;
    }
    const editorialBtn=e.target.closest('.editorial-filter'); if(editorialBtn){
      const value=editorialBtn.dataset.editorial;
      editorialFilter=editorialFilter===value?'all':value;
      document.querySelectorAll('.editorial-filter').forEach(x=>x.classList.toggle('selected-filter',editorialFilter!=='all'&&x.dataset.editorial===editorialFilter));
      applyFilters(); return;
    }
    const stateBtn=e.target.closest('[data-private] button'); if(stateBtn){updatePersonalState(stateBtn.closest('[data-private]').dataset.private,stateBtn.dataset.state);return;}
    const ics=e.target.closest('.calendarBtn'); if(ics){const ev=eventById(ics.dataset.id);if(ev)downloadICS(ev);return;}
    const g=e.target.closest('.googleBtn'); if(g){const ev=eventById(g.dataset.id);if(ev)googleCalendar(ev);return;}
    const markVisited=e.target.closest('[data-mark-visited]'); if(markVisited){updatePersonalState(markVisited.dataset.markVisited,'visited');return;}
    const unvisit=e.target.closest('[data-unvisit]'); if(unvisit){updatePersonalState(unvisit.dataset.unvisit,'visited');return;}
    const jump=e.target.closest('[data-jump]'); if(jump){document.getElementById(`event-${jump.dataset.jump}`)?.scrollIntoView({behavior:'smooth',block:'center'});}
  });
  document.addEventListener('input',e=>{const ta=e.target.closest('textarea[data-note]');if(!ta)return;saveNote(ta.dataset.id,ta.dataset.note,ta.value);});
}
async function init(){
  loadPersonal(); loadDensity(); setupStaticControls(); setupDelegation(); applyDensity();
  try{
    const stamp=Date.now();
    const [eventsRes,sourcesRes]=await Promise.all([
      fetch(`events.json?v=${stamp}`,{cache:'no-store'}),
      fetch(`sources.json?v=${stamp}`,{cache:'no-store'})
    ]);
    if(!eventsRes.ok)throw new Error(`events.json: HTTP ${eventsRes.status}`);
    const data=await eventsRes.json();
    events=data.events||[];
    if(sourcesRes.ok){
      const sourceData=await sourcesRes.json();
      venueGroups=sourceData.monitor_groups||[];
      venueUrls=Object.fromEntries((sourceData.venues||[]).filter(v=>v.name&&v.url).map(v=>[v.name,v.url]));
    }else{
      venueGroups=[];
      venueUrls={};
    }
    if(data.meta?.updated){const n=document.getElementById('dataNote');const d=new Date(`${data.meta.updated}T12:00:00+03:00`);const label=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Moscow'}).format(d);n.textContent=`Афиша обновлена ${label}.`;n.hidden=false;}
    renderMain();
  }catch(err){document.getElementById('mainContent').innerHTML=`<div class="loading">Не удалось загрузить events.json: ${esc(err.message)}</div>`;}
}
init();