const fs = require('fs');
const path = require('path');

const root = __dirname;
const markdownMode = process.argv.includes('--md');

function loadJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

function push(map, key, value) {
  map[key].push(value);
}

const eventsData = loadJson('events.json');
const sourcesData = loadJson('sources.json');
const events = Array.isArray(eventsData) ? eventsData : eventsData.events || [];
const sources = Array.isArray(sourcesData) ? sourcesData : sourcesData.sources || [];

const report = {
  total: events.length,
  errors: { duplicate_ids: [], missing_fields: [] },
  warnings: {
    empty_source_url: [],
    invalid_dates: [],
    venues_not_in_sources: [],
    weak_music_context: [],
    missing_editorial_why: []
  },
  categories: {}
};

const ids = new Set();
const sourceNames = new Set(sources.map(s => s.name || s.venue || s.source_label).filter(Boolean));

for (const e of events) {
  const id = e.id || '(no id)';
  if (ids.has(id)) push(report.errors, 'duplicate_ids', id);
  ids.add(id);

  for (const field of ['id', 'title', 'category', 'venue']) {
    if (!e[field]) push(report.errors, 'missing_fields', { id, field });
  }

  const category = e.category || 'unknown';
  report.categories[category] = (report.categories[category] || 0) + 1;

  if (e.source_url === '') push(report.warnings, 'empty_source_url', id);
  if (e.start && Number.isNaN(Date.parse(e.start))) push(report.warnings, 'invalid_dates', id);
  if (e.venue && sourceNames.size && !sourceNames.has(e.venue)) push(report.warnings, 'venues_not_in_sources', { id, venue: e.venue });

  if ((category === 'music' || category === 'opera') && !e.composers && !e.works && !e.program_status && !e.program && !e.description && !e.performers) {
    push(report.warnings, 'weak_music_context', id);
  }

  if (e.featured && !e.why) push(report.warnings, 'missing_editorial_why', id);
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
    `Пустые source_url: ${r.warnings.empty_source_url.length}`,
    `Слабый музыкальный контекст: ${r.warnings.weak_music_context.length}`,
    `Нет редакционного why у featured: ${r.warnings.missing_editorial_why.length}`,
    `Площадки не найдены: ${r.warnings.venues_not_in_sources.length}`
  ].join('\n');
}

const output = markdownMode ? markdown(report) : JSON.stringify(report, null, 2);
console.log(output);

if (markdownMode) fs.writeFileSync(path.join(root, 'audit-report.md'), output);
