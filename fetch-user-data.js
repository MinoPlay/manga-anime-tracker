/**
 * Fetch user anime and manga lists from MyAnimeList API and save to local JSON files
 * 
 * Usage:
 *   Node.js: node fetch-user-data.js
 *   With custom username: MAL_USERNAME=AnotherUser node fetch-user-data.js
 *   With custom limit per request: LIMIT=50 node fetch-user-data.js
 */

const fs = require('fs').promises;
const path = require('path');
const http = require('http');
const https = require('https');

// Configuration
const CONFIG = {
  username: process.env.MAL_USERNAME || process.env.MYANIMELIST_USERNAME || 'TrulyYoursMino',
  clientId: process.env.CLIENT_ID || 'a86cd94144af52f931b0a3ab74455192',
  proxyUrl: process.env.PROXY_URL || 'http://localhost:3000',
  directApiUrl: 'https://api.myanimelist.net/v2',
  limitPerRequest: parseInt(process.env.LIMIT || '25'),
  dataDir: path.join(__dirname, 'data'),
  useProxy: process.env.USE_PROXY !== 'false',
  timeout: 30000 // 30 seconds
};

/**
 * Make HTTP request with retry logic
 */
function makeRequest(url, useProxy = true) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const timeoutId = setTimeout(() => {
      reject(new Error(`Request timeout for ${url}`));
    }, CONFIG.timeout);

    const options = {
      headers: {
        'X-MAL-CLIENT-ID': CONFIG.clientId,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    protocol.get(url, options, (res) => {
      let data = '';
      
      if (res.statusCode === 301 || res.statusCode === 302) {
        clearTimeout(timeoutId);
        resolve(makeRequest(res.headers.location, useProxy));
        return;
      }

      if (res.statusCode !== 200) {
        clearTimeout(timeoutId);
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        clearTimeout(timeoutId);
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`Invalid JSON response: ${err.message}`));
        }
      });
    }).on('error', (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });
  });
}

/**
 * Try proxy first, then fallback to direct API
 */
async function fetchWithFallback(endpoint) {
  let lastError = null;

  // Try proxy first if enabled
  if (CONFIG.useProxy) {
    try {
      console.log(`  🔄 Trying proxy: ${CONFIG.proxyUrl}${endpoint}`);
      return await makeRequest(`${CONFIG.proxyUrl}${endpoint}`);
    } catch (error) {
      console.log(`  ⚠️  Proxy failed: ${error.message}`);
      lastError = error;
    }
  }

  // Try direct API
  try {
    console.log(`  🔄 Trying direct API: ${CONFIG.directApiUrl}${endpoint}`);
    return await makeRequest(`${CONFIG.directApiUrl}${endpoint}`);
  } catch (error) {
    console.log(`  ❌ Direct API failed: ${error.message}`);
    lastError = error;
  }

  throw lastError;
}

/**
 * Fetch paginated data from API
 */
async function fetchPaginatedData(endpoint, description) {
  console.log(`\n📥 Fetching ${description}...`);
  
  let allData = [];
  let offset = 0;
  let hasMore = true;
  let requestCount = 0;
  
  // Fields to request from MyAnimeList API (includes status and progress)
  const fields = 'list_status,alternative_titles,genres,pictures,synopsis,num_episodes,num_chapters,start_date,end_date,mean,rank,popularity,nsfw,media_type,status,my_list_status';

  while (hasMore) {
    try {
      const paginatedEndpoint = `${endpoint}?offset=${offset}&limit=${CONFIG.limitPerRequest}&fields=${fields}`;
      console.log(`  📄 Page ${requestCount + 1} (offset: ${offset})...`);
      
      const response = await fetchWithFallback(paginatedEndpoint);
      
      if (!response.data || response.data.length === 0) {
        hasMore = false;
        if (requestCount === 0) {
          console.log(`  ℹ️  No data found`);
        }
        break;
      }

      allData = allData.concat(response.data);
      console.log(`  ✅ Fetched ${response.data.length} entries (total: ${allData.length})`);

      // Check if there's a next page
      hasMore = response.paging && response.paging.next;
      if (hasMore) {
        // Extract offset from next URL
        const nextUrl = new URL(response.paging.next);
        offset = parseInt(nextUrl.searchParams.get('offset')) || offset + CONFIG.limitPerRequest;
      }

      requestCount++;
      
      // Add small delay between requests to avoid rate limiting
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`  ❌ Error fetching ${description}: ${error.message}`);
      if (allData.length === 0) {
        throw error; // No data fetched at all
      }
      break; // Stop pagination but keep what we have
    }
  }

  return allData;
}

/**
 * Save data to JSON file
 */
async function saveToFile(filename, data) {
  try {
    await fs.mkdir(CONFIG.dataDir, { recursive: true });
    const filepath = path.join(CONFIG.dataDir, filename);
    await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`  💾 Saved to: ${path.relative(process.cwd(), filepath)}`);
    console.log(`  📊 Total entries: ${data.length}`);
    return filepath;
  } catch (error) {
    throw new Error(`Failed to save file: ${error.message}`);
  }
}

/**
 * Analyze data by status
 */
function analyzeByStatus(data, type = 'anime') {
  const statusBreakdown = {};
  let totalProgress = 0;
  
  data.forEach(entry => {
    if (entry.list_status) {
      const status = entry.list_status.status || 'unknown';
      if (!statusBreakdown[status]) {
        statusBreakdown[status] = {
          count: 0,
          items: []
        };
      }
      statusBreakdown[status].count++;
      
      const progressField = type === 'anime' ? 'num_episodes_watched' : 'num_chapters_read';
      const progress = entry.list_status[progressField] || 0;
      totalProgress += progress;
      
      statusBreakdown[status].items.push({
        title: entry.node?.title || 'Unknown',
        progress: progress,
        score: entry.list_status.score || 0
      });
    }
  });
  
  return { statusBreakdown, totalProgress };
}

/**
 * Create detailed summary with status breakdown
 */
function createDetailedSummary(animeList, mangaList) {
  const animeAnalysis = analyzeByStatus(animeList, 'anime');
  const mangaAnalysis = analyzeByStatus(mangaList, 'manga');
  
  return {
    username: CONFIG.username,
    fetchedAt: new Date().toISOString(),
    statistics: {
      totalAnime: animeList.length,
      totalManga: mangaList.length,
      totalEntries: animeList.length + mangaList.length,
      animeProgress: {
        totalEpisodesWatched: animeAnalysis.totalProgress,
        byStatus: Object.fromEntries(
          Object.entries(animeAnalysis.statusBreakdown).map(([status, data]) => [
            status,
            {
              count: data.count,
              episodesWatched: data.items.reduce((sum, item) => sum + item.progress, 0),
              averageScore: data.items.reduce((sum, item) => sum + item.score, 0) / data.count || 0
            }
          ])
        )
      },
      mangaProgress: {
        totalChaptersRead: mangaAnalysis.totalProgress,
        byStatus: Object.fromEntries(
          Object.entries(mangaAnalysis.statusBreakdown).map(([status, data]) => [
            status,
            {
              count: data.count,
              chaptersRead: data.items.reduce((sum, item) => sum + item.progress, 0),
              averageScore: data.items.reduce((sum, item) => sum + item.score, 0) / data.count || 0
            }
          ])
        )
      }
    },
    files: {
      anime: `${CONFIG.username}-animelist.json`,
      manga: `${CONFIG.username}-mangalist.json`
    }
  };
}

/**
 * Main function
 */
async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  MyAnimeList User Data Fetcher         ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`\n📋 Configuration:`);
  console.log(`   👤 Username: ${CONFIG.username}`);
  console.log(`   🔗 API: ${CONFIG.useProxy ? 'Proxy' : 'Direct'} (${CONFIG.directApiUrl})`);
  console.log(`   📦 Items per request: ${CONFIG.limitPerRequest}`);
  console.log(`   📁 Save to: ${CONFIG.dataDir}`);

  try {
    // Check if proxy is running (optional)
    if (CONFIG.useProxy) {
      console.log(`\n🔍 Checking proxy server at ${CONFIG.proxyUrl}...`);
      try {
        const testUrl = `${CONFIG.proxyUrl}/anime/1`;
        await Promise.race([
          makeRequest(testUrl),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
        ]);
        console.log('✅ Proxy is running and responding');
      } catch (err) {
        console.log(`⚠️  Proxy not available: ${err.message}`);
        console.log('   Will try direct API calls...\n');
        CONFIG.useProxy = false;
      }
    }

    // Fetch anime list
    const animeList = await fetchPaginatedData(
      `/users/${CONFIG.username}/animelist`,
      `anime list for user "${CONFIG.username}"`
    );
    await saveToFile(`${CONFIG.username}-animelist.json`, animeList);

    // Fetch manga list
    const mangaList = await fetchPaginatedData(
      `/users/${CONFIG.username}/mangalist`,
      `manga list for user "${CONFIG.username}"`
    );
    await saveToFile(`${CONFIG.username}-mangalist.json`, mangaList);

    // Create combined summary
    const summary = createDetailedSummary(animeList, mangaList);
    await saveToFile(`${CONFIG.username}-summary.json`, [summary]);

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  ✅ All data fetched successfully!     ║');
    console.log('╚════════════════════════════════════════╝');
    console.log(`\n📊 Summary:`);
    console.log(`   🎬 Anime entries: ${animeList.length}`);
    console.log(`   📚 Manga entries: ${mangaList.length}`);
    console.log(`   📦 Total entries: ${summary.statistics.totalEntries}`);
    
    // Display anime status breakdown
    console.log(`\n🎬 Anime by Status:`);
    Object.entries(summary.statistics.animeProgress.byStatus).forEach(([status, data]) => {
      console.log(`   ${status}: ${data.count} entries (${data.episodesWatched} episodes watched, avg score: ${data.averageScore.toFixed(1)})`);
    });
    
    // Display manga status breakdown
    console.log(`\n📚 Manga by Status:`);
    Object.entries(summary.statistics.mangaProgress.byStatus).forEach(([status, data]) => {
      console.log(`   ${status}: ${data.count} entries (${data.chaptersRead} chapters read, avg score: ${data.averageScore.toFixed(1)})`);
    });
    
    console.log(`\n✨ Files created:`);
    console.log(`   • ${CONFIG.username}-animelist.json`);
    console.log(`   • ${CONFIG.username}-mangalist.json`);
    console.log(`   • ${CONFIG.username}-summary.json`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nℹ️  Troubleshooting:');
    console.error('   1. Make sure your internet connection is working');
    console.error('   2. Verify MyAnimeList API is accessible');
    if (CONFIG.useProxy) {
      console.error('   3. To use proxy, run: node proxy-server.js in another terminal');
    }
    console.error(`   4. Try with direct API: USE_PROXY=false node fetch-user-data.js`);
    process.exit(1);
  }
}

// Run
main();
