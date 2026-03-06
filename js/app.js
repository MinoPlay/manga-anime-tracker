/**
 * Main Application Logic
 */

class AnimeTrackerApp {
  constructor() {
    this.currentTab = 'library';
    this.currentType = 'anime'; // 'anime' or 'manga'
    this.currentFilter = 'all'; // watching, plan-to-watch, completed, dropped, all
    this.searchResults = [];
    this.selectedSearchResult = null;

    // Load saved preferences
    this.currentTab = localStorage.getItem('lastTab') || 'library';
    this.currentType = localStorage.getItem('lastType') || 'anime';
    this.currentFilter = localStorage.getItem('lastFilter') || 'all';
    this.headerCollapsed = localStorage.getItem('headerCollapsed') === 'true';

    this.init();
  }

  async init() {
    console.log('[AnimeTrackerApp] Initializing Anime Tracker App...');
    console.log('[AnimeTrackerApp] Storage instance:', storage);
    console.log('[AnimeTrackerApp] MALDataLoader available:', typeof MALDataLoader);
    
    // Try to load MyAnimeList data first
    console.log('[AnimeTrackerApp] Attempting to load MAL data...');
    const malLoaded = await storage.loadMALData('TrulyYoursMino-animelist.json', 'TrulyYoursMino-mangalist.json', false);
    console.log('[AnimeTrackerApp] MAL data loaded result:', malLoaded);
    console.log('[AnimeTrackerApp] Library after MAL load:', storage.library);
    
    if (!malLoaded) {
      console.log('[AnimeTrackerApp] MAL data failed, loading library.json...');
      // If MAL data not available, load library from data/library.json
      await storage.loadLibrary();
    }
    
    // Setup event listeners
    console.log('[AnimeTrackerApp] Setting up event listeners...');
    this.setupEventListeners();
    
    // Set initial visual state for filters
    this.updateFilterVisuals();
    
    // Set initial collapse state
    if (this.headerCollapsed) {
      document.getElementById('app-header').classList.add('collapsed');
    }

    // Render initial view
    console.log('[AnimeTrackerApp] Showing library tab...');
    this.showTab('library');
    console.log('[AnimeTrackerApp] Updating stats...');
    this.updateStats();
    
    console.log('[AnimeTrackerApp] App initialized. Library entries:', storage.library.entries?.length || 0);
  }

  setupEventListeners() {
    // Tab buttons
    document.getElementById('tab-library-btn').addEventListener('click', () => this.showTab('library'));
    document.getElementById('tab-add-btn').addEventListener('click', () => this.showTab('add'));

    // Header filter stats
    document.querySelectorAll('.filter-stat').forEach(stat => {
      stat.addEventListener('click', () => {
        const type = stat.getAttribute('data-type');
        const filter = stat.getAttribute('data-filter');

        if (type) {
          this.setType(type);
        } else if (filter) {
          this.setFilter(filter);
        }
      });
    });

    // Add tab search
    document.getElementById('search-input').addEventListener('input', (e) => {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => this.searchEntries(e.target.value), 500);
    });
    document.getElementById('search-type-anime').addEventListener('click', () => this.setSearchType('anime'));
    document.getElementById('search-type-manga').addEventListener('click', () => this.setSearchType('manga'));
    // Modal close on click outside or ESC
    window.addEventListener('click', (e) => {
      const modal = document.getElementById('entry-detail-modal');
      if (e.target === modal) this.closeModal();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });

    // Add tab search
    document.getElementById('export-btn').addEventListener('click', () => this.exportLibrary());
    document.getElementById('import-btn').addEventListener('click', () => document.getElementById('import-file').click());
    document.getElementById('import-file').addEventListener('change', (e) => this.importLibrary(e));

    document.getElementById('edit-refresh-btn').addEventListener('click', () => this.refreshEditTab());

    // Header collapse toggle
    const headerToggle = document.querySelector('.header-main');
    headerToggle.addEventListener('click', () => {
      const header = document.getElementById('app-header');
      const isCollapsed = header.classList.toggle('collapsed');
      localStorage.setItem('headerCollapsed', isCollapsed);
    });
  }

  // ============ TAB MANAGEMENT ============

  showTab(tabName) {
    this.currentTab = tabName;
    localStorage.setItem('lastTab', tabName);
    
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    // Show selected tab and mark button active
    const tabElement = document.getElementById(`tab-${tabName}`);
    const btnElement = document.getElementById(`tab-${tabName}-btn`);
    
    if (tabElement) tabElement.style.display = 'block';
    if (btnElement) btnElement.classList.add('active');

    // Render tab content
    if (tabName === 'library') {
      this.renderLibrary();
    } else if (tabName === 'add') {
      this.renderAddTab();
    } else if (tabName === 'edit') {
      this.renderEditTab();
    }
  }

  // ============ LIBRARY TAB ============

  setFilter(filter) {
    this.currentFilter = filter;
    localStorage.setItem('lastFilter', filter);
    this.updateFilterVisuals();
    this.renderLibrary();
  }

  setType(type) {
    this.currentType = type;
    localStorage.setItem('lastType', type);
    this.updateFilterVisuals();
    this.renderLibrary();
  }

  updateFilterVisuals() {
    // Update visual state of all filter stats
    document.querySelectorAll('.filter-stat').forEach(stat => {
      stat.classList.remove('active');
      const type = stat.getAttribute('data-type');
      const filter = stat.getAttribute('data-filter');

      if (type === this.currentType) {
        stat.classList.add('active');
      }
      if (filter === this.currentFilter) {
        stat.classList.add('active');
      }
    });
  }

  renderLibrary() {
    console.log(`[AnimeTrackerApp.renderLibrary] Rendering library - Type: ${this.currentType}, Filter: ${this.currentFilter}`);
    console.log(`[AnimeTrackerApp.renderLibrary] Total entries in storage:`, storage.library.entries?.length);
    
    const container = document.getElementById('library-grid');
    container.innerHTML = '';

    // Get entries by type and filter
    let entries = storage.getByType(this.currentType);
    console.log(`[AnimeTrackerApp.renderLibrary] Entries for type ${this.currentType}:`, entries.length);
    if (this.currentFilter !== 'all') {
      entries = entries.filter(e => e.status === this.currentFilter);
    }

    if (entries.length === 0) {
      container.innerHTML = '<p class="empty-state">No entries found. Add some to get started!</p>';
      return;
    }

    entries.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'entry-card';
      
      // Calculate progress for display
      const totalUnits = this.currentType === 'anime' ? entry.episodes : entry.chapters;
      const progress = entry.progress || 0;
      const progressPercent = totalUnits ? Math.round((progress / totalUnits) * 100) : 0;
      const progressText = totalUnits ? `${progress}/${totalUnits}` : `${progress}`;
      
      // Build status display
      const statusDisplay = entry.status.replace('-', ' ').toUpperCase();
      const userScore = entry.userScore ? `⭐ ${entry.userScore}` : '';
      
      card.innerHTML = `
        <div class="card-content">
          <h3 class="card-title">${entry.title}</h3>
          ${entry.englishTitle && entry.englishTitle !== entry.title ? `<p class="category-english-title" style="font-size: 0.75rem; color: var(--text-light); margin-bottom: 2px;">${entry.englishTitle}</p>` : ''}
          
          <div class="progress-section">
            <div class="progress-info desktop-only">
              <span class="progress-text">${progressText}</span>
              ${userScore ? `<span class="user-score">${userScore}</span>` : ''}
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
            <p class="progress-percent desktop-only">${progressPercent}% complete</p>
          </div>

          <p class="card-meta desktop-only">${totalUnits || 'N/A'} ${this.currentType === 'anime' ? 'episodes' : 'chapters'}</p>
          <p class="card-meta desktop-only">${entry.season || entry.year || 'N/A'}</p>
        </div>

        <div class="mini-thumbnail" style="background-image: url('${entry.logoUrl}')"></div>
      `;
      card.addEventListener('click', () => this.showEntryDetail(entry));
      container.appendChild(card);
    });
  }

  showEntryDetail(entry) {
    const modal = document.getElementById('entry-detail-modal');
    const content = document.getElementById('entry-detail-content');

    // Check if we are on mobile (screen width <= 768px)
    const isMobile = window.innerWidth <= 768;

    // Calculate progress info
    const totalUnits = this.currentType === 'anime' ? entry.episodes : entry.chapters;
    const progress = entry.progress || 0;
    const progressPercent = totalUnits ? Math.round((progress / totalUnits) * 100) : 0;
    const progressText = totalUnits ? `${progress}/${totalUnits}` : `${progress}`;

    if (isMobile) {
      // Simplified mobile view with interactive controls
      content.innerHTML = `
        <div class="detail-container">
          <div style="display: flex; gap: 1rem; align-items: flex-start; margin-bottom: 1.5rem;">
            <img src="${entry.logoUrl}" alt="${entry.title}" style="width: 100px; border-radius: 8px;">
            <div style="flex: 1;">
              <h2 style="font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem; line-height: 1.2;">${entry.title}</h2>
              <p style="font-size: 0.85rem; color: #666;">
                <strong>${this.currentType === 'anime' ? 'Episodes' : 'Chapters'}:</strong> ${totalUnits || 'N/A'} • 
                <strong>Season:</strong> ${entry.season || 'N/A'}
              </p>
            </div>
          </div>
          
          <div style="display: flex; gap: 0.75rem; margin-bottom: 1.5rem;">
            <!-- Status Card -->
            <div class="status-card" style="flex: 1; padding: 0.75rem; border-radius: 8px; transition: background-color 0.3s ease;">
              <label style="display: block; font-size: 0.75rem; font-weight: bold; margin-bottom: 5px;">STATUS</label>
              <select id="modal-status-select" style="width: 100%; border: none; font-size: 0.9rem; font-weight: bold; appearance: none; background: transparent; cursor: pointer;">
                <option value="watching">WATCHING</option>
                <option value="plan-to-watch">PLAN TO WATCH</option>
                <option value="completed">COMPLETED</option>
                <option value="dropped">DROPPED</option>
              </select>
            </div>
            <!-- Progress Card -->
            <div style="flex: 1; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-white);">
              <label style="display: block; font-size: 0.75rem; font-weight: bold; margin-bottom: 5px; color: var(--text-light);">PROGRESS</label>
              <div style="display: flex; align-items: center;">
                <input type="number" id="modal-progress-input" value="${progress}" max="${totalUnits || 9999}" min="0" style="width: 60px; border: none; font-size: 1rem; font-weight: bold; color: var(--secondary-color); background: transparent;">
                <span style="font-size: 1rem; color: #999; margin: 0 4px;">/</span>
                <span id="modal-total-units" style="font-size: 1rem; color: #999;">${totalUnits || '?'}</span>
              </div>
            </div>
          </div>

          <div style="margin-bottom: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <span style="font-size: 0.75rem; font-weight: bold; color: var(--text-light);">COMPLETION</span>
              <span id="modal-progress-percent-text" style="font-size: 0.75rem; font-weight: bold; color: var(--secondary-color);">${progressPercent}%</span>
            </div>
            <div class="detail-progress-bar" style="height: 10px; background: #eee; border-radius: 5px; overflow: hidden;">
              <div id="modal-progress-bar-fill" class="progress-fill" style="width: ${progressPercent}%; height: 100%;"></div>
            </div>
          </div>

          <button id="modal-save-btn" style="width: 100%; padding: 1rem; border: none; border-radius: 8px; background-color: var(--secondary-color); color: white; font-weight: bold; font-size: 1rem; margin-bottom: 0.75rem; cursor: pointer;">Save Changes</button>
          <button onclick="appInstance.closeModal()" style="width: 100%; padding: 0.75rem; border: none; border-radius: 8px; background-color: transparent; color: var(--text-light); font-weight: bold; font-size: 0.9rem; cursor: pointer;">Cancel</button>
        </div>
      `;

      // Interactive logic for modal
      const statusCard = document.querySelector('.status-card');
      const statusSelect = document.getElementById('modal-status-select');
      const progressInput = document.getElementById('modal-progress-input');
      const progressBarFill = document.getElementById('modal-progress-bar-fill');
      const saveBtn = document.getElementById('modal-save-btn');

      // Track previous progress to allow reversion if switching back from "completed"
      let previousProgress = progress;

      // Make whole card clickable to trigger select
      statusCard.addEventListener('click', () => {
        statusSelect.focus();
        statusSelect.click(); // Trigger native dropdown if supported
      });

      const updateStatusColor = () => {
        const val = statusSelect.value;
        const parent = statusSelect.parentElement;
        parent.className = `status-card status-${val}`;
        
        // Adjust colors for better readability on colored background
        statusSelect.style.color = 'white';
        statusSelect.style.fontWeight = 'bold';
        parent.querySelector('label').style.color = 'rgba(255,255,255,0.8)';
      };

      const updateBar = () => {
        const val = parseInt(progressInput.value) || 0;
        const total = totalUnits || val || 1;
        const pct = Math.round((val / total) * 100);
        progressBarFill.style.width = Math.min(pct, 100) + '%';
        document.getElementById('modal-progress-percent-text').textContent = Math.min(pct, 100) + '%';
      };

      statusSelect.addEventListener('change', () => {
        updateStatusColor();
        if (statusSelect.value === 'completed' && totalUnits) {
          // Store actual progress before setting to 100%
          previousProgress = parseInt(progressInput.value) || 0;
          progressInput.value = totalUnits;
          updateBar();
        } else if (statusSelect.value !== 'completed' && previousProgress !== null) {
          // Revert progress if switching back from "completed"
          progressInput.value = previousProgress;
          updateBar();
        }
      });

      // Initialize color
      updateStatusColor();
      statusSelect.value = entry.status; // Ensure correct option is selected after setting up listener
      updateStatusColor();

      progressInput.addEventListener('input', updateBar);

      saveBtn.addEventListener('click', () => {
        const newStatus = statusSelect.value;
        const newProgress = parseInt(progressInput.value) || 0;
        
        // Update storage
        storage.updateEntry(entry.id, {
          status: newStatus,
          progress: newProgress,
          lastUpdated: new Date().toISOString()
        });
        
        // Persist to library.json
        storage.generateDownloadFile();
        
        this.renderLibrary();
        this.updateStats();
        this.closeModal();
      });

    } else {
      // Full desktop view (existing)
      content.innerHTML = `
        <div class="detail-container">
          <img src="${entry.logoUrl}" alt="${entry.title}" class="detail-image">
          <div class="detail-info">
            <h2>${entry.title}</h2>
            ${entry.englishTitle && entry.englishTitle !== entry.title ? `<p><strong>English:</strong> ${entry.englishTitle}</p>` : ''}
            ${entry.japaneseTitle ? `<p><strong>Japanese:</strong> ${entry.japaneseTitle}</p>` : ''}
            
            <div class="detail-status-section">
              <p><strong>Status:</strong> <span class="status-badge status-${entry.status}">${entry.status.replace('-', ' ').toUpperCase()}</span></p>
              ${entry.userScore ? `<p><strong>Your Rating:</strong> ⭐ ${entry.userScore}/10</p>` : ''}
              <p><strong>Progress:</strong> ${progressText} (${progressPercent}%)</p>
              
              ${progress > 0 ? `
                <div class="detail-progress-bar">
                  <div class="progress-fill" style="width: ${progressPercent}%"></div>
                </div>
              ` : ''}
              
              ${entry.startDate ? `<p><strong>Started:</strong> ${new Date(entry.startDate).toLocaleDateString()}</p>` : ''}
              ${entry.lastUpdated ? `<p><strong>Last Updated:</strong> ${new Date(entry.lastUpdated).toLocaleDateString()}</p>` : ''}
            </div>
            
            <p><strong>${this.currentType === 'anime' ? 'Episodes' : 'Chapters'}:</strong> ${totalUnits || 'N/A'}</p>
            ${entry.season ? `<p><strong>Season:</strong> ${entry.season}</p>` : ''}
            ${entry.duration ? `<p><strong>Duration:</strong> ${entry.duration}</p>` : ''}
            ${entry.score ? `<p><strong>Community Score:</strong> ${entry.score}/10</p>` : ''}
            ${entry.genres && entry.genres.length > 0 ? `<p><strong>Genres:</strong> ${entry.genres.join(', ')}</p>` : ''}
            ${entry.synopsis ? `<p><strong>Synopsis:</strong> ${entry.synopsis}</p>` : ''}
            ${entry.rewatch_count > 0 ? `<p><strong>Rewatches:</strong> ${entry.rewatch_count}</p>` : ''}
          </div>
        </div>
        <button onclick="appInstance.closeModal()">Close</button>
      `;
    }

    modal.style.display = 'block';
  }

  closeModal() {
    document.getElementById('entry-detail-modal').style.display = 'none';
  }

  // ============ ADD TAB ============

  async searchEntries(query) {
    if (!query.trim()) {
      this.searchResults = [];
      document.getElementById('search-results').innerHTML = '';
      return;
    }

    const type = document.getElementById('search-type-anime').classList.contains('active') ? 'anime' : 'manga';
    
    console.log(`Searching for ${type}: ${query}`);
    let results = [];

    if (type === 'anime') {
      results = await malAPI.searchAnime(query);
    } else {
      results = await malAPI.searchManga(query);
    }

    this.searchResults = results;
    this.renderSearchResults(results);
  }

  renderSearchResults(results) {
    const container = document.getElementById('search-results');
    container.innerHTML = '';

    if (results.length === 0) {
      container.innerHTML = '<p>No results found</p>';
      return;
    }

    results.slice(0, 10).forEach(result => {
      const resultEl = document.createElement('div');
      resultEl.className = 'search-result';
      const type = document.getElementById('search-type-anime').classList.contains('active') ? 'anime' : 'manga';
      const episodes = type === 'anime' ? result.episodes : result.chapters;
      
      resultEl.innerHTML = `
        <img src="${result.images?.jpg?.image_url || 'placeholder.png'}" alt="${result.title}">
        <div>
          <h4>${result.title}</h4>
          <p>${episodes || 'N/A'} ${type === 'anime' ? 'episodes' : 'chapters'} • ${result.status || 'N/A'}</p>
        </div>
      `;
      resultEl.addEventListener('click', () => this.selectSearchResult(result, type));
      container.appendChild(resultEl);
    });
  }

  selectSearchResult(result, type) {
    this.selectedSearchResult = { ...result, type };
    this.renderSelectedResult(result);
    document.getElementById('add-to-library-btn').style.display = 'block';
  }

  renderSelectedResult(result) {
    const container = document.getElementById('selected-result');
    const type = document.getElementById('search-type-anime').classList.contains('active') ? 'anime' : 'manga';
    
    container.innerHTML = `
      <div class="selected-item">
        <img src="${result.images?.jpg?.image_url || 'placeholder.png'}" alt="${result.title}">
        <div>
          <h3>${result.title}</h3>
          ${result.title_english && result.title_english !== result.title ? `<p><strong>English:</strong> ${result.title_english}</p>` : ''}
          <p><strong>Status:</strong> ${result.status || 'N/A'}</p>
          <p><strong>${type === 'anime' ? 'Episodes' : 'Chapters'}:</strong> ${(type === 'anime' ? result.episodes : result.chapters) || 'N/A'}</p>
          ${result.season && result.year ? `<p><strong>Season:</strong> ${result.season} ${result.year}</p>` : ''}
          ${result.synopsis ? `<p><strong>Synopsis:</strong> ${result.synopsis}</p>` : ''}
        </div>
      </div>
    `;
  }

  setSearchType(type) {
    document.querySelectorAll('.search-type-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`search-type-${type}`).classList.add('active');
    
    // Clear previous results
    document.getElementById('search-results').innerHTML = '';
    document.getElementById('selected-result').innerHTML = '';
    document.getElementById('add-to-library-btn').style.display = 'none';
    this.searchResults = [];
  }

  addSelectedToLibrary() {
    if (!this.selectedSearchResult) {
      alert('Please select an entry first');
      return;
    }

    const result = this.selectedSearchResult;
    const metadata = malAPI.extractMetadata(result, result.type);
    const entry = storage.addEntry(result.mal_id, result.type, metadata);

    alert(`Added: ${entry.title}`);
    
    // Reset form
    document.getElementById('search-input').value = '';
    document.getElementById('search-results').innerHTML = '';
    document.getElementById('selected-result').innerHTML = '';
    document.getElementById('add-to-library-btn').style.display = 'none';
    this.selectedSearchResult = null;
    
    this.updateStats();
  }

  renderAddTab() {
    // Just ensure elements are visible
    document.getElementById('search-input').value = '';
    document.getElementById('search-results').innerHTML = '';
    document.getElementById('selected-result').innerHTML = '';
    document.getElementById('add-to-library-btn').style.display = 'none';
  }

  // ============ EDIT TAB ============

  renderEditTab() {
    const container = document.getElementById('edit-list');
    container.innerHTML = '';

    const entries = storage.getByType(this.currentType);

    if (entries.length === 0) {
      container.innerHTML = '<p class="empty-state">No entries to edit</p>';
      return;
    }

    entries.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'edit-item';
      item.innerHTML = `
        <div class="edit-item-header">
          <h4>${entry.title}</h4>
          <span class="status-badge status-${entry.status}">${entry.status.replace('-', ' ')}</span>
        </div>
        <div class="edit-controls">
          <div class="control-group">
            <label>Status:</label>
            <select id="status-${entry.id}" onchange="appInstance.updateEntryStatus('${entry.id}', this.value)">
              <option value="watching" ${entry.status === 'watching' ? 'selected' : ''}>Watching</option>
              <option value="plan-to-watch" ${entry.status === 'plan-to-watch' ? 'selected' : ''}>Plan to Watch</option>
              <option value="completed" ${entry.status === 'completed' ? 'selected' : ''}>Completed</option>
              <option value="dropped" ${entry.status === 'dropped' ? 'selected' : ''}>Dropped</option>
            </select>
          </div>
          <div class="control-group">
            <label>Rewatches:</label>
            <div class="rewatch-controls">
              <button onclick="appInstance.decrementRewatch('${entry.id}')">−</button>
              <span>${entry.rewatch_count || 0}</span>
              <button onclick="appInstance.incrementRewatch('${entry.id}')">+</button>
            </div>
          </div>
          <button class="delete-btn" onclick="appInstance.deleteEntry('${entry.id}')">Delete</button>
        </div>
      `;
      container.appendChild(item);
    });
  }

  updateEntryStatus(entryId, newStatus) {
    storage.updateStatus(entryId, newStatus);
    console.log(`Updated ${entryId} status to ${newStatus}`);
    this.updateStats();
  }

  incrementRewatch(entryId) {
    storage.incrementRewatchCount(entryId);
    this.refreshEditTab();
    this.updateStats();
  }

  decrementRewatch(entryId) {
    const entry = storage.getEntry(entryId);
    if (entry && entry.rewatch_count > 0) {
      entry.rewatch_count--;
      entry.lastUpdated = new Date().toISOString();
      storage.isDirty = true;
      this.refreshEditTab();
      this.updateStats();
    }
  }

  deleteEntry(entryId) {
    if (confirm('Are you sure you want to delete this entry?')) {
      storage.deleteEntry(entryId);
      this.refreshEditTab();
      this.updateStats();
    }
  }

  refreshEditTab() {
    this.renderEditTab();
  }

  // ============ UTILITIES ============

  updateStats() {
    const stats = storage.getStats();
    document.getElementById('stat-anime-count').textContent = stats.animeCount || 0;
    document.getElementById('stat-manga-count').textContent = stats.mangaCount || 0;
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-watching-count').textContent = stats.watching;
    document.getElementById('stat-plan-count').textContent = stats.planToWatch;
    document.getElementById('stat-completed-count').textContent = stats.completed;
    document.getElementById('stat-dropped-count').textContent = stats.dropped;
    document.getElementById('stat-rewatches').textContent = stats.totalRewatches;
  }

  exportLibrary() {
    storage.generateDownloadFile();
    alert('Library exported! Upload library.json to your repo and commit.');
  }

  importLibrary(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const success = storage.importFromJSON(e.target.result);
      if (success) {
        alert('Library imported successfully!');
        this.showTab('library');
        this.updateStats();
      } else {
        alert('Failed to import library. Check file format.');
      }
    };
    reader.readAsText(file);
  }
}

// Create app instance
let appInstance;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  appInstance = new AnimeTrackerApp();
});
