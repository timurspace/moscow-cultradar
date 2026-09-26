const fs = require('fs');
const path = require('path');

const root = __dirname;
const markdownMode = process.argv.includes('--md');

function loadJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}
function hasValue(v) {
  return Array.isArray(v) ? v.length > 0 : Boolean(v);
}
function hostname(url) {
  const m = String(url || '').match(/^https?:\/\/([^/]+)/i);
  return m ? m[1].replace(/^www\./, '').toLowerCase() : '';
}

const eventsData = loadJson('events.json');
const sourcesData = loadJson('sources.json');
const events = Array.isArray(eventsData) ? eventsData : eventsData.events || [];
const venues = Array.isArray(sourcesData) ? sourcesData : sourcesData.venues || [];

const report = {
  total: events.length,
  errors: { duplicate_ids: [], missing_fields: [] },
  warnings: {
    empty_source_url: [],
    aggregator_source_url: [],
    invalid_dates: [],
    venues_not_in_sources: [],
    weak_music_context: [],
    missing_editorial_why: []
  },
  categories: {}
};

const ids = new Set();
const venueNames = new Set(venues.map(v => v.name).filter(Boolean));
const aggregatorHosts = new Set(['afisha.ru', 'kudago.com']);

for (const e of events) {
  const id = e.id || '(no id)';
  if (ids.has(id)) report.errors.duplicate_ids.push(id);
  ids.add(id);

  for (const field of ['id', 'title', 'category', 'venue']) {
    if (!e[field]) report.errors.missing_fields.push({ id, field });
  }

  const category = e.category || 'unknown';
  report.categories[category] = (report.categories[category] || 0) + 1;

  const isConcreteEvent = Boolean(e.start || e.date_only);
  if (isConcreteEvent && !e.source_url) report.warnings.empty_source_url.push(id);
  if (aggregatorHosts.has(hostname(e.source_url))) report.warnings.aggregator_source_url.push({ id, source_url: e.source_url });
  if (e.start && Number.isNaN(Date.parse(e.start))) report.warnings.invalid_dates.push(id);

  if (e.venue && e.venue !== 'Watchlist' && venueNames.size && !venueNames.has(e.venue)) {
    report.warnings.venues_not_in_sources.push({ id, venue: e.venue });
  }

  const hasMusicContext = [
    e.composers, e.works, e.program_status, e.program, e.description, e.performers, e.people
  ].some(hasValue);
  if ((category === 'music' || category === 'opera') && !hasMusicContext) {
    report.warnings.weak_music_context.push(id);
  }

  if (e.featured && !e.why) report.warnings.missing_editorial_why.push(id);
}

function markdown(r) {
  return [
    '# Культрадар — аудит данных',
    '',
    `Всего событий: ${r.total}`,
    '',
    '## Категории',
    ...Object.entries(r.categories).map(([k,v]) => `- ${k}: ${v}`),
    '',
    '## Ошибки',
    `Дубли id: ${r.errors.duplicate_ids.length}`,
    `Пропущенные обязательные поля: ${r.errors.missing_fields.length}`,
    '',
    '## Предупреждения',
    `Нет source_url у датированных событий: ${r.warnings.empty_source_url.length}`,
    `Агрегатор в source_url: ${r.warnings.aggregator_source_url.length}`,
    `Некорректные даты: ${r.warnings.invalid_dates.length}`,
    `Слабый музыкальный контекст: ${r.warnings.weak_music_context.length}`,
    `Нет редакционного why у featured: ${r.warnings.missing_editorial_why.length}`,
    `Площадки не найдены в sources.venues: ${r.warnings.venues_not_in_sources.length}`
  ].join('\n');
}

const output = markdownMode ? markdown(report) : JSON.stringify(report, null, 2);
console.log(output);
if (markdownMode) fs.writeFileSync(path.join(root, 'audit-report.md'), output);

if (report.errors.duplicate_ids.length || report.errors.missing_fields.length) {
  process.exitCode = 1;
}
