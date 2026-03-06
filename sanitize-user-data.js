#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const outputDir = path.join(__dirname, 'sanitized_data');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// User-specified username (based on existing data)
const username = 'TrulyYoursMino';
const animeListFile = `${username}-animelist.json`;
const mangaListFile = `${username}-mangalist.json`;

function sanitizeEntries(entries, type) {
  // Convert MAL status to app status if needed
  const statusMap = {
    'watching': 'watching',
    'reading': 'watching',
    'completed': 'completed',
    'on_hold': 'on_hold',
    'dropped': 'dropped',
    'plan_to_watch': 'plan-to-watch',
    'plan_to_read': 'plan-to-watch'
  };

  return entries.map(entry => {
    const node = entry.node || {};
    const listStatus = entry.list_status || {};
    const appStatus = statusMap[listStatus.status] || listStatus.status;
    
    return {
      id: `${type}_${node.id}_mal`,
      malId: node.id,
      type: type,
      title: node.title,
      alternative_titles_en: node.alternative_titles?.en || '',
      progress: listStatus.num_episodes_watched ?? listStatus.num_chapters_read ?? 0,
      episodes: node.num_episodes || null,
      chapters: node.num_chapters || null,
      status: appStatus,
      thumbnail: node.main_picture?.large || node.main_picture?.medium || '',
      logoUrl: node.main_picture?.large || node.main_picture?.medium || '',
      rewatch_count: listStatus.is_rewatching ? 1 : 0,
      lastUpdated: listStatus.updated_at || new Date().toISOString()
    };
  });
}

function process() {
  const animeData = JSON.parse(fs.readFileSync(path.join(dataDir, animeListFile), 'utf8'));
  const mangaData = JSON.parse(fs.readFileSync(path.join(dataDir, mangaListFile), 'utf8'));

  // 1. Create file with complete information (merging anime and manga)
  const completeInfo = {
    anime: animeData,
    manga: mangaData,
    lastUpdated: new Date().toISOString()
  };
  fs.writeFileSync(
    path.join(outputDir, 'complete_info.json'), 
    JSON.stringify(completeInfo, null, 2)
  );
  console.log('✅ Created complete_info.json');

  // 2. Create file with user-specific sanitized info
  const sanitizedAnime = sanitizeEntries(animeData, 'anime');
  const sanitizedManga = sanitizeEntries(mangaData, 'manga');
  
  const userSummary = {
    entries: [...sanitizedAnime, ...sanitizedManga],
    lastUpdated: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(outputDir, 'user_summary.json'), 
    JSON.stringify(userSummary, null, 2)
  );
  console.log('✅ Created user_summary.json');
}

try {
  process();
} catch (error) {
  console.error('❌ Error during sanitization:', error.message);
  process.exit(1);
}
