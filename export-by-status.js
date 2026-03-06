#!/usr/bin/env node
/**
 * Export anime/manga data filtered by status and save to separate JSON files
 * 
 * Usage:
 *   Export all by status: node export-by-status.js
 *   Specific status: node export-by-status.js --status watching
 *   Specific type: node export-by-status.js --type anime
 */

const fs = require('fs');
const path = require('path');

// Configuration
const username = process.env.MAL_USERNAME || 'TrulyYoursMino';
const dataDir = path.join(__dirname, 'data');

// Parse command line arguments
const args = process.argv.slice(2);
let filterStatus = null;
let filterType = 'both';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--status' && args[i + 1]) {
    filterStatus = args[i + 1];
    i++;
  }
  if (args[i] === '--type' && args[i + 1]) {
    filterType = args[i + 1];
    i++;
  }
}

/**
 * Load data
 */
function loadData(filename) {
  try {
    const filepath = path.join(dataDir, filename);
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (err) {
    console.error(`❌ Could not load ${filename}: ${err.message}`);
    return null;
  }
}

/**
 * Export data by status
 */
function exportByStatus(data, type) {
  const statusMap = {};
  
  data.forEach(entry => {
    if (entry.list_status) {
      const status = entry.list_status.status || 'unknown';
      if (!statusMap[status]) {
        statusMap[status] = [];
      }
      statusMap[status].push(entry);
    }
  });
  
  return statusMap;
}

/**
 * Save status data
 */
function saveStatusFile(data, type, status) {
  const filename = `${username}-${type}-${status}.json`;
  const filepath = path.join(dataDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
  return filename;
}

/**
 * Main function
 */
function main() {
  console.log(`\n📤 MyAnimeList Data Exporter by Status`);
  console.log(`👤 User: ${username}\n`);
  
  const exportedFiles = [];
  
  if (filterType === 'anime' || filterType === 'both') {
    console.log(`🎬 Processing anime list...`);
    const animeData = loadData(`${username}-animelist.json`);
    
    if (animeData) {
      const byStatus = exportByStatus(animeData, 'anime');
      
      Object.entries(byStatus).forEach(([status, entries]) => {
        if (!filterStatus || filterStatus.toLowerCase() === status.toLowerCase()) {
          const filename = saveStatusFile(entries, 'anime', status);
          exportedFiles.push({
            file: filename,
            type: 'anime',
            status: status,
            count: entries.length
          });
          console.log(`   ✅ ${status}: ${entries.length} entries → ${filename}`);
        }
      });
    }
  }
  
  if (filterType === 'manga' || filterType === 'both') {
    console.log(`\n📚 Processing manga list...`);
    const mangaData = loadData(`${username}-mangalist.json`);
    
    if (mangaData) {
      const byStatus = exportByStatus(mangaData, 'manga');
      
      Object.entries(byStatus).forEach(([status, entries]) => {
        if (!filterStatus || filterStatus.toLowerCase() === status.toLowerCase()) {
          const filename = saveStatusFile(entries, 'manga', status);
          exportedFiles.push({
            file: filename,
            type: 'manga',
            status: status,
            count: entries.length
          });
          console.log(`   ✅ ${status}: ${entries.length} entries → ${filename}`);
        }
      });
    }
  }
  
  console.log(`\n📋 Export Summary:`);
  console.log(`   Total files created: ${exportedFiles.length}`);
  exportedFiles.forEach(f => {
    console.log(`   • ${f.file} (${f.count} entries)`);
  });
  console.log();
}

main();
