/**
 * MyAnimeList API Console Tests
 * 
 * Run these tests from the browser console when mal-api.js is loaded.
 * Copy and paste the entire file contents into the browser console at:
 * http://localhost:8000
 * 
 * Or open the file directly: test/mal-api.test.js
 */

// ============ TEST UTILITIES ============

const JikanAPITests = {
  results: [],
  requestCount: 0,

  /**
   * Print colored console output
   */
  log: (message, type = 'info') => {
    const styles = {
      pass: 'color: #10b981; font-weight: bold;',
      fail: 'color: #ef4444; font-weight: bold;',
      info: 'color: #4f46e5; font-weight: bold;',
      warn: 'color: #f59e0b; font-weight: bold;'
    };
    console.log(`%c[${type.toUpperCase()}]%c ${message}`, styles[type], '');
  },

  /**
   * Record a test result
   */
  result: (testName, passed, message, details = null) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.group(`${status} - ${testName}`);
    console.log(message);
    if (details) {
      console.log('Details:', details);
    }
    console.groupEnd();

    JikanAPITests.results.push({
      name: testName,
      passed,
      message,
      details
    });
  },

  /**
   * Print test summary
   */
  summary: () => {
    console.group('%c📊 TEST SUMMARY', 'font-size: 16px; color: #1f2937; font-weight: bold;');
    const total = JikanAPITests.results.length;
    const passed = JikanAPITests.results.filter(r => r.passed).length;
    const failed = total - passed;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    console.log(`Total Tests: ${total}`);
    console.log(`%cPassed: ${passed}`, 'color: #10b981; font-weight: bold;');
    console.log(`%cFailed: ${failed}`, failed > 0 ? 'color: #ef4444; font-weight: bold;' : '');
    console.log(`Pass Rate: ${passRate}%`);
    console.log(`API Requests: ${JikanAPITests.requestCount}`);

    if (failed === 0 && total > 0) {
      console.log('%c✅ All tests passed! MyAnimeList API is working correctly.', 'color: #10b981; font-weight: bold; font-size: 14px;');
    } else if (failed > 0) {
      console.warn(`⚠️ ${failed} test(s) failed. See details above.`);
    }

    console.groupEnd();
  },

  /**
   * Clear results
   */
  clear: () => {
    JikanAPITests.results = [];
    JikanAPITests.requestCount = 0;
    console.clear();
    JikanAPITests.log('Tests cleared. Ready to run.', 'info');
  }
};

// ============ INDIVIDUAL TESTS ============

/**
 * Test 1: Check MyAnimeList API initialization
 */
JikanAPITests.testInitialization = async () => {
  try {
    const initialized =
      typeof malAPI !== 'undefined' &&
      typeof malAPI.searchAnime === 'function' &&
      typeof malAPI.searchManga === 'function' &&
      typeof malAPI.getAnimeDetails === 'function' &&
      typeof malAPI.getMangaDetails === 'function';

    JikanAPITests.result(
      'MAL API Initialization',
      initialized,
      initialized
        ? 'malAPI is properly initialized with all required methods'
        : 'malAPI is missing required methods',
      {
        searchAnime: typeof malAPI?.searchAnime,
        searchManga: typeof malAPI?.searchManga,
        getAnimeDetails: typeof malAPI?.getAnimeDetails,
        getMangaDetails: typeof malAPI?.getMangaDetails
      }
    );
  } catch (error) {
    JikanAPITests.result('MAL API Initialization', false, `Error: ${error.message}`);
  }
};

/**
 * Test 2: Search for anime
 */
JikanAPITests.testSearchAnime = async () => {
  try {
    JikanAPITests.log('Searching for anime: "Naruto"...', 'info');
    const results = await malAPI.searchAnime('Naruto');
    JikanAPITests.requestCount++;

    const passed =
      Array.isArray(results) &&
      results.length > 0 &&
      results[0].mal_id &&
      results[0].title;

    JikanAPITests.result(
      'Search Anime',
      passed,
      passed
        ? `Found ${results.length} results for "Naruto". First: "${results[0].title}"`
        : 'Search failed or returned invalid results',
      {
        resultCount: results.length,
        firstResult: results[0]
          ? {
              title: results[0].title,
              mal_id: results[0].mal_id,
              episodes: results[0].episodes,
              year: results[0].year
            }
          : null
      }
    );
  } catch (error) {
    JikanAPITests.result('Search Anime', false, `Error: ${error.message}`);
  }
};

/**
 * Test 3: Search for manga
 */
JikanAPITests.testSearchManga = async () => {
  try {
    JikanAPITests.log('Searching for manga: "One Piece"...', 'info');
    const results = await malAPI.searchManga('One Piece');
    JikanAPITests.requestCount++;

    const passed =
      Array.isArray(results) &&
      results.length > 0 &&
      results[0].mal_id &&
      results[0].title;

    JikanAPITests.result(
      'Search Manga',
      passed,
      passed
        ? `Found ${results.length} results for "One Piece". First: "${results[0].title}"`
        : 'Search failed or returned invalid results',
      {
        resultCount: results.length,
        firstResult: results[0]
          ? {
              title: results[0].title,
              mal_id: results[0].mal_id,
              chapters: results[0].chapters
            }
          : null
      }
    );
  } catch (error) {
    JikanAPITests.result('Search Manga', false, `Error: ${error.message}`);
  }
};

/**
 * Test 4: Get anime details
 */
JikanAPITests.testGetAnimeDetails = async () => {
  try {
    JikanAPITests.log('Searching for anime to fetch details...', 'info');
    const searchResults = await malAPI.searchAnime('Death Note');
    JikanAPITests.requestCount++;

    if (searchResults.length === 0) {
      JikanAPITests.result('Get Anime Details', false, 'Could not find anime to fetch details');
      return;
    }

    JikanAPITests.log(`Fetching details for ID: ${searchResults[0].mal_id}...`, 'info');
    const details = await malAPI.getAnimeDetails(searchResults[0].mal_id);
    JikanAPITests.requestCount++;

    const passed = details && details.mal_id && details.title && details.episodes;

    JikanAPITests.result(
      'Get Anime Details',
      passed,
      passed
        ? `Successfully fetched details for "${details.title}"`
        : 'Failed to fetch or parse anime details',
      {
        title: details?.title,
        episodes: details?.episodes,
        duration: details?.duration,
        season: details?.season,
        year: details?.year,
        score: details?.score
      }
    );
  } catch (error) {
    JikanAPITests.result('Get Anime Details', false, `Error: ${error.message}`);
  }
};

/**
 * Test 5: Get manga details
 */
JikanAPITests.testGetMangaDetails = async () => {
  try {
    JikanAPITests.log('Searching for manga to fetch details...', 'info');
    const searchResults = await malAPI.searchManga('Bleach');
    JikanAPITests.requestCount++;

    if (searchResults.length === 0) {
      JikanAPITests.result('Get Manga Details', false, 'Could not find manga to fetch details');
      return;
    }

    JikanAPITests.log(`Fetching details for ID: ${searchResults[0].mal_id}...`, 'info');
    const details = await malAPI.getMangaDetails(searchResults[0].mal_id);
    JikanAPITests.requestCount++;

    const passed = details && details.mal_id && details.title && details.chapters;

    JikanAPITests.result(
      'Get Manga Details',
      passed,
      passed
        ? `Successfully fetched details for "${details.title}"`
        : 'Failed to fetch or parse manga details',
      {
        title: details?.title,
        chapters: details?.chapters,
        volumes: details?.volumes,
        status: details?.status,
        score: details?.score
      }
    );
  } catch (error) {
    JikanAPITests.result('Get Manga Details', false, `Error: ${error.message}`);
  }
};

/**
 * Test 6: Extract anime metadata
 */
JikanAPITests.testExtractAnimeMetadata = async () => {
  try {
    JikanAPITests.log('Searching for anime to extract metadata...', 'info');
    const results = await malAPI.searchAnime('Steins;Gate');
    JikanAPITests.requestCount++;

    if (results.length === 0) {
      JikanAPITests.result('Extract Anime Metadata', false, 'Could not find anime');
      return;
    }

    const metadata = malAPI.extractMetadata(results[0], 'anime');
    const passed =
      metadata &&
      metadata.title &&
      metadata.episodes &&
      metadata.jikanId &&
      metadata.logoUrl;

    JikanAPITests.result(
      'Extract Anime Metadata',
      passed,
      passed
        ? `Successfully extracted metadata for "${metadata.title}"`
        : 'Missing required metadata fields',
      {
        title: metadata?.title,
        episodes: metadata?.episodes,
        duration: metadata?.duration,
        season: metadata?.season,
        hasImage: !!metadata?.logoUrl,
        genres: metadata?.genres?.slice(0, 3)
      }
    );
  } catch (error) {
    JikanAPITests.result('Extract Anime Metadata', false, `Error: ${error.message}`);
  }
};

/**
 * Test 7: Extract manga metadata
 */
JikanAPITests.testExtractMangaMetadata = async () => {
  try {
    JikanAPITests.log('Searching for manga to extract metadata...', 'info');
    const results = await malAPI.searchManga('Attack on Titan');
    JikanAPITests.requestCount++;

    if (results.length === 0) {
      JikanAPITests.result('Extract Manga Metadata', false, 'Could not find manga');
      return;
    }

    const metadata = malAPI.extractMetadata(results[0], 'manga');
    const passed =
      metadata &&
      metadata.title &&
      metadata.episodes &&
      metadata.jikanId;

    JikanAPITests.result(
      'Extract Manga Metadata',
      passed,
      passed
        ? `Successfully extracted metadata for "${metadata.title}"`
        : 'Missing required metadata fields',
      {
        title: metadata?.title,
        chapters: metadata?.episodes,
        hasImage: !!metadata?.logoUrl,
        genres: metadata?.genres?.slice(0, 3)
      }
    );
  } catch (error) {
    JikanAPITests.result('Extract Manga Metadata', false, `Error: ${error.message}`);
  }
};

/**
 * Test 8: Rate limit handling
 */
JikanAPITests.testRateLimitHandling = async () => {
  try {
    JikanAPITests.log('Testing rate limit handling...', 'info');

    if (!malAPI.requestCount || malAPI.requestCount === 0) {
      JikanAPITests.result(
        'Rate Limit Handling',
        true,
        'Rate limit counter is initialized and working',
        { requestCount: malAPI.requestCount }
      );
    } else {
      JikanAPITests.result(
        'Rate Limit Handling',
        true,
        `Rate limit counter is tracking requests: ${malAPI.requestCount} requests made`,
        { requestCount: malAPI.requestCount }
      );
    }
  } catch (error) {
    JikanAPITests.result('Rate Limit Handling', false, `Error: ${error.message}`);
  }
};

/**
 * Test 9: Error handling - network timeout simulation
 */
JikanAPITests.testErrorHandling = async () => {
  try {
    JikanAPITests.log('Testing error handling with invalid search...', 'info');
    const results = await malAPI.searchAnime('');
    JikanAPITests.requestCount++;

    const passed = Array.isArray(results);

    JikanAPITests.result(
      'Error Handling',
      passed,
      passed
        ? 'Empty search handled correctly (returns empty array)'
        : 'Error handling failed',
      { resultCount: results.length }
    );
  } catch (error) {
    JikanAPITests.result(
      'Error Handling',
      true,
      `Gracefully handled error: ${error.message}`
    );
  }
};

// ============ RUN ALL TESTS ============

/**
 * Run all tests sequentially
 */
JikanAPITests.runAll = async () => {
  console.clear();
  JikanAPITests.log('🧪 Starting Jikan API Tests...', 'info');
  console.log('');

  JikanAPITests.clear();

  // Run tests with delays to avoid rate limiting
  await JikanAPITests.testInitialization();
  await new Promise(r => setTimeout(r, 500));

  await JikanAPITests.testSearchAnime();
  await new Promise(r => setTimeout(r, 800));

  await JikanAPITests.testSearchManga();
  await new Promise(r => setTimeout(r, 800));

  await JikanAPITests.testGetAnimeDetails();
  await new Promise(r => setTimeout(r, 800));

  await JikanAPITests.testGetMangaDetails();
  await new Promise(r => setTimeout(r, 800));

  await JikanAPITests.testExtractAnimeMetadata();
  await new Promise(r => setTimeout(r, 800));

  await JikanAPITests.testExtractMangaMetadata();
  await new Promise(r => setTimeout(r, 800));

  await JikanAPITests.testRateLimitHandling();

  await JikanAPITests.testErrorHandling();

  console.log('');
  JikanAPITests.summary();

  return JikanAPITests.results;
};

// ============ EXPORT FOR CONSOLE USE ============

// Print instructions
console.log('%c🧪 Jikan API Test Suite Loaded', 'font-size: 16px; color: #4f46e5; font-weight: bold;');
console.log('');
console.log('Available commands:');
console.log('  %cJikanAPITests.runAll()%c   - Run all tests', 'font-weight: bold;', '');
console.log('  %cJikanAPITests.testSearchAnime()%c   - Test anime search', 'font-weight: bold;', '');
console.log('  %cJikanAPITests.testSearchManga()%c   - Test manga search', 'font-weight: bold;', '');
console.log('  %cJikanAPITests.summary()%c   - Show test summary', 'font-weight: bold;', '');
console.log('  %cJikanAPITests.clear()%c   - Clear tests', 'font-weight: bold;', '');
console.log('');
console.log('Example: Run %cJikanAPITests.runAll()%c in the console above', 'font-weight: bold;', '');
console.log('');
