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
function hasExplicitTimezone(value) {
  return /(Z|[+-]\d{2}:\d{2})$/.test(String(value || ''));
}
function isValidDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const [year, month, day] = value.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

const eventsData = loadJson('events.json');
const sourcesData = loadJson('sources.json');
const events = Array.isArray(eventsData) ? eventsData : eventsData.events || [];
const venues = Array.isArray(sourcesData) ? sourcesData : sourcesData.venues || [];

const report = {
  total: events.length,
  errors: {
    duplicate_ids: [],
    missing_fields: [],
    source_label_mismatch: [],
    invalid_enum: [],
    invalid_start: [],
    invalid_end: [],
    invalid_date_only: [],
    missing_timezone: [],
    end_before_start: [],
    start_and_date_only: []
  },
  warnings: {
    empty_source_url: [],
    aggregator_source_url: [],
    venues_not_in_sources: [],
    weak_music_context: [],
    missing_editorial_why: []
  },
  categories: {}
};

const ids = new Set();
const venueNames = new Set(venues.map(v => v.name).filter(Boolean));
const aggregatorHosts = new Set(['afisha.ru', 'kudago.com']);
const allowedEnums = {
  category: new Set(['music', 'theatre', 'opera', 'talks']),
  horizon: new Set(['near', 'buy', 'far']),
  editorial_status: new Set(['attention', 'candidate', 'decide']),
  ticket_urgency: new Set(['none', 'no_rush', 'watch', 'buy', 'low', 'soldout'])
};

for (const e of events) {
  const id = e.id || '(no id)';
  if (ids.has(id)) report.errors.duplicate_ids.push(id);
  ids.add(id);

  for (const field of ['id', 'title', 'category', 'venue']) {
    if (!e[field]) report.errors.missing_fields.push({ id, field });
  }

  const category = e.category || 'unknown';
  report.categories[category] = (report.categories[category] || 0) + 1;

  for (const [field, allowed] of Object.entries(allowedEnums)) {
    if (!allowed.has(e[field])) {
      report.errors.invalid_enum.push({ id, field, value: e[field] ?? null });
    }
  }

  const isConcreteEvent = Boolean(e.start || e.date_only);
  if (isConcreteEvent && !e.source_url) report.warnings.empty_source_url.push(id);
  if (aggregatorHosts.has(hostname(e.source_url))) report.warnings.aggregator_source_url.push({ id, source_url: e.source_url });
  if (e.start && Number.isNaN(Date.parse(e.start))) {
    report.errors.invalid_start.push({ id, start: e.start });
  }
  if (e.end && Number.isNaN(Date.parse(e.end))) {
    report.errors.invalid_end.push({ id, end: e.end });
  }
  if (e.date_only !== undefined && !isValidDateOnly(e.date_only)) {
    report.errors.invalid_date_only.push({ id, date_only: e.date_only });
  }
  if (e.start && !hasExplicitTimezone(e.start)) {
    report.errors.missing_timezone.push({ id, field: 'start', value: e.start });
  }
  if (e.end && !hasExplicitTimezone(e.end)) {
    report.errors.missing_timezone.push({ id, field: 'end', value: e.end });
  }
  if (e.start && e.end && !Number.isNaN(Date.parse(e.start)) && !Number.isNaN(Date.parse(e.end)) && Date.parse(e.end) < Date.parse(e.start)) {
    report.errors.end_before_start.push({ id, start: e.start, end: e.end });
  }
  if (e.start && e.date_only) {
    report.errors.start_and_date_only.push({ id, start: e.start, date_only: e.date_only });
  }

  if (e.venue && e.venue !== 'Watchlist' && venueNames.size && !venueNames.has(e.venue)) {
    report.warnings.venues_not_in_sources.push({ id, venue: e.venue });
  }
  if (e.venue && e.venue !== 'Watchlist' && e.source_label !== e.venue) {
    report.errors.source_label_mismatch.push({ id, venue: e.venue, source_label: e.source_label || '' });
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
    `Несовпадение source_label и venue: ${r.errors.source_label_mismatch.length}`,
    `Недопустимые enum-значения: ${r.errors.invalid_enum.length}`,
    `Некорректный start: ${r.errors.invalid_start.length}`,
    `Некорректный end: ${r.errors.invalid_end.length}`,
    `Некорректный date_only: ${r.errors.invalid_date_only.length}`,
    `Нет явного timezone у start/end: ${r.errors.missing_timezone.length}`,
    `end раньше start: ${r.errors.end_before_start.length}`,
    `Одновременно заданы start и date_only: ${r.errors.start_and_date_only.length}`,
    '',
    '## Предупреждения',
    `Нет source_url у датированных событий: ${r.warnings.empty_source_url.length}`,
    `Агрегатор в source_url: ${r.warnings.aggregator_source_url.length}`,
    `Слабый музыкальный контекст: ${r.warnings.weak_music_context.length}`,
    `Нет редакционного why у featured: ${r.warnings.missing_editorial_why.length}`,
    `Площадки не найдены в sources.venues: ${r.warnings.venues_not_in_sources.length}`
  ].join('\n');
}

const output = markdownMode ? markdown(report) : JSON.stringify(report, null, 2);
console.log(output);
if (markdownMode) fs.writeFileSync(path.join(root, 'audit-report.md'), output);

if (
  report.errors.duplicate_ids.length ||
  report.errors.missing_fields.length ||
  report.errors.source_label_mismatch.length ||
  report.errors.invalid_enum.length ||
  report.errors.invalid_start.length ||
  report.errors.invalid_end.length ||
  report.errors.invalid_date_only.length ||
  report.errors.missing_timezone.length ||
  report.errors.end_before_start.length ||
  report.errors.start_and_date_only.length
) {
  process.exitCode = 1;
}
