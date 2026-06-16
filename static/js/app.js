document.addEventListener('DOMContentLoaded', () => {
    // State Management
    let allReleaseNotes = [];
    let activeFilter = 'all';
    let searchQuery = '';
    let selectedUpdateData = null;

    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = refreshBtn.querySelector('.spinner-icon');
    const cacheStatus = document.getElementById('cache-status');
    const statusDot = document.querySelector('.status-dot');
    
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const filterChips = document.querySelectorAll('.chip');
    
    const notesList = document.getElementById('notes-list');
    const skeletonLoader = document.getElementById('skeleton-loader');
    const emptyState = document.getElementById('empty-state');
    const resetFiltersBtn = document.getElementById('reset-filters');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    
    // Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const modalDate = document.getElementById('modal-date');
    const modalType = document.getElementById('modal-type');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCounter = document.getElementById('char-counter');
    const charWarning = document.getElementById('char-warning');
    const originalSnippetText = document.getElementById('original-snippet-text');
    const copyTweetBtn = document.getElementById('copy-tweet-btn');
    const postTweetBtn = document.getElementById('post-tweet-btn');
    const toast = document.getElementById('toast');

    // Fetch Release Notes from API
    async function fetchReleaseNotes() {
        showLoadingState(true);
        try {
            const response = await fetch('/api/release-notes');
            if (!response.ok) {
                throw new Error(`Server returned status ${response.status}`);
            }
            const data = await response.json();
            allReleaseNotes = data.entries || [];
            
            // Update cache status
            const isCached = data.cached;
            const updatedTime = new Date(data.timestamp * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            cacheStatus.textContent = isCached ? `Cached (Sync: ${updatedTime})` : `Updated at ${updatedTime}`;
            
            renderReleaseNotes();
        } catch (error) {
            console.error('Failed to load release notes:', error);
            cacheStatus.textContent = 'Sync Failed';
            notesList.innerHTML = `
                <div class="glass-panel" style="padding: 2.5rem; text-align: center;">
                    <div style="color: #ef4444; margin-bottom: 1rem;">
                        <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="2" fill="none">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                    </div>
                    <h3 style="margin-bottom: 8px;">Unable to fetch release notes</h3>
                    <p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 1.5rem;">
                        ${error.message || 'There was a network error fetching the BigQuery feed.'}
                    </p>
                    <button id="retry-btn" class="btn btn-secondary">Retry Now</button>
                </div>
            `;
            document.getElementById('retry-btn')?.addEventListener('click', fetchReleaseNotes);
        } finally {
            showLoadingState(false);
        }
    }

    // Toggle loading states in UI
    function showLoadingState(isLoading) {
        if (isLoading) {
            skeletonLoader.classList.remove('hidden');
            notesList.classList.add('hidden');
            emptyState.classList.add('hidden');
            refreshIcon.classList.add('loading');
            statusDot.className = 'status-dot loading';
            refreshBtn.disabled = true;
        } else {
            skeletonLoader.classList.add('hidden');
            notesList.classList.remove('hidden');
            refreshIcon.classList.remove('loading');
            statusDot.className = 'status-dot green';
            refreshBtn.disabled = false;
        }
    }

    // Helper to highlight matching text in search
    function highlightText(text, query) {
        if (!query || !query.trim()) return text;
        
        // Escape regex special chars
        const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        
        return text.replace(regex, '<mark style="background: rgba(99, 102, 241, 0.4); color: #fff; padding: 0px 2px; border-radius: 3px;">$1</mark>');
    }

    // Process and render release notes
    function renderReleaseNotes() {
        notesList.innerHTML = '';
        
        // Filter entries
        const filteredEntries = allReleaseNotes.map(entry => {
            // Filter the updates inside this entry
            const filteredUpdates = entry.updates.filter(update => {
                // Category match
                const typeMatches = activeFilter === 'all' || 
                                    update.type.toLowerCase() === activeFilter.toLowerCase();
                
                // Text search match (checks type and body content)
                const textMatches = !searchQuery || 
                                    update.type.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                    update.text.toLowerCase().includes(searchQuery.toLowerCase());
                
                return typeMatches && textMatches;
            });

            return {
                ...entry,
                updates: filteredUpdates
            };
        }).filter(entry => entry.updates.length > 0); // Only keep days that have matching updates

        if (filteredEntries.length === 0) {
            emptyState.classList.remove('hidden');
            notesList.classList.add('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        notesList.classList.remove('hidden');

        filteredEntries.forEach(entry => {
            const card = document.createElement('article');
            card.className = 'release-card glass-panel';
            
            // Format link text or fallback
            const permalink = entry.link || '#';
            
            let updatesHtml = '';
            entry.updates.forEach(update => {
                const typeClass = getTagClass(update.type);
                
                // Highlight matches in update text body
                let highlightedHtml = update.html;
                if (searchQuery) {
                    highlightedHtml = highlightText(update.html, searchQuery);
                }

                updatesHtml += `
                    <div class="update-item">
                        <div class="update-item-header">
                            <span class="type-tag ${typeClass}">${update.type}</span>
                            <div class="update-actions">
                                <button class="btn-action copy-action" title="Copy to Clipboard">
                                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                </button>
                                <button class="btn-action tweet-action" title="Share on X" data-date="${entry.date}" data-type="${update.type}" data-link="${permalink}">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div class="update-body">${highlightedHtml}</div>
                    </div>
                `;
            });

            card.innerHTML = `
                <div class="release-card-header">
                    <div class="release-date">
                        <svg class="calendar-icon" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        <span>${entry.date}</span>
                    </div>
                    <a href="${permalink}" class="release-permalink" target="_blank" rel="noopener noreferrer">Permalink &rarr;</a>
                </div>
                <div class="release-updates">
                    ${updatesHtml}
                </div>
            `;

            notesList.appendChild(card);
        });

        // Add event listeners to the new Tweet buttons
        document.querySelectorAll('.tweet-action').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget;
                const updateDate = target.getAttribute('data-date');
                const updateType = target.getAttribute('data-type');
                const entryLink = target.getAttribute('data-link');
                
                // Get the text snippet
                const updateItem = target.closest('.update-item');
                const updateBodyElement = updateItem.querySelector('.update-body');
                // Extract clean text (excluding HTML tags)
                const cleanText = updateBodyElement.textContent.trim();
                
                openTweetModal({
                    date: updateDate,
                    type: updateType,
                    text: cleanText,
                    link: entryLink
                });
            });
        });

        // Add event listeners to the new Copy buttons
        document.querySelectorAll('.copy-action').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget;
                const updateItem = target.closest('.update-item');
                const updateBodyElement = updateItem.querySelector('.update-body');
                const cleanText = updateBodyElement.textContent.trim();
                
                try {
                    navigator.clipboard.writeText(cleanText);
                    showToast('Copied update to clipboard!');
                } catch (err) {
                    showToast('Failed to copy text.');
                }
            });
        });
    }

    // Map release categories to CSS classes
    function getTagClass(type) {
        const t = type.toLowerCase();
        if (t.includes('feature')) return 'feature';
        if (t.includes('change')) return 'changed';
        if (t.includes('deprecat') || t.includes('removed')) return 'deprecated';
        if (t.includes('notice') || t.includes('alert')) return 'notice';
        return 'other';
    }

    // Modal Control: Open and construct draft
    function openTweetModal(update) {
        selectedUpdateData = update;
        
        modalDate.textContent = update.date;
        modalType.textContent = update.type;
        modalType.className = `modal-badge-type ${getTagClass(update.type)}`;
        
        // Show original text snippet
        originalSnippetText.textContent = update.text;
        
        // Construct pre-filled tweet text
        // E.g.: "🚀 BigQuery Release (June 15, 2026) - Feature:\nGemini Cloud Assist allows SQL query optimization...\n\nRead more:\nhttps://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
        const emoji = getEmojiForType(update.type);
        const header = `${emoji} BigQuery Release (${update.date}) - ${update.type}:\n`;
        const linkStr = `\n\nRead details: ${update.link}`;
        
        // Target tweet character calculation: header + body + footer = 280
        // We might need to truncate the main body if it's too long, to fit under 280
        const availableBodyLength = 280 - header.length - linkStr.length - 2;
        let tweetBody = update.text;
        
        if (tweetBody.length > availableBodyLength) {
            tweetBody = tweetBody.substring(0, availableBodyLength - 3) + '...';
        }
        
        tweetTextarea.value = `${header}${tweetBody}${linkStr}`;
        
        // Open Modal
        tweetModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Lock background scroll
        
        updateCharCounter();
        tweetTextarea.focus();
    }

    function getEmojiForType(type) {
        const t = type.toLowerCase();
        if (t.includes('feature')) return '🚀';
        if (t.includes('change')) return '⚙️';
        if (t.includes('deprecat')) return '⚠️';
        if (t.includes('notice')) return '📢';
        return '🔄';
    }

    // Close Modal
    function closeTweetModal() {
        tweetModal.classList.add('hidden');
        document.body.style.overflow = ''; // Unlock scroll
        selectedUpdateData = null;
    }

    // Live character count calculation
    function updateCharCounter() {
        const len = tweetTextarea.value.length;
        charCounter.textContent = `${len} / 280`;
        
        if (len > 280) {
            charCounter.className = 'char-counter exceeded';
            charWarning.classList.remove('hidden');
        } else if (len > 250) {
            charCounter.className = 'char-counter warning';
            charWarning.classList.add('hidden');
        } else {
            charCounter.className = 'char-counter';
            charWarning.classList.add('hidden');
        }
    }

    // Copy tweet content to clipboard
    function copyTweetText() {
        tweetTextarea.select();
        tweetTextarea.setSelectionRange(0, 99999); // For mobile devices
        
        try {
            navigator.clipboard.writeText(tweetTextarea.value);
            showToast('Copied draft to clipboard!');
        } catch (err) {
            // Fallback for older browsers
            document.execCommand('copy');
            showToast('Copied draft to clipboard!');
        }
    }

    // Launch X Web Intent
    function postToTwitter() {
        const text = tweetTextarea.value;
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    // Show dynamic overlay toast notifications
    function showToast(message) {
        toast.textContent = message;
        toast.classList.remove('hidden');
        toast.style.opacity = '1';
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 300);
        }, 2000);
    }

    // Event Listeners for controls
    refreshBtn.addEventListener('click', fetchReleaseNotes);
    
    // Search handler
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (searchQuery.trim().length > 0) {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        renderReleaseNotes();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        renderReleaseNotes();
        searchInput.focus();
    });

    // Chips filter selection
    filterChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            filterChips.forEach(c => c.classList.remove('active'));
            const targetChip = e.currentTarget;
            targetChip.classList.add('active');
            activeFilter = targetChip.getAttribute('data-filter');
            renderReleaseNotes();
        });
    });

    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        
        filterChips.forEach(c => c.classList.remove('active'));
        filterChips[0].classList.add('active'); // Set to 'All'
        activeFilter = 'all';
        
        renderReleaseNotes();
    });

    // Modal close hooks
    closeModalBtn.addEventListener('click', closeTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetModal();
        }
    });

    // Handle escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !tweetModal.classList.contains('hidden')) {
            closeTweetModal();
        }
    });

    // Live textarea hook
    tweetTextarea.addEventListener('input', updateCharCounter);
    
    // CSV Export Logic
    function exportToCsv() {
        if (!allReleaseNotes.length) {
            showToast('No release notes to export!');
            return;
        }

        const filteredEntries = allReleaseNotes.map(entry => {
            const filteredUpdates = entry.updates.filter(update => {
                const typeMatches = activeFilter === 'all' || 
                                    update.type.toLowerCase() === activeFilter.toLowerCase();
                const textMatches = !searchQuery || 
                                    update.type.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                    update.text.toLowerCase().includes(searchQuery.toLowerCase());
                return typeMatches && textMatches;
            });
            return {
                ...entry,
                updates: filteredUpdates
            };
        }).filter(entry => entry.updates.length > 0);

        if (!filteredEntries.length) {
            showToast('No filtered release notes to export!');
            return;
        }

        // Generate CSV content
        let csvContent = '\uFEFFDate,Type,Description,Link\n'; // UTF-8 BOM
        
        filteredEntries.forEach(entry => {
            const permalink = entry.link || '';
            entry.updates.forEach(update => {
                const dateVal = `"${entry.date.replace(/"/g, '""')}"`;
                const typeVal = `"${update.type.replace(/"/g, '""')}"`;
                const textVal = `"${update.text.replace(/"/g, '""')}"`;
                const linkVal = `"${permalink.replace(/"/g, '""')}"`;
                csvContent += `${dateVal},${typeVal},${textVal},${linkVal}\n`;
            });
        });

        // Trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `bigquery_release_notes_${activeFilter}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Exported CSV successfully!');
    }

    // Action events
    copyTweetBtn.addEventListener('click', copyTweetText);
    postTweetBtn.addEventListener('click', postToTwitter);
    exportCsvBtn.addEventListener('click', exportToCsv);

    // Initial load
    fetchReleaseNotes();
});
