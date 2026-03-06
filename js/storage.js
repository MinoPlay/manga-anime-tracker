/**
 * Storage Module
 * Handles loading, saving, and managing library data
 */

class StorageManager {
  constructor() {
    this.library = {
      entries: [],
      lastSynced: new Date().toISOString()
    };
    this.isDirty = false; // Track if data has unsaved changes
  }

  /**
   * Load library from data/library.json
   */
  async loadLibrary() {
    try {
      const response = await fetch('./data/library.json');
      if (!response.ok) throw new Error(`Failed to load library: ${response.status}`);
      
      this.library = await response.json();
      console.log(`Loaded library with ${this.library.entries.length} entries`);
      return this.library;
    } catch (error) {
      console.error(`Load library failed: ${error.message}`);
      // Return empty library if load fails
      this.library = { entries: [], lastSynced: new Date().toISOString() };
      return this.library;
    }
  }

  /**
   * Load MyAnimeList data from downloaded JSON files
   */
  async loadMALData(animeFile = 'TrulyYoursMino-animelist.json', mangaFile = 'TrulyYoursMino-mangalist.json', merge = true) {
    console.log('[StorageManager] loadMALData called with files:', animeFile, mangaFile);
    console.log('[StorageManager] Checking for MALDataLoader...');
    console.log('[StorageManager] typeof MALDataLoader:', typeof MALDataLoader);
    console.log('[StorageManager] typeof window.MALDataLoader:', typeof window.MALDataLoader);
    
    if (typeof MALDataLoader === 'undefined') {
      console.error('[StorageManager] MALDataLoader not available - class not defined');
      console.error('[StorageManager] Available globals:', Object.keys(window).filter(k => k.includes('Loader') || k.includes('MAL')));
      return false;
    }

    try {
      console.log('[StorageManager] Calling MALDataLoader.loadAllData()...');
      const malData = await MALDataLoader.loadAllData(animeFile, mangaFile);
      console.log('[StorageManager] MALDataLoader returned:', malData);
      
      if (merge) {
        console.log('[StorageManager] Merging with existing library');
        this.library = MALDataLoader.mergeWithLibrary(malData, this.library);
      } else {
        console.log('[StorageManager] Replacing library with MAL data');
        this.library = MALDataLoader.replaceWithMALData(malData);
      }
      
      console.log('[StorageManager] Library after load:', this.library);
      this.isDirty = true;
      console.log(`[StorageManager] Loaded MAL data: ${malData.anime.length} anime, ${malData.manga.length} manga`);
      console.log(`[StorageManager] Total library entries: ${this.library.entries?.length || 0}`);
      return true;
    } catch (error) {
      console.error('[StorageManager] Error in loadMALData:', error);
      return false;
    }
  }

  /**
   * Generate downloadable JSON file for manual push to GitHub
   */
  generateDownloadFile() {
    this.library.lastSynced = new Date().toISOString();
    const dataStr = JSON.stringify(this.library, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'library.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Add new entry to library
   */
  addEntry(jikanId, type, metadata) {
    const entryId = `${type}_${jikanId}_${Date.now()}`;
    
    const entry = {
      id: entryId,
      type: type, // 'anime' or 'manga'
      jikanId: jikanId,
      title: metadata.title,
      englishTitle: metadata.englishTitle,
      japaneseTitle: metadata.japaneseTitle,
      episodes: metadata.episodes,
      duration: metadata.duration,
      season: metadata.season,
      year: metadata.year,
      logoUrl: metadata.logoUrl,
      synopsis: metadata.synopsis,
      genres: metadata.genres,
      score: metadata.score,
      status: 'plan-to-watch', // Default status for new entries
      rewatch_count: 0,
      dateAdded: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    this.library.entries.push(entry);
    this.isDirty = true;
    console.log(`Added entry: ${entry.title}`);
    return entry;
  }

  /**
   * Update entry
   */
  updateEntry(entryId, updates) {
    const entry = this.library.entries.find(e => e.id === entryId);
    if (!entry) {
      console.error(`Entry not found: ${entryId}`);
      return null;
    }

    // Auto-complete progress if status is set to completed
    if (updates.status === 'completed') {
      const totalUnits = entry.type === 'manga' ? entry.chapters : entry.episodes;
      if (totalUnits) {
        updates.progress = totalUnits;
      }
    }

    Object.assign(entry, updates, { lastUpdated: new Date().toISOString() });
    this.isDirty = true;
    return entry;
  }

  /**
   * Update entry status
   */
  updateStatus(entryId, status) {
    const entry = this.library.entries.find(e => e.id === entryId);
    if (!entry) {
      console.error(`Entry not found: ${entryId}`);
      return null;
    }

    entry.status = status;
    entry.lastUpdated = new Date().toISOString();
    this.isDirty = true;
    return entry;
  }

  /**
   * Increment rewatch count
   */
  incrementRewatchCount(entryId) {
    const entry = this.library.entries.find(e => e.id === entryId);
    if (!entry) {
      console.error(`Entry not found: ${entryId}`);
      return null;
    }

    if (entry.status !== 'completed') {
      entry.status = 'completed';
    }
    entry.rewatch_count = (entry.rewatch_count || 0) + 1;
    entry.lastUpdated = new Date().toISOString();
    this.isDirty = true;
    return entry;
  }

  /**
   * Get entries filtered by status
   */
  getByStatus(status) {
    if (status === 'all') {
      return this.library.entries;
    }
    return this.library.entries.filter(e => e.status === status);
  }

  /**
   * Get entries by type (anime or manga)
   */
  getByType(type) {
    const filtered = this.library.entries.filter(e => e.type === type);
    console.log(`[StorageManager.getByType] Type: ${type}, Found: ${filtered.length}/${this.library.entries.length} total entries`);
    return filtered;
  }

  /**
   * Get single entry by ID
   */
  getEntry(entryId) {
    return this.library.entries.find(e => e.id === entryId);
  }

  /**
   * Delete entry
   */
  deleteEntry(entryId) {
    const index = this.library.entries.findIndex(e => e.id === entryId);
    if (index === -1) {
      console.error(`Entry not found: ${entryId}`);
      return false;
    }

    const removed = this.library.entries.splice(index, 1);
    this.isDirty = true;
    console.log(`Deleted entry: ${removed[0].title}`);
    return true;
  }

  /**
   * Get library statistics
   */
  getStats() {
    const stats = {
      total: this.library.entries.length,
      animeCount: this.library.entries.filter(e => e.type === 'anime').length,
      mangaCount: this.library.entries.filter(e => e.type === 'manga').length,
      watching: this.library.entries.filter(e => e.status === 'watching').length,
      planToWatch: this.library.entries.filter(e => e.status === 'plan-to-watch').length,
      completed: this.library.entries.filter(e => e.status === 'completed').length,
      dropped: this.library.entries.filter(e => e.status === 'dropped').length,
      totalRewatches: this.library.entries.reduce((sum, e) => sum + (e.rewatch_count || 0), 0)
    };
    return stats;
  }

  /**
   * Export library as JSON
   */
  exportAsJSON() {
    this.library.lastSynced = new Date().toISOString();
    return JSON.stringify(this.library, null, 2);
  }

  /**
   * Import library from JSON
   */
  importFromJSON(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      if (!imported.entries || !Array.isArray(imported.entries)) {
        throw new Error('Invalid library format');
      }
      this.library = imported;
      this.isDirty = true;
      console.log(`Imported library with ${this.library.entries.length} entries`);
      return true;
    } catch (error) {
      console.error(`Import failed: ${error.message}`);
      return false;
    }
  }
}

// Export singleton instance
const storage = new StorageManager();
