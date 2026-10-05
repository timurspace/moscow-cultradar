const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data', 'events');
const metaPath = path.join(dataDir, 'meta.json');
const monthShardPattern = /^\d{4}-\d{2}\.json$/;

function readJsonAbsolute(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error('Cannot parse ' + path.relative(root, file) + ': ' + err.message);
  }
}

function canonicalShardFiles() {
  if (!fs.existsSync(dataDir)) throw new Error('Missing canonical directory data/events');
  const names = fs.readdirSync(dataDir);
  const months = names.filter(name => monthShardPattern.test(name)).sort();
  const files = [...months];
  if (names.includes('undated.json')) files.push('undated.json');
  if (!files.length) throw new Error('No canonical event shards found in data/events');
  return files;
}

function eventMonth(event) {
  if (event.start != null) {
    if (typeof event.start !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(event.start)) {
      throw new Error('Event ' + (event.id || '(no id)') + ' has start but no derivable YYYY-MM month');
    }
    return event.start.slice(0, 7);
  }
  if (event.date_only != null) {
    if (typeof event.date_only !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(event.date_only)) {
      throw new Error('Event ' + (event.id || '(no id)') + ' has date_only but no derivable YYYY-MM month');
    }
    return event.date_only.slice(0, 7);
  }
  return null;
}

function loadCanonicalCorpus() {
  const meta = readJsonAbsolute(metaPath);
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    throw new Error('data/events/meta.json must contain a JSON object');
  }

  const seen = new Set();
  const entries = [];
  for (const shard of canonicalShardFiles()) {
    const shardPath = path.join(dataDir, shard);
    const shardEvents = readJsonAbsolute(shardPath);
    if (!Array.isArray(shardEvents)) throw new Error('Canonical shard ' + shard + ' must be a JSON array');

    shardEvents.forEach((event, position) => {
      if (!event || typeof event !== 'object' || Array.isArray(event)) {
        throw new Error('Canonical shard ' + shard + ' contains a non-object event at index ' + position);
      }
      if (!event.id) throw new Error('Canonical shard ' + shard + ' contains an event without id at index ' + position);
      if (seen.has(event.id)) throw new Error('Duplicate canonical event id: ' + event.id);
      seen.add(event.id);

      const month = eventMonth(event);
      if (shard === 'undated.json') {
        if (month !== null) throw new Error('Event ' + event.id + ' is dated but stored in undated.json');
      } else {
        const expected = shard.slice(0, 7);
        if (month !== expected) throw new Error('Event ' + event.id + ' belongs to ' + (month || 'undated') + ' but is stored in ' + shard);
      }
      entries.push({ event, shard, position });
    });
  }

  entries.sort((a, b) => {
    const aKey = a.shard === 'undated.json' ? '9999-99.json' : a.shard;
    const bKey = b.shard === 'undated.json' ? '9999-99.json' : b.shard;
    return aKey.localeCompare(bKey) || a.position - b.position;
  });

  return { meta, entries, events: entries.map(entry => entry.event) };
}

function buildGeneratedBundle(corpus) {
  return { meta: corpus.meta, events: corpus.events };
}

function buildIndex(corpus) {
  return {
    meta: {
      schema_version: 1,
      generated_from: 'data/events/*.json',
      event_count: corpus.events.length,
      source_schema_version: corpus.meta.source_schema_version ?? null
    },
    events: corpus.entries.map(({ event, shard }) => ({
      id: event.id,
      title: event.title || '',
      category: event.category || '',
      date: event.start ? event.start.slice(0, 10) : (event.date_only || null),
      venue: event.venue || '',
      source_url: event.source_url || null,
      shard
    }))
  };
}

function jsonText(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function buildArtifacts() {
  const corpus = loadCanonicalCorpus();
  return {
    corpus,
    bundleText: jsonText(buildGeneratedBundle(corpus)),
    indexText: jsonText(buildIndex(corpus))
  };
}

function main() {
  const check = process.argv.includes('--check');
  const { corpus, bundleText, indexText } = buildArtifacts();
  const targets = [
    [path.join(root, 'events.json'), bundleText],
    [path.join(root, 'events-index.json'), indexText]
  ];

  if (check) {
    const stale = [];
    for (const [file, expected] of targets) {
      const actual = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
      if (actual !== expected) stale.push(path.relative(root, file));
    }
    if (stale.length) {
      console.error('Generated artifacts are stale: ' + stale.join(', '));
      process.exitCode = 1;
      return;
    }
    console.log('Generated artifacts are current for ' + corpus.events.length + ' canonical events.');
    return;
  }

  for (const [file, content] of targets) fs.writeFileSync(file, content);
  console.log('Built events.json and events-index.json from ' + corpus.events.length + ' canonical events.');
}

if (require.main === module) main();

module.exports = {
  canonicalShardFiles,
  eventMonth,
  loadCanonicalCorpus,
  buildGeneratedBundle,
  buildIndex,
  buildArtifacts,
  jsonText
};
