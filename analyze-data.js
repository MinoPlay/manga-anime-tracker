#!/usr/bin/env node
/**
 * Analyze and display fetched MyAnimeList data
 * 
 * Usage:
 *   Display summary: node analyze-data.js
 *   Show specific status: node analyze-data.js --status watching
 *   Filter by type: node analyze-data.js --type anime
 *   Combined: node analyze-data.js --type anime --status completed
 */

const fs = require('fs');
const path = require('path');

// Configuration
const username = process.env.MAL_USERNAME || 'TrulyYoursMino';
const dataDir = path.join(__dirname, 'data');

// Parse command line arguments
const args = process.argv.slice(2);
let filterStatus = null;
let filterType = 'both'; // 'anime', 'manga', or 'both'

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
 * Load and parse JSON data
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
 * Display status breakdown
 */
function displayStatusBreakdown(data, type) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`${type.toUpperCase()} - Status Breakdown`.padEnd(60));
  console.log(`${'═'.repeat(60)}`);
  
  const statusMap = {};
  
  data.forEach(entry => {
    if (entry.list_status) {
      const status = entry.list_status.status || 'unknown';
      if (!statusMap[status]) {
        statusMap[status] = {
          count: 0,
          items: [],
          totalProgress: 0,
          totalScore: 0
        };
      }
      
      statusMap[status].count++;
      const progressField = type === 'anime' ? 'num_episodes_watched' : 'num_chapters_read';
      const progress = entry.list_status[progressField] || 0;
      statusMap[status].totalProgress += progress;
      statusMap[status].totalScore += entry.list_status.score || 0;
      
      statusMap[status].items.push({
        title: entry.node?.title || 'Unknown',
        progress: progress,
        total: type === 'anime' ? entry.node?.num_episodes : entry.node?.num_chapters,
        score: entry.list_status.score || 0
      });
    }
  });
  
  // Display each status
  Object.entries(statusMap).forEach(([status, data]) => {
    const progressUnit = type === 'anime' ? 'episodes' : 'chapters';
    const avgScore = data.totalScore / data.count;
    
    console.log(`\n📋 ${status.toUpperCase()}`);
    console.log(`   Count: ${data.count}`);
    console.log(`   Total ${progressUnit}: ${data.totalProgress}`);
    console.log(`   Average Score: ${avgScore.toFixed(1)}`);
    
    if (filterStatus && filterStatus.toLowerCase() === status.toLowerCase()) {
      console.log(`\n   Entries:`);
      data.items.forEach(item => {
        const progressStr = item.total 
          ? `${item.progress}/${item.total}` 
          : `${item.progress}`;
        console.log(`   • ${item.title.substring(0, 50).padEnd(50)} [${progressStr}] ⭐ ${item.score || 'N/A'}`);
      });
    }
  });
  
  console.log(`\n${'═'.repeat(60)}\n`);
}

/**
 * Display full entries with status and progress
 */
function displayDetailedEntries(data, type, status) {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`${type.toUpperCase()} - ${status ? `Status: ${status.toUpperCase()}` : 'All Entries'}`.padEnd(80));
  console.log(`${'═'.repeat(80)}\n`);
  
  const filtered = status
    ? data.filter(entry => entry.list_status?.status === status)
    : data;
  
  const progressField = type === 'anime' ? 'num_episodes_watched' : 'num_chapters_read';
  const totalField = type === 'anime' ? 'num_episodes' : 'num_chapters';
  
  filtered.forEach((entry, idx) => {
    const title = entry.node?.title || 'Unknown';
    const status = entry.list_status?.status || 'unknown';
    const progress = entry.list_status?.[progressField] || 0;
    const total = entry.node?.[totalField] || '?';
    const score = entry.list_status?.score || '-';
    const progressStr = total !== '?' ? `${progress}/${total}` : `${progress}`;
    
    console.log(`${idx + 1}. ${title}`);
    console.log(`   Status: ${status} | Progress: ${progressStr} | Score: ${score}`);
    if (entry.list_status?.updated_at) {
      const date = new Date(entry.list_status.updated_at);
      console.log(`   Last updated: ${date.toLocaleDateString()}`);
    }
    console.log();
  });
  
  console.log(`${'═'.repeat(80)}\n`);
  console.log(`Total: ${filtered.length} entries\n`);
}

/**
 * Main function
 */
function main() {
  console.log(`\n🔍 MyAnimeList Data Analyzer`);
  console.log(`👤 User: ${username}\n`);
  
  if (filterType === 'anime' || filterType === 'both') {
    const animeData = loadData(`${username}-animelist.json`);
    if (animeData) {
      displayStatusBreakdown(animeData, 'anime');
      if (filterStatus) {
        displayDetailedEntries(animeData, 'anime', filterStatus);
      }
    }
  }
  
  if (filterType === 'manga' || filterType === 'both') {
    const mangaData = loadData(`${username}-mangalist.json`);
    if (mangaData) {
      displayStatusBreakdown(mangaData, 'manga');
      if (filterStatus) {
        displayDetailedEntries(mangaData, 'manga', filterStatus);
      }
    }
  }
  
  // Show summary file info
  const summaryData = loadData(`${username}-summary.json`);
  if (summaryData && summaryData.length > 0) {
    const summary = summaryData[0];
    console.log(`✨ Summary:`);
    console.log(`   Fetched: ${new Date(summary.fetchedAt).toLocaleString()}`);
    console.log(`   Total Entries: ${summary.statistics.totalEntries}`);
  }
}

main();
