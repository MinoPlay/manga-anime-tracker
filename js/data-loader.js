/**
 * MyAnimeList Data Loader
 * Loads downloaded MAL data from JSON files and converts to app format
 */

console.log('[data-loader.js] Script loaded, defining MALDataLoader class');

class MALDataLoader {
  /**
   * Convert MAL anime/manga entry to app format
   */
  static malToAppFormat(malEntry, type = 'anime') {
    console.log('[MALDataLoader] Converting entry:', malEntry?.node?.title, 'Type:', type);
    const node = malEntry.node || {};
    const listStatus = malEntry.list_status || {};
    
    // Convert MAL status to app status
    const statusMap = {
      'watching': 'watching',
      'reading': 'watching', // Treat manga "reading" as "watching"
      'completed': 'completed',
      'on_hold': 'on_hold',
      'dropped': 'dropped',
      'plan_to_watch': 'plan-to-watch',
      'plan_to_read': 'plan-to-watch'
    };
    
    const appStatus = statusMap[listStatus.status] || 'plan-to-watch';
    
    const entryId = `${type}_${node.id}_mal`;
    
    return {
      id: entryId,
      type: type,
      malId: node.id,
      title: node.title || 'Unknown',
      englishTitle: node.alternative_titles?.en || '',
      japaneseTitle: node.alternative_titles?.ja || '',
      episodes: node.num_episodes || null,
      chapters: node.num_chapters || null,
      volumes: node.num_volumes || null,
      logoUrl: node.main_picture?.large || node.main_picture?.medium || '',
      synopsis: node.synopsis || '',
      genres: node.genres?.map(g => g.name) || [],
      score: node.mean || 0,
      userScore: listStatus.score || 0,
      status: appStatus,
      rewatch_count: listStatus.is_rewatching ? 1 : 0,
      progress: type === 'anime' 
        ? listStatus.num_episodes_watched || 0 
        : listStatus.num_chapters_read || 0,
      volumesRead: listStatus.num_volumes_read || 0,
      dateAdded: listStatus.start_date || new Date().toISOString(),
      lastUpdated: listStatus.updated_at || new Date().toISOString(),
      startDate: listStatus.start_date,
      mediaType: node.media_type,
      airedStatus: node.status
    };
  }

  /**
   * Load anime list from JSON file
   */
  static async loadAnimeList(filename = 'TrulyYoursMino-animelist.json') {
    try {
      const response = await fetch(`./data/${filename}`);
      if (!response.ok) {
        console.warn(`Could not load ${filename}: ${response.status}`);
        return [];
      }
      
      const malData = await response.json();
      console.log(`Loaded ${malData.length} anime from ${filename}`);
      
      return malData.map(entry => this.malToAppFormat(entry, 'anime'));
    } catch (error) {
      console.error(`Failed to load anime list: ${error.message}`);
      return [];
    }
  }

  /**
   * Load manga list from JSON file
   */
  static async loadMangaList(filename = 'TrulyYoursMino-mangalist.json') {
    try {
      const response = await fetch(`./data/${filename}`);
      if (!response.ok) {
        console.warn(`Could not load ${filename}: ${response.status}`);
        return [];
      }
      
      const malData = await response.json();
      console.log(`Loaded ${malData.length} manga from ${filename}`);
      
      return malData.map(entry => this.malToAppFormat(entry, 'manga'));
    } catch (error) {
      console.error(`Failed to load manga list: ${error.message}`);
      return [];
    }
  }

  /**
   * Load both anime and manga
   */
  static async loadAllData(animeFile = 'TrulyYoursMino-animelist.json', mangaFile = 'TrulyYoursMino-mangalist.json') {
    console.log('Loading MyAnimeList data...');
    
    const anime = await this.loadAnimeList(animeFile);
    const manga = await this.loadMangaList(mangaFile);
    
    return {
      anime: anime,
      manga: manga,
      total: anime.length + manga.length
    };
  }

  /**
   * Merge MAL data with existing library
   */
  static mergeWithLibrary(malData, existingLibrary) {
    console.log('[MALDataLoader.mergeWithLibrary] Merging data...');
    console.log('[MALDataLoader.mergeWithLibrary] MAL anime:', malData.anime.length, 'MAL manga:', malData.manga.length);
    console.log('[MALDataLoader.mergeWithLibrary] Existing entries:', existingLibrary.entries?.length || 0);
    
    // Remove existing MAL entries
    const filtered = existingLibrary.entries.filter(e => !e.malId);
    
    // Add all MAL entries
    const merged = [...filtered, ...malData.anime, ...malData.manga];
    
    console.log('[MALDataLoader.mergeWithLibrary] Final merged count:', merged.length);
    
    return {
      entries: merged,
      lastSynced: new Date().toISOString(),
      source: 'merged'
    };
  }

  /**
   * Replace entire library with MAL data
   */
  static replaceWithMALData(malData) {
    console.log('[MALDataLoader.replaceWithMALData] Creating library with MAL data...');
    console.log('[MALDataLoader.replaceWithMALData] Anime entries:', malData.anime.length);
    console.log('[MALDataLoader.replaceWithMALData] Manga entries:', malData.manga.length);
    
    const result = {
      entries: [...malData.anime, ...malData.manga],
      lastSynced: new Date().toISOString(),
      source: 'myanimelist'
    };
    
    console.log('[MALDataLoader.replaceWithMALData] Total entries:', result.entries.length);
    console.log('[MALDataLoader.replaceWithMALData] Sample entry:', result.entries[0]);
    
    return result;
  }
}

console.log('[data-loader.js] MALDataLoader class defined');
console.log('[data-loader.js] MALDataLoader available as window.MALDataLoader:', typeof window.MALDataLoader);
console.log('[data-loader.js] MALDataLoader keys:', Object.keys(MALDataLoader));
