const fs = require('fs');
const path = require('path');

const root = __dirname;
const eventsPath = path.join(root, 'events.json');
const sourcesPath = path.join(root, 'sources.json');

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
  venues_not_in_sources: []
};

const ids = new Map();
const sourceNames = new Set(sources.map(s => s.name || s.venue || s.source_label).filter(Boolean));

for (const event of events) {
  const id = event.id || '(no id)';

  if (ids.has(id)) report.duplicate_ids.push(id);
  ids.set(id, true);

  report.categories[event.category || 'unknown'] =
    (report.categories[event.category || 'unknown'] || 0) + 1;

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
}

console.log(JSON.stringify(report, null, 2));
