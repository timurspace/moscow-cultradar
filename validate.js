const fs = require('fs');
const path = require('path');

const root = __dirname;
const eventsPath = path.join(root, 'events.json');
const sourcesPath = path.join(root, 'sources.json');
const markdownMode = process.argv.includes('--md');

function loadJson(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function add(map, key, value) {
  if (!map[key]) map[key] = [];
  map[key].push(value);
}

const eventsData = loadJson(eventsPath);
const sourcesData = loadJson(sourcesPath);

if (!eventsData) {
  console.error('events.json not found');
  process.exit(1);
}

const events = Array.isArray(eventsData) ? eventsData : eventsData.events || [];
const sources = sourcesData
  ? (Array.isArray(sourcesData) ? sourcesData : sourcesData.sources || [])
  : [];

const report = {
  total: events.length,
  duplicate_ids: [],
  missing_fields: {},
  empty_source_url: [],
  invalid_dates: [],
  categories: {},
  venues_not_in_sources: [],
  music_without_context: []
};

const ids = new Map();
const sourceNames = new Set(sources.map(s => s.name || s.venue || s.source_label).filter(Boolean));

for (const event of events) {
  const id = event.id || '(no id)';

  if (ids.has(id)) report.duplicate_ids.push(id);
  ids.set(id, true);

  const category = event.category || 'unknown';
  report.categories[category] = (report.categories[category] || 0) + 1;

  for (const field of ['id', 'title', 'category', 'venue']) {
    if (!event[field]) add(report.missing_fields, field, id);
  }

  if ('source_url' in event && !event.source_url) {
    report.empty_source_url.push(id);
  }

  if (event.start && Number.isNaN(Date.parse(event.start))) {
    report.invalid_dates.push(id);
  }

  if (sourceNames.size && event.venue && !sourceNames.has(event.venue)) {
    report.venues_not_in_sources.push({ id, venue: event.venue });
  }

  if ((category === 'music' || category === 'opera') && !event.composers && !event.works && !event.program_status) {
    report.music_without_context.push(id);
  }
}

function markdown(report) {
  return [
    '# Культрадар — аудит данных',
    '',
    `Всего событий: ${report.total}`,
    '',
    '## Категории',
    ...Object.entries(report.categories).map(([k,v]) => `- ${k}: ${v}`),
    '',
    `## Дубли id: ${report.duplicate_ids.length}`,
    ...report.duplicate_ids.map(x => `- ${x}`),
    '',
    `## Пустые source_url: ${report.empty_source_url.length}`,
    ...report.empty_source_url.slice(0,50).map(x => `- ${x}`),
    '',
    `## Music/opera без контекста программы: ${report.music_without_context.length}`,
    ...report.music_without_context.slice(0,50).map(x => `- ${x}`),
    '',
    `## Площадки не найдены в sources: ${report.venues_not_in_sources.length}`,
  ].join('\n');
}

const output = markdownMode ? markdown(report) : JSON.stringify(report, null, 2);
console.log(output);

if (markdownMode) {
  fs.writeFileSync(path.join(root, 'audit-report.md'), output);
}
