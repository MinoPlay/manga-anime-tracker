/**
 * MyAnimeList API v2 Wrapper
 * Provides methods to search and fetch anime/manga metadata
 */

const MAL_BASE_URL = 'https://api.myanimelist.net/v2';
const MAL_CLIENT_ID = 'a86cd94144af52f931b0a3ab74455192'; // For local testing
const MAL_RATE_LIMIT = 1000; // MyAnimeList allows more requests

class MALAPI {
  constructor() {
    this.requestCount = 0;
    this.lastResetTime = Date.now();
    this.debug = true; // Enable detailed logging
    this.lastError = null; // Store last error for debugging
    this.lastResponse = null; // Store last response for debugging
    this.proxyUrl = 'http://localhost:3000'; // CORS Proxy URL (optional)
    this.useProxy = false; // Set to true to always use proxy, false for fallback
  }

  /**
   * Log with optional debug mode
   */
  log(message, data = null) {
    if (this.debug) {
      console.log(`[MAL] ${message}`, data || '');
    }
  }

  /**
   * Configure CORS proxy settings
   * @param {string} proxyUrl - URL of the proxy server
   * @param {boolean} useProxy - Whether to prefer proxy over direct requests
   */
  configureProxy(proxyUrl, useProxy = false) {
    this.proxyUrl = proxyUrl;
    this.useProxy = useProxy;
    this.log(`Proxy configured: ${proxyUrl} (useProxy: ${useProxy})`);
  }

  /**
   * Get last error details for debugging
   */
  getDebugInfo() {
    return {
      lastError: this.lastError,
      lastResponse: this.lastResponse,
      requestCount: this.requestCount,
      proxyUrl: this.proxyUrl,
      useProxy: this.useProxy
    };
  }

  /**
   * Check if we're within rate limits
   */
  async checkRateLimit() {
    const now = Date.now();
    if (now - this.lastResetTime > 60000) {
      // Reset counter every minute
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    if (this.requestCount >= MAL_RATE_LIMIT) {
      const waitTime = 60000 - (now - this.lastResetTime);
      console.warn(`Rate limit approaching. Wait ${waitTime}ms before next request.`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.requestCount++;
  }

  /**
   * Make API request to MyAnimeList (with fallback to proxy)
   */
  async request(endpoint) {
    try {
      await this.checkRateLimit();

      // Try proxy first (if available and useProxy is true), then fall back to direct
      const urls = [];
      
      if (this.useProxy || typeof window !== 'undefined') {
        // In browser environment, try proxy first
        urls.push({
          url: `${this.proxyUrl}${endpoint}`,
          isProxy: true,
          label: 'CORS Proxy'
        });
      }

      // Always add direct URL as fallback
      urls.push({
        url: `${MAL_BASE_URL}${endpoint}`,
        isProxy: false,
        label: 'Direct'
      });

      let lastError = null;

      for (const urlConfig of urls) {
        try {
          this.log(`Requesting: ${urlConfig.url} (${urlConfig.label})`);

          const response = await fetch(urlConfig.url, {
            headers: {
              'X-MAL-CLIENT-ID': MAL_CLIENT_ID,
              'Content-Type': 'application/json'
            }
          });

          const responseData = await response.json();

          // Store response for debugging
          this.lastResponse = {
            url: urlConfig.url,
            status: response.status,
            ok: response.ok,
            source: urlConfig.label,
            keys: Object.keys(responseData),
            dataLength: responseData.data ? (Array.isArray(responseData.data) ? responseData.data.length : 'object') : 'null'
          };

          if (!response.ok) {
            const errorMsg = responseData.message || `HTTP ${response.status}`;
            throw new Error(`API Error: ${errorMsg}`);
          }

          // Validate response structure
          if (!responseData.data) {
            this.log('Warning: Response missing "data" field', { response: responseData });
            return { data: [] };
          }

          this.log(`Success: Got ${Array.isArray(responseData.data) ? responseData.data.length : '1'} results from ${urlConfig.label}`);
          return responseData;
        } catch (error) {
          lastError = error;
          this.log(`${urlConfig.label} failed: ${error.message}`);
          continue; // Try next URL
        }
      }

      // All URLs failed
      throw lastError || new Error('All endpoints failed');
    } catch (error) {
      this.lastError = {
        message: error.message,
        endpoint: endpoint,
        timestamp: new Date().toISOString()
      };
      console.error(`MAL API request failed: ${error.message}`, this.lastError);
      throw error;
    }
  }

  /**
   * Search for anime
   * @param {string} query - Search query
   * @param {number} limit - Number of results (default: 25)
   * @returns {Promise<Array>} Array of anime results
   */
  async searchAnime(query, limit = 25) {
    try {
      if (!query || query.trim() === '') {
        this.log('Search anime: empty query, returning empty results');
        return [];
      }

      this.log(`Searching anime for: "${query}"`);
      const data = await this.request(`/anime?q=${encodeURIComponent(query)}&limit=${limit}`);

      const results = data.data || [];
      this.log(`Search anime results: ${results.length} items found`);
      return results;
    } catch (error) {
      console.error(`Search anime failed: ${error.message}`);
      this.lastError = { ...this.lastError, operation: 'searchAnime', query };
      return [];
    }
  }

  /**
   * Get detailed anime information
   * @param {number} animeId - Anime ID from MyAnimeList
   * @returns {Promise<Object>} Detailed anime data
   */
  async getAnimeDetails(animeId) {
    try {
      this.log(`Getting anime details for ID: ${animeId}`);
      // Request specific fields to optimize response size
      const fields = 'id,title,main_picture,synopsis,mean,num_episodes,status,genres,studios,aired,rating,source,season';
      const data = await this.request(`/anime/${animeId}?fields=${fields}`);
      const result = data.data || null;
      this.log(`Got anime details: ${result?.title || 'N/A'}`);
      return result;
    } catch (error) {
      console.error(`Get anime details failed: ${error.message}`);
      this.lastError = { ...this.lastError, operation: 'getAnimeDetails', animeId };
      return null;
    }
  }

  /**
   * Search for manga
   * @param {string} query - Search query
   * @param {number} limit - Number of results (default: 25)
   * @returns {Promise<Array>} Array of manga results
   */
  async searchManga(query, limit = 25) {
    try {
      if (!query || query.trim() === '') {
        this.log('Search manga: empty query, returning empty results');
        return [];
      }

      this.log(`Searching manga for: "${query}"`);
      const data = await this.request(`/manga?q=${encodeURIComponent(query)}&limit=${limit}`);

      const results = data.data || [];
      this.log(`Search manga results: ${results.length} items found`);
      return results;
    } catch (error) {
      console.error(`Search manga failed: ${error.message}`);
      this.lastError = { ...this.lastError, operation: 'searchManga', query };
      return [];
    }
  }

  /**
   * Get detailed manga information
   * @param {number} mangaId - Manga ID from MyAnimeList
   * @returns {Promise<Object>} Detailed manga data
   */
  async getMangaDetails(mangaId) {
    try {
      this.log(`Getting manga details for ID: ${mangaId}`);
      // Request specific fields to optimize response size
      const fields = 'id,title,main_picture,synopsis,mean,num_chapters,num_volumes,status,genres,authors,serialization,published,rating';
      const data = await this.request(`/manga/${mangaId}?fields=${fields}`);
      const result = data.data || null;
      this.log(`Got manga details: ${result?.title || 'N/A'}`);
      return result;
    } catch (error) {
      console.error(`Get manga details failed: ${error.message}`);
      this.lastError = { ...this.lastError, operation: 'getMangaDetails', mangaId };
      return null;
    }
  }

  /**
   * Get anime ranking
   * @param {string} rankingType - Type of ranking (all, airing, upcoming, etc.)
   * @param {number} limit - Number of results (default: 100, max: 500)
   * @returns {Promise<Array>} Ranked anime list
   */
  async getAnimeRanking(rankingType = 'all', limit = 100) {
    try {
      this.log(`Getting anime ranking: ${rankingType}`);
      const data = await this.request(`/anime/ranking?ranking_type=${encodeURIComponent(rankingType)}&limit=${Math.min(limit, 500)}`);
      const results = data.data || [];
      this.log(`Got ${results.length} ranked anime`);
      return results;
    } catch (error) {
      console.error(`Get anime ranking failed: ${error.message}`);
      this.lastError = { ...this.lastError, operation: 'getAnimeRanking', rankingType };
      return [];
    }
  }

  /**
   * Get manga ranking
   * @param {string} rankingType - Type of ranking (all, manga, oneshots, doujin, light_novels, etc.)
   * @param {number} limit - Number of results (default: 100, max: 500)
   * @returns {Promise<Array>} Ranked manga list
   */
  async getMangaRanking(rankingType = 'all', limit = 100) {
    try {
      this.log(`Getting manga ranking: ${rankingType}`);
      const data = await this.request(`/manga/ranking?ranking_type=${encodeURIComponent(rankingType)}&limit=${Math.min(limit, 500)}`);
      const results = data.data || [];
      this.log(`Got ${results.length} ranked manga`);
      return results;
    } catch (error) {
      console.error(`Get manga ranking failed: ${error.message}`);
      this.lastError = { ...this.lastError, operation: 'getMangaRanking', rankingType };
      return [];
    }
  }

  /**
   * Get user's anime list
   * @param {string} username - MyAnimeList username or @me for authenticated user
   * @param {string} status - Filter by status: watching, completed, on_hold, dropped, plan_to_watch (optional)
   * @param {number} limit - Number of results (default: 100, max: 1000)
   * @returns {Promise<Array>} User's anime list
   */
  async getUserAnimeList(username, status = null, limit = 100) {
    try {
      if (!username) {
        throw new Error('Username is required');
      }

      this.log(`Getting anime list for user: "${username}"`);
      
      let endpoint = `/users/${encodeURIComponent(username)}/animelist?limit=${Math.min(limit, 1000)}`;
      if (status) {
        endpoint += `&status=${encodeURIComponent(status)}`;
      }
      
      const data = await this.request(endpoint);
      const results = data.data || [];
      this.log(`Got ${results.length} anime from user list`);
      return results;
    } catch (error) {
      console.error(`Get user anime list failed: ${error.message}`);
      this.lastError = { ...this.lastError, operation: 'getUserAnimeList', username };
      return [];
    }
  }

  /**
   * Get user's manga list
   * @param {string} username - MyAnimeList username or @me for authenticated user
   * @param {string} status - Filter by status: reading, completed, on_hold, dropped, plan_to_read (optional)
   * @param {number} limit - Number of results (default: 100, max: 1000)
   * @returns {Promise<Array>} User's manga list
   */
  async getUserMangaList(username, status = null, limit = 100) {
    try {
      if (!username) {
        throw new Error('Username is required');
      }

      this.log(`Getting manga list for user: "${username}"`);
      
      let endpoint = `/users/${encodeURIComponent(username)}/mangalist?limit=${Math.min(limit, 1000)}`;
      if (status) {
        endpoint += `&status=${encodeURIComponent(status)}`;
      }
      
      const data = await this.request(endpoint);
      const results = data.data || [];
      this.log(`Got ${results.length} manga from user list`);
      return results;
    } catch (error) {
      console.error(`Get user manga list failed: ${error.message}`);
      this.lastError = { ...this.lastError, operation: 'getUserMangaList', username };
      return [];
    }
  }

  /**
   * Normalize API response to standardized metadata object
   * @param {Object} item - Full item object from MyAnimeList API
   * @param {string} type - Type: 'anime' or 'manga'
   * @returns {Object} Normalized metadata object
   */
  normalizeMetadata(item, type) {
    if (!item) return null;

    const baseMetadata = {
      jikanId: item.id || item.mal_id,
      title: item.title || '',
      englishTitle: item.alternative_titles?.en || item.title_english || '',
      logoUrl: item.main_picture?.medium || item.image?.jpg?.image_url || '',
      genres: (item.genres || []).map(g => typeof g === 'string' ? g : g.name).slice(0, 5),
      synopsis: item.synopsis || '',
      score: item.mean || item.score || 0,
      dateAdded: new Date().toISOString()
    };

    if (type === 'anime') {
      return {
        ...baseMetadata,
        episodes: item.num_episodes || 0,
        status: item.status || 'unknown',
        season: item.season || 'unknown',
        year: item.start_season?.year || new Date().getFullYear(),
        duration: item.average_episode_duration || 0,
        type: type
      };
    } else if (type === 'manga') {
      return {
        ...baseMetadata,
        episodes: item.num_chapters || 0, // Store chapters as episodes for consistency
        volumes: item.num_volumes || 0,
        status: item.status || 'unknown',
        type: type
      };
    }

    return baseMetadata;
  }

  /**
   * Test connection to MyAnimeList API
   */
  async testConnection() {
    try {
      this.log('Testing connection to MyAnimeList API...');
      const startTime = Date.now();

      const response = await fetch(`${MAL_BASE_URL}/anime/1`, {
        headers: {
          'X-MAL-CLIENT-ID': MAL_CLIENT_ID
        }
      });

      const duration = Date.now() - startTime;
      this.log(`Connection test successful. Response time: ${duration}ms`);

      return {
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`
      };
    } catch (error) {
      this.log(`Connection test failed: ${error.message}`);
      this.lastError = { message: error.message, operation: 'testConnection' };
      throw error;
    }
  }
}

// Create singleton instance
const malAPI = new MALAPI();
