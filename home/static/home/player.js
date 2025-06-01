document.addEventListener('DOMContentLoaded', () => {
    const progressBar = document.querySelector('.progress-bar input');

    // Use sessionStorage as fallback if localStorage is cleared on reload
    let lastPlayed = localStorage.getItem('lastPlayedTrack');
    if (!lastPlayed) {
        lastPlayed = sessionStorage.getItem('lastPlayedTrack');
    }
    if (lastPlayed) {
        try {
            const { trackUrl, trackTitle, artistName, coverUrl } = JSON.parse(lastPlayed);
            currentTrackUrl = trackUrl;
            audioElement.src = trackUrl;
            audioElement.pause();
            playButton.classList.remove('fa-circle-pause');
            playButton.classList.add('fa-circle-play');
            document.querySelector('.firstword').textContent = trackTitle;
            document.querySelector('.secondword').textContent = artistName;
            document.querySelector('.album img').src = coverUrl;
        } catch (e) {
            // Ignore parse errors
        }
    }

    // Toggle green on shuffle and repeat buttons with state persistence
    const shuffleBtn = document.getElementById('shuffle-button');
    const repeatBtn = document.getElementById('repeat-button');
    
    // Load saved states from localStorage
    if (shuffleBtn) {
        const savedShuffleState = localStorage.getItem('shuffleState') === 'true';
        if (savedShuffleState) {
            shuffleBtn.classList.add('active');
        }
        
        shuffleBtn.addEventListener('click', () => {
            shuffleBtn.classList.toggle('active');
            localStorage.setItem('shuffleState', shuffleBtn.classList.contains('active'));
        });
    }

    if (repeatBtn) {
        const savedRepeatState = localStorage.getItem('repeatState') === 'true';
        if (savedRepeatState) {
            repeatBtn.classList.add('active');
        }
        
        repeatBtn.addEventListener('click', () => {
            repeatBtn.classList.toggle('active');
            localStorage.setItem('repeatState', repeatBtn.classList.contains('active'));
        });
    }

    // Add ended event listener to handle repeat and shuffle
    audioElement.addEventListener('ended', () => {
        const shuffleActive = shuffleBtn && shuffleBtn.classList.contains('active');
        const repeatActive = repeatBtn && repeatBtn.classList.contains('active');

        if (repeatActive) {
            // Repeat current track
            audioElement.currentTime = 0;
            audioElement.play().catch(err => console.error('Error replaying track:', err));
        } else if (shuffleActive) {
            // Play random track
            playRandomTrack();
        } else {
            // Play next track sequentially
            playNextTrack();
        }
    });

    // --- Login Modal Logic ---
    const loginButtonTrigger = document.getElementById('login-button-trigger');
    const loginModal = document.getElementById('login-modal');
    const closeModalButton = document.getElementById('close-modal-button');

    if (loginButtonTrigger && loginModal && closeModalButton) {
        loginButtonTrigger.addEventListener('click', () => {
            loginModal.style.display = 'flex'; // Show modal
            setTimeout(() => loginModal.classList.remove('hidden'), 10); // Start fade-in
        });

        closeModalButton.addEventListener('click', () => {
            loginModal.classList.add('hidden');
            // Wait for fade-out transition before setting display to none
            loginModal.addEventListener('transitionend', () => {
                loginModal.style.display = 'none';
            }, { once: true });
        });

        // Close modal if clicking outside the content area
        loginModal.addEventListener('click', (event) => {
            if (event.target === loginModal) { // Check if the click is on the overlay itself
                closeModalButton.click(); // Trigger the close button's logic
            }
        });
    } else {
        console.error('Login modal elements not found.');
    }
    // --- End Login Modal Logic ---

    // Update click handler for search results
    document.addEventListener('click', (e) => {
        const searchItem = e.target.closest('.search-track-item');
        if (searchItem) {
            const trackUrl = searchItem.dataset.trackUrl;
            const trackTitle = searchItem.dataset.trackTitle;
            const artistName = searchItem.dataset.artistName;
            const coverUrl = searchItem.dataset.coverUrl;
            
            if (trackUrl) {
                playTrack(trackUrl, trackTitle, artistName, coverUrl);
                
                // Close search modal
                const searchModal = document.getElementById('search-modal');
                if (searchModal) {
                    searchModal.remove();
                }
            }
        }
    });

});

// Add these helper functions outside the DOMContentLoaded event
function playRandomTrack() {
    if (!trackList || trackList.length === 0) return;
    let nextIndex;
    do {
        nextIndex = Math.floor(Math.random() * trackList.length);
    } while (trackList.length > 1 && nextIndex === currentTrackIndex);
    
    const nextTrack = trackList[nextIndex];
    playTrack(nextTrack.url, nextTrack.title, nextTrack.artist, nextTrack.cover, nextTrack.icon);
}

function playNextTrack() {
    // Check shuffle state before playing next
    const shuffleBtn = document.getElementById('shuffle-button');
    const shuffleActive = shuffleBtn && shuffleBtn.classList.contains('active');
    if (shuffleActive) {
        playRandomTrack();
        return;
    }
    if (!trackList || trackList.length === 0) return;
    const nextIndex = (currentTrackIndex + 1) % trackList.length;
    const nextTrack = trackList[nextIndex];
    playTrack(nextTrack.url, nextTrack.title, nextTrack.artist, nextTrack.cover, nextTrack.icon);
}

// Function to show the search modal
function showSearchModal(playlistId) {
    const modalHTML = `
        <div id="search-modal" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:#000a; z-index:3000; display:flex; align-items:center; justify-content:center;">
            <div style="background:#121212; padding:20px; border-radius:8px; width:400px; max-width:90%; color:white; position:relative;">
                <i class="bi bi-x-lg" aria-label="Close" id="search-modal-close-btn" style="position:absolute;top:12px;right:14px;cursor:pointer;font-size:1.5rem;"></i>
                <h3 style="margin:0 0 10px;">Add Track to Playlist</h3>
                <input id="search-input" type="text" placeholder="Search for a track..." style="width:100%; padding:10px; border-radius:4px; border:none; margin-bottom:10px;"/>
                <div id="search-results" style="max-height:200px; overflow-y:auto;"></div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const closeIcon = document.getElementById('search-modal-close-btn');

    // Handle search input
    searchInput.addEventListener('input', async () => {
        const query = searchInput.value.trim();
        if (query.length < 2) {
            searchResults.innerHTML = '<p style="color:#888;">Type at least 2 characters to search.</p>';
            return;
        }

        try {
            const response = await fetch(`/api/search_tracks/?query=${encodeURIComponent(query)}`);
            if (!response.ok) {
                searchResults.innerHTML = '<p style="color:#888;">An error occurred while searching.</p>';
                return;
            }
            const result = await response.json();
            const tracksArray = result.tracks;

            if (!Array.isArray(tracksArray) || tracksArray.length === 0) {
                searchResults.innerHTML = '<p style="color:#888;">No tracks found.</p>';
                return;
            }

            // Updated search results HTML with play functionality and add button
            searchResults.innerHTML = tracksArray.map(track => `
                <div class="search-result-item" 
                     data-track-url="${track.file_url}"
                     data-track-title="${track.title}"
                     data-artist-name="${track.artist}"
                     data-cover-url="${track.cover_url || track.image_url}"
                     data-track-id="${track.id}"
                     style="padding:10px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #333;">
                    <div class="track-info" style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                        <img src="${track.cover_url || track.image_url}" alt="cover" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">
                        <div>
                            <p style="margin:0; font-size:14px;"><strong>${track.title}</strong></p>
                            <p style="margin:0; font-size:12px; color:#888;">${track.artist}</p>
                        </div>
                    </div>
                    <button class="add-to-playlist-btn" style="background:#1ed760; color:#000; border:none; border-radius:4px; padding:4px 8px; cursor:pointer;">Add</button>
                </div>
            `).join('');

            // Add click events for play and add functionality
            document.querySelectorAll('.search-result-item').forEach(item => {
                // Play track when clicking the track info
                item.querySelector('.track-info').addEventListener('click', () => {
                    const trackData = item.dataset;
                    playTrack(
                        trackData.trackUrl,
                        trackData.trackTitle,
                        trackData.artistName,
                        trackData.coverUrl
                    );
                });

                // Add to playlist when clicking the Add button
                item.querySelector('.add-to-playlist-btn').addEventListener('click', async (event) => {
                    event.stopPropagation(); // Prevent track from playing
                    const trackId = item.dataset.trackId;
                    try {
                        const addResponse = await fetch('/api/add_track_to_playlist/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': getCsrfToken()
                            },
                            body: JSON.stringify({ playlist_id: playlistId, track_id: trackId })
                        });
                        const addResult = await addResponse.json();
                        if (addResult.success) {
                            document.getElementById('search-modal').remove();
                            loadPlaylist(playlistId, false);
                        } else {
                            alert(addResult.error || 'Failed to add track.');
                        }
                    } catch (error) {
                        console.error('Error adding track:', error);
                        alert('An error occurred while adding the track.');
                    }
                });
            });

        } catch (error) {
            searchResults.innerHTML = '<p style="color:#888;">An error occurred while searching.</p>';
        }
    });

    // Close modal
    if (closeIcon) {
        closeIcon.addEventListener('click', () => {
            document.getElementById('search-modal').remove();
        });
    }
}