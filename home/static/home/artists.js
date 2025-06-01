document.addEventListener('DOMContentLoaded', () => {
    const artistsGrid = document.getElementById('artists-grid-container');
    const artistDetailView = document.getElementById('artist-detail-view');
    const artistsMainView = document.querySelector('.artists-grid');

    let artistsData = []; // Store artists data globally

    async function loadArtists() {
        try {
            const response = await fetch('/api/artists/');
            const data = await response.json();

            // Check for authentication error
            if (data.error && data.error.toLowerCase().includes('not authenticated')) {
                artistsGrid.innerHTML = `
                    <div class="error-message" style="text-align:center;padding:40px 0;">
                        Please <span class="login-link" style="color:#1ed760;cursor:pointer;text-decoration:underline;">Sign In</span> to view artists.
                    </div>
                `;
                // Add click handler to show login modal
                const loginLink = artistsGrid.querySelector('.login-link');
                if (loginLink) {
                    loginLink.onclick = function() {
                        if (typeof showLoginModal === 'function') {
                            showLoginModal();
                        } else if (window.loginButtonTrigger) {
                            window.loginButtonTrigger.click();
                        }
                    };
                }
                return;
            }

            if (data.success) {
                artistsData = data.artists; // Store the artists data
                renderArtists(artistsData);
                document.getElementById('artists-count-display').textContent = artistsData.length;
            }
        } catch (error) {
            // If not authenticated, show sign in prompt instead of error
            if (window.isAuthenticated === false || (typeof window.isAuthenticated === 'undefined' && error && error.message && error.message.toLowerCase().includes('401'))) {
                artistsGrid.innerHTML = `
                    <div class="error-message" style="text-align:center;padding:40px 0;">
                        Please <span class="login-link" style="color:#1ed760;cursor:pointer;text-decoration:underline;">Sign In</span> to view artists.
                    </div>
                `;
                const loginLink = artistsGrid.querySelector('.login-link');
                if (loginLink) {
                    loginLink.onclick = function() {
                        if (typeof showLoginModal === 'function') {
                            showLoginModal();
                        } else if (window.loginButtonTrigger) {
                            window.loginButtonTrigger.click();
                        }
                    };
                }
            } else {
                artistsGrid.innerHTML = '<div class="error-message">Failed to load artists</div>';
            }
        }
    }

    function renderArtists(artists) {
        const artistsGrid = document.getElementById('artists-grid-container');
        artistsGrid.innerHTML = artists.map(artist => `
            <div class="artist-card" data-artist-id="${artist.artist_id}">
                <img src="${artist.artist_image_url || '/static/home/assets/logo.png'}" alt="${artist.name}">
                <h3>${artist.name}</h3>
            </div>
        `).join('');

        // Reattach click handlers
        document.querySelectorAll('.artist-card').forEach(card => {
            card.addEventListener('click', () => loadArtistBio(card.dataset.artistId));
        });
    }

    // Sort functionality
    document.getElementById('sort-artists').addEventListener('click', function() {
        this.classList.toggle('active');
        const sortedArtists = [...artistsData].sort((a, b) => 
            a.name.localeCompare(b.name)
        );
        renderArtists(sortedArtists);
    });

    // Shuffle functionality
    document.getElementById('shuffle-artists').addEventListener('click', function() {
        this.classList.toggle('active');
        const shuffledArtists = [...artistsData].sort(() => Math.random() - 0.5);
        renderArtists(shuffledArtists);
    });

    // Add a span for resetting search in the artists-controls
    const artistsControls = document.querySelector('.artists-controls');
    let resetSearchSpan = document.createElement('span');
    resetSearchSpan.id = 'reset-artists-search';
    resetSearchSpan.textContent = 'Reset Search';
    resetSearchSpan.style.display = 'none';
    artistsControls.appendChild(resetSearchSpan);

    // Search functionality
    const searchContainer = document.getElementById('artists-search-container');
    const searchInput = document.getElementById('artists-search-input');
    const searchClose = document.getElementById('artists-search-close');
    let lastArtistSearchTerm = '';

    document.getElementById('search-artists').addEventListener('click', () => {
        searchContainer.style.display = 'flex';
        searchInput.value = lastArtistSearchTerm;
        searchInput.focus();
    });

    searchClose.addEventListener('click', () => {
        searchContainer.style.display = 'none';
        // After closing, show what was searched for (if any)
        if (lastArtistSearchTerm.trim()) {
            // Filter and render artists based on last search
            const filteredArtists = artistsData.filter(artist =>
                artist.name.toLowerCase().includes(lastArtistSearchTerm.toLowerCase())
            );
            renderArtists(filteredArtists);
            resetSearchSpan.style.display = 'inline-block';
        } else {
            renderArtists(artistsData);
            resetSearchSpan.style.display = 'none';
        }
    });

    searchInput.addEventListener('input', (e) => {
        lastArtistSearchTerm = e.target.value;
        const searchTerm = lastArtistSearchTerm.toLowerCase();
        const filteredArtists = artistsData.filter(artist => 
            artist.name.toLowerCase().includes(searchTerm)
        );
        renderArtists(filteredArtists);
        resetSearchSpan.style.display = searchTerm ? 'inline-block' : 'none';
    });

    // Reset search handler
    resetSearchSpan.addEventListener('click', () => {
        lastArtistSearchTerm = '';
        searchInput.value = '';
        renderArtists(artistsData);
        resetSearchSpan.style.display = 'none';
    });

    // Close search on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && searchContainer.style.display === 'flex') {
            searchClose.click();
        }
    });

    async function loadArtistDetail(artistId) {
        try {
            const response = await fetch(`/api/artist_detail/${artistId}/`);
            const data = await response.json();
            
            if (data.success) {
                // Update artist info
                document.getElementById('artist-cover').src = data.artist.artist_image_url || '/static/home/assets/logo.png';
                document.getElementById('artist-name').textContent = data.artist.name;
                document.getElementById('artist-bio').textContent = data.artist.bio || 'No bio available';

                // Display tracks
                const tracksContainer = document.getElementById('artist-tracks');
                tracksContainer.innerHTML = data.tracks.map(track => `
                    <div class="track-item">
                        <img src="${track.track_img_url || track.image_url_or_default}" alt="${track.title}">
                        <div class="track-info">
                            <span class="track-title">${track.title}</span>
                            <span class="track-duration">${formatDuration(track.duration_seconds)}</span>
                        </div>
                        <i class="bi bi-play-circle-fill track-play-icon"
                           data-track-url="${track.file_url}"
                           data-track-title="${track.title}"
                           data-artist-name="${track.artist_name}"
                           data-cover-url="${track.track_img_url || track.image_url_or_default}">
                        </i>
                    </div>
                `).join('');

                // Show artist detail view
                artistsMainView.style.display = 'none';
                artistDetailView.style.display = 'block';

                // Add play functionality to tracks
                document.querySelectorAll('.track-play-icon').forEach(icon => {
                    icon.addEventListener('click', (e) => {
                        if (window.playTrack) {
                            window.playTrack(
                                e.target.dataset.trackUrl,
                                e.target.dataset.trackTitle,
                                e.target.dataset.artistName,
                                e.target.dataset.coverUrl,
                                e.target
                            );
                        }
                    });
                });
            }
        } catch (error) {
            console.error('Error loading artist details:', error);
        }
    }

    async function loadArtistBio(artistId) {
        const mainView = document.querySelector('.artists-grid');
        const bioView = document.querySelector('.artists-bio-content');
        const artistsHeader = document.querySelector('.artists-header');  // Add this line
        
        try {
            const response = await fetch(`/api/artist/${artistId}/`);
            const data = await response.json();
            
            if (data.success) {
                // Update bio content
                document.querySelector('.bio-name').textContent = data.artist.name;
                document.querySelector('.bio-text').textContent = data.artist.bio || 'No biography available';
                document.querySelector('.bio-image img').src = data.artist.artist_image_url2 || data.artist.artist_image_url;
                
                // Add tracks if available
                const tracksContainer = document.querySelector('.bio-tracks');
                if (data.tracks && data.tracks.length > 0) {
                    tracksContainer.innerHTML = `
                        <h2>Top Tracks</h2>
                        <div class="artist-tracks-list">
                            ${data.tracks.map((track, index) => `
                                <div class="track-item">
                                    <img src="${track.image_url}" alt="${track.title}">
                                    <div class="track-info">
                                        <span class="track-title">${track.title}</span>
                                        <span class="track-artist">${track.artist_name}</span>
                                    </div>
                                    <i class="bi bi-play-circle-fill track-play-icon"
                                       data-track-url="${track.file_url}"
                                       data-track-title="${track.title}"
                                       data-artist-name="${track.artist_name}"
                                       data-cover-url="${track.image_url}">
                                    </i>
                                </div>
                            `).join('')}
                        </div>
                    `;
                    
                    // Add play functionality to tracks
                    tracksContainer.querySelectorAll('.track-play-icon').forEach(icon => {
                        icon.addEventListener('click', (e) => {
                            if (window.playTrack) {
                                window.playTrack(
                                    e.target.dataset.trackUrl,
                                    e.target.dataset.trackTitle,
                                    e.target.dataset.artistName,
                                    e.target.dataset.coverUrl,
                                    e.target
                                );
                            }
                        });
                    });
                } else {
                    tracksContainer.innerHTML = '<p class="no-tracks">No tracks available</p>';
                }
                
                // Hide main view and header, show bio
                mainView.style.display = 'none';
                artistsHeader.style.display = 'none';  // Add this line
                bioView.style.display = 'block';
                
                // Add back button handler
                document.querySelector('.back-to-artists').onclick = () => {
                    bioView.style.display = 'none';
                    mainView.style.display = 'grid';
                    artistsHeader.style.display = 'flex';  // Add this line
                };
            }
        } catch (error) {
            console.error('Error loading artist bio:', error);
        }
    }

    function backToArtists() {
        artistDetailView.style.display = 'none';
        artistsMainView.style.display = 'grid';
    }

    // Helper function to format duration
    function formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // Make backToArtists function globally available
    window.backToArtists = backToArtists;

    // Initial load
    loadArtists();
    
    // Delegate click for search results: play track and remove play icon
    document.body.addEventListener('click', function (e) {
        // Adjust selector to match your search result track item
        const searchTrackItem = e.target.closest('.search-track-item');
        if (searchTrackItem) {
            // Play the track using global playTrack if available
            const fileUrl = searchTrackItem.dataset.trackUrl;
            const title = searchTrackItem.dataset.trackTitle;
            const artist = searchTrackItem.dataset.artistName;
            const cover = searchTrackItem.dataset.coverUrl;
            if (window.playTrack && fileUrl) {
                window.playTrack(fileUrl, title, artist, cover, searchTrackItem);
            }
            // Remove the play icon if present inside this item
            const playIcon = searchTrackItem.querySelector('.fa-sharp.fa-solid.fa-circle-play.card-play-icon');
            if (playIcon) {
                playIcon.remove();
            }
        }
    });
});