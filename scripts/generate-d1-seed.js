#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname,'..');
const source = JSON.parse(fs.readFileSync(path.join(root,'data/track-catalog.json'),'utf8'));
const output = path.join(root,'migrations/0002_seed_tracks.sql');
const now = '2026-08-08T00:00:00.000Z';

function sql(value){
  if(value === null || value === undefined) return 'NULL';
  if(typeof value === 'number') return Number.isFinite(value) ? String(value) : '0';
  return `'${String(value).replace(/'/g,"''")}'`;
}

function json(value,fallback){return JSON.stringify(value === undefined ? fallback : value);}

const rows = source.tracks.map(track => `INSERT OR IGNORE INTO tracks (
  id,legacy_key,title,original_title,titles_json,descriptions_json,section,language,
  audio_url,cover_url,artwork_json,lyrics_json,translation_json,artist,album,category_json,
  tags_json,duration_label,duration,audio_quality_json,sort_order,featured,published,archived,
  schema_version,created_at,updated_at,published_at,last_edited_by
) VALUES (
  ${[
    track.id,track.legacyKey || null,track.title,track.originalTitle || track.title,json(track.titles,{}),
    json(track.descriptions,{}),track.section,track.language,track.audio || '',track.cover || '',json(track.artwork,{}),
    json(track.lyrics,{}),json(track.translation,{}),track.artist || 'TuneWrap',track.album || '',json(track.category,{}),
    json(track.tags,[]),track.durationLabel || '',Number(track.duration) || 0,json(track.audioQuality,{}),Number(track.order),
    track.featured ? 1 : 0,track.published ? 1 : 0,0,2,now,now,track.published ? now : null,'stage-11-import'
  ].map(sql).join(',\n  ')}
);`).join('\n\n');

const migration = `-- One-time Stage 11 migration of the 29 existing static records into D1.
-- Existing MP3/cover URLs remain unchanged; media binaries are not copied to R2.
${rows}

INSERT OR REPLACE INTO cms_meta(key,value,updated_at)
VALUES ('initialImport','Imported: ${source.tracks.length}; Missing: 0; Duplicates: 0',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
`;

fs.writeFileSync(output,migration);
console.log(`Generated ${path.relative(root,output)} for ${source.tracks.length} tracks.`);
