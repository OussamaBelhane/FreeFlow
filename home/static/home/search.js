document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('.search-bar input');
    const mainContent = document.getElementById('main-content-area');
    let searchTimeout;

    function createSearchResults(tracks, albums) {
        return `
            <div class="search-results">
                ${albums.length > 0 ? `
                    <div class="search-section">
                        <h3>Albums</h3>
                        <div class="search-albums">
                            ${albums.map(album => `
                                <div class="box1 album-link" data-album-id="${album.album_id}">
                                    <img src="${album.cover_image_url || album.image_url_or_default}" alt="${album.title}">
                                    <p>${album.title}</p>
                                    <i class="fa-sharp fa-solid fa-circle-play"
                                        style="color: #1ed760;"
                                        data-track-url="${album.first_track?.file_url || ''}"
                                        data-track-title="${album.first_track?.title || ''}"
                                        data-artist-name="${album.first_track?.artist_name || ''}"
                                        data-cover-url="${album.cover_image_url || album.image_url_or_default || ''}"
                                    ></i>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${tracks.length > 0 ? `
                    <div class="search-section">
                        <h3>Songs</h3>
                        <div class="search-tracks">
                            ${tracks.map(track => `
                                <div class="search-track-item"
                                    data-track-url="${track.file_url}"
                                    data-track-title="${track.title}"
                                    data-artist-name="${track.artist_name}"
                                    data-cover-url="${track.track_img_url || track.image_url_or_default || ''}">
                                    <img src="${track.track_img_url || track.image_url_or_default}" alt="${track.title}">
                                    <div class="track-info">
                                        <p class="track-title">${track.title}</p>
                                        <p class="track-artist">${track.artist_name}</p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${!tracks.length && !albums.length ? `
                    <div class="no-results">
                        <p>No results found</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    async function performSearch(query) {
        try {
            const response = await fetch(`/api/search/?q=${encodeURIComponent(query)}`);
            console.log('Search response:', response);
            const text = await response.text();
            console.log('Search response text:', text);
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('Failed to parse JSON:', e);
                return;
            }

            if (data.success) {
                mainContent.innerHTML = createSearchResults(data.tracks, data.albums);

                // Album click: load album view
                mainContent.querySelectorAll('.album-link').forEach(el => {
                    el.addEventListener('click', function (e) {
                        // Prevent play icon click from triggering album load
                        if (e.target.closest('.fa-circle-play')) return;
                        const albumId = el.getAttribute('data-album-id');
                        if (window.loadAlbum && albumId) window.loadAlbum(albumId);
                    });
                });

                // Track play icon click: play track
                mainContent.querySelectorAll('.search-track-item .fa-circle-play, .album-link .fa-circle-play').forEach(icon => {
                    icon.addEventListener('click', function (e) {
                        e.stopPropagation();
                        if (window.playTrack) {
                            window.playTrack(
                                icon.getAttribute('data-track-url'),
                                icon.getAttribute('data-track-title'),
                                icon.getAttribute('data-artist-name'),
                                icon.getAttribute('data-cover-url'),
                                icon
                            );
                        }
                    });
                });

                mainContent.querySelectorAll('.search-track-item').forEach(item => {
                    item.addEventListener('click', function () {
                        const fileUrl = item.getAttribute('data-track-url');
                        const title = item.getAttribute('data-track-title');
                        const artist = item.getAttribute('data-artist-name');
                        const cover = item.getAttribute('data-cover-url');
                        if (window.playTrack && fileUrl) {
                            window.playTrack(fileUrl, title, artist, cover, item);
                        }
                        // Remove play icon if present (shouldn't be, but for safety)
                        const playIcon = item.querySelector('.fa-sharp.fa-solid.fa-circle-play.card-play-icon');
                        if (playIcon) playIcon.remove();
                    });
                });
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();

            if (query.length >= 2) {
                searchTimeout = setTimeout(() => performSearch(query), 500);
            } else if (query.length === 0) {
                if (window.loadHome) window.loadHome();
            }
        });
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
});
