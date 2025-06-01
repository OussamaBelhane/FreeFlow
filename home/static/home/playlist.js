// Create helper functions first
function createRemoveTrackDialog() {
    document.getElementById('remove-track-dialog')?.remove();

    const dialog = document.createElement('div');
    dialog.id = 'remove-track-dialog';
    dialog.style.cssText = `
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0,0,0,0.7);
        z-index: 9999;
        align-items: center;
        justify-content: center;
    `;
    dialog.innerHTML = `
        <div style="background:#232323; padding:24px; border-radius:12px; min-width:300px; text-align:center; color:#fff;">
            <h3 style="margin:0 0 16px;">Remove Track</h3>
            <p style="margin:0 0 24px;">Are you sure you want to remove this track from the playlist?</p>
            <div style="display:flex; gap:12px; justify-content:center;">
                <button id="remove-track-confirm" style="background:#ff3b30; color:#fff; border:none; padding:8px 24px; border-radius:6px; cursor:pointer;">Remove</button>
                <button id="remove-track-cancel" style="background:#444; color:#fff; border:none; padding:8px 24px; border-radius:6px; cursor:pointer;">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);
    return dialog;
}

// Helper function to get CSRF token
function getCsrfToken() {
    const csrfCookie = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
    return csrfCookie ? csrfCookie.split('=')[1] : null;
}

// Function to show confirmation dialog and handle removal
function confirmTrackRemoval(trackId, playlistId) {
    const dialog = createRemoveTrackDialog();
    dialog.style.display = 'flex';

    const handleRemove = async () => {
        try {
            const csrfToken = getCsrfToken();
            if (!csrfToken) {
                alert('CSRF token not found. Please refresh the page and try again.');
                return;
            }

            const response = await fetch('/api/remove_track_from_playlist/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({
                    track_id: trackId,
                    playlist_id: playlistId
                })
            });

            if (response.status === 403) {
                alert('Access denied. Please log in to modify this playlist.');
                window.location.href = '/login/'; // Redirect to login page
                return;
            }

            const result = await response.json();
            if (result.success) {
                // Reload playlist view to reflect changes
                loadPlaylist(playlistId, false);
            } else {
                alert(result.error || 'Failed to remove track');
            }
        } catch (error) {
            console.error('Error removing track:', error);
            alert('Failed to remove track. Please try again.');
        } finally {
            dialog.remove();
        }
    };

    // Attach event listeners
    dialog.querySelector('#remove-track-confirm').onclick = handleRemove;
    dialog.querySelector('#remove-track-cancel').onclick = () => dialog.remove();
    dialog.onclick = (e) => {
        if (e.target === dialog) dialog.remove();
    };
}

function handleRemoveIconClick(event) {
    const removeIcon = event.target.closest('.bi-dash-circle.remove-track-icon');
    if (!removeIcon) return;

    const trackId = removeIcon.dataset.trackId; // Ensure trackId is retrieved from the dataset
    if (!trackId || trackId === "undefined") { // Check for undefined or missing trackId
        console.error('Invalid trackId:', trackId);
        alert('Failed to remove track: Invalid track ID.');
        return;
    }

    const playlistContainer = document.querySelector('.album-detail-view');
    if (!playlistContainer) {
        console.error('Could not find playlist container');
        return;
    }

    const playlistId = playlistContainer.dataset.playlistId;
    if (!trackId || !playlistId) {
        console.error('Missing track or playlist ID', { trackId, playlistId });
        return;
    }

    confirmTrackRemoval(trackId, playlistId);
}

// Initialize event listeners when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Listen for clicks on remove track icons
    document.addEventListener('click', handleRemoveIconClick);
});

document.addEventListener('DOMContentLoaded', () => {
    // Handle remove playlist icon click
    document.addEventListener('click', (event) => {
        if (event.target.matches('.bi-x-octagon')) {
            const playlistView = event.target.closest('.playlist-view');
            if (!playlistView) return;
            const playlistId = playlistView.dataset.playlistId;
            if (!playlistId) return;
            showRemovePlaylistDialog(playlistId);
        }
    });
});

function showRemovePlaylistDialog(playlistId) {
    document.getElementById('remove-playlist-dialog')?.remove();

    const dialog = document.createElement('div');
    dialog.id = 'remove-playlist-dialog';
    dialog.style.cssText = `
        display: flex;
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0,0,0,0.7);
        z-index: 9999;
        align-items: center;
        justify-content: center;
    `;
    dialog.innerHTML = `
        <div style="background:#232323; padding:24px; border-radius:12px; min-width:300px; text-align:center; color:#fff;">
            <h3 style="margin:0 0 16px;">Delete Playlist</h3>
            <p style="margin:0 0 24px;">Are you sure you want to delete this playlist? This action cannot be undone.</p>
            <div style="display:flex; gap:12px; justify-content:center;">
                <button id="remove-playlist-confirm" style="background:#ff3b30; color:#fff; border:none; padding:8px 24px; border-radius:6px; cursor:pointer;">Delete</button>
                <button id="remove-playlist-cancel" style="background:#444; color:#fff; border:none; padding:8px 24px; border-radius:6px; cursor:pointer;">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);

    // Handle confirm/cancel clicks
    dialog.querySelector('#remove-playlist-confirm').onclick = async () => {
        try {
            const response = await fetch('/api/delete_playlist/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({ playlist_id: playlistId })
            });

            // Check if response is ok before trying to parse JSON
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Try to get the response text first
            const text = await response.text();
            let result;
            try {
                result = JSON.parse(text);
            } catch (e) {
                console.error('Invalid JSON response:', text);
                throw new Error('Server returned invalid JSON');
            }

            if (result.success) {
                dialog.remove();
                window.location.href = '/';
            } else {
                throw new Error(result.error || 'Failed to delete playlist');
            }
        } catch (error) {
            console.error('Error deleting playlist:', error);
            alert(`Failed to delete playlist: ${error.message}`);
        }
    };

    dialog.querySelector('#remove-playlist-cancel').onclick = () => dialog.remove();
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) dialog.remove();
    });
}

// Ensure the Play All button is initialized
document.addEventListener('DOMContentLoaded', () => {
    const playAllBtn = document.querySelector('.action-play-button'); // Select the Play All button
    if (playAllBtn && playlistData.tracks.length > 0) {
        let currentTrackUrl = null;

        // Helper to update the play/pause icon
        function updatePlayAllBtn(paused) {
            if (paused) {
                playAllBtn.classList.remove('fa-circle-pause');
                playAllBtn.classList.add('fa-circle-play');
            } else {
                playAllBtn.classList.remove('fa-circle-play');
                playAllBtn.classList.add('fa-circle-pause');
            }
        }

        // Click handler for Play All
        playAllBtn.addEventListener('click', () => {
            const firstTrack = playlistData.tracks[0];
            const firstTrackIcon = document.querySelector(`.track-item .track-play-icon[data-track-url="${firstTrack.file_url}"]`);

            if (window.audioElement.src.includes(firstTrack.file_url) && !window.audioElement.paused) {
                // Pause if the first track is already playing
                window.audioElement.pause();
                updatePlayAllBtn(true);
            } else {
                // Play the first track
                if (window.playTrack) {
                    window.playTrack(
                        firstTrack.file_url,
                        firstTrack.title,
                        firstTrack.artist_name,
                        firstTrack.image_url,
                        firstTrackIcon
                    );
                    currentTrackUrl = firstTrack.file_url;
                    updatePlayAllBtn(false); // Ensure the icon updates to "pause"
                }
            }
        });

        // Listen to global audio element for pause/play events
        if (window.audioElement) {
            window.audioElement.addEventListener('play', () => {
                if (window.audioElement.src.includes(currentTrackUrl)) {
                    updatePlayAllBtn(false); // Update to "pause" when playback starts
                }
            });
            window.audioElement.addEventListener('pause', () => {
                if (window.audioElement.src.includes(currentTrackUrl)) {
                    updatePlayAllBtn(true); // Update to "play" when playback pauses
                }
            });
            window.audioElement.addEventListener('ended', () => {
                if (window.audioElement.src.includes(currentTrackUrl)) {
                    updatePlayAllBtn(true); // Update to "play" when playback ends
                }
            });
        }
    }
});

// Create helper functions first
function showLoginModal() {
    const loginButton = document.getElementById('login-button-trigger');
    if (loginButton) {
        loginButton.click();
    }
}

// Modify playlist creation logic
document.addEventListener('DOMContentLoaded', () => {
    // Plus icon in sidebar
    const createPlaylistBtn = document.getElementById('create-playlist-btn');
    if (createPlaylistBtn) {
        // Remove any existing event listeners by cloning the node
        const newBtn = createPlaylistBtn.cloneNode(true);
        createPlaylistBtn.parentNode.replaceChild(newBtn, createPlaylistBtn);
        newBtn.addEventListener('click', function handler(e) {
            if (!window.isAuthenticated) {
                showLoginModal();
                return;
            }
            // Prevent double click
            newBtn.disabled = true;
            fetch('/api/create_playlist/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({ name: 'MyPlaylist' })
            })
            .then(resp => resp.json())
            .then(data => {
                if (data.success) {
                    window.location.reload();
                } else {
                    alert(data.error || "Failed to create playlist.");
                }
            })
            .catch(() => {
                // ...existing code...
            })
            .finally(() => {
                newBtn.disabled = false;
            });
        });
    }
    
    // "Create playlist" button in the box
    const createPlaylistMainBtn = document.getElementById('create-playlist-main-btn');
    if (createPlaylistMainBtn) {
        const newMainBtn = createPlaylistMainBtn.cloneNode(true);
        createPlaylistMainBtn.parentNode.replaceChild(newMainBtn, createPlaylistMainBtn);
        newMainBtn.addEventListener('click', function handler(e) {
            if (!window.isAuthenticated) {
                showLoginModal();
                return;
            }
            newMainBtn.disabled = true;
            fetch('/api/create_playlist/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({ name: 'MyPlaylist' })
            })
            .then(resp => resp.json())
            .then(data => {
                if (data.success) {
                    showEmptyPlaylistView();
                } else {
                    alert(data.error || "Failed to create playlist.");
                }
            })
            .catch(() => {
                // ...existing code...
            })
            .finally(() => {
                newMainBtn.disabled = false;
            });
        });
    }
});

// Render playlist tracks table with all info in the first <th> (single column)
function renderPlaylistTracksTable(tracks) {
    if (!Array.isArray(tracks) || tracks.length === 0) {
        return `
            <tr>
                <td style="text-align:center;color:#888;padding:40px 0;">
                    No tracks yet. Add some songs!
                </td>
            </tr>
        `;
    }
    return tracks.map((track, index) => `
        <tr class="track-item">
            <td>
                <div style="display:flex;align-items:center;gap:18px;">
                    <div class="track-index-cell" style="position:relative;min-width:24px;text-align:right;">
                        <span class="track-index">${index + 1}</span>
                        <i class="fa-sharp fa-solid fa-circle-play card-play-icon album-track-play-icon"
                           data-track-url="${track.file_url}"
                           data-track-title="${track.title}"
                           data-artist-name="${track.artist_name}"
                           data-cover-url="${track.image_url || track.cover_url || ''}"
                           style="display:none;position:absolute;left:0;top: -10px;bottom: 100px;transform:translateY(-50%);font-size:1.2rem;cursor:pointer;"></i>
                    </div>
                    <img src="${track.image_url || track.cover_url || '/static/home/assets/logo.png'}" alt="cover" style="width:40px;height:40px;object-fit:cover;border-radius:6px;">
                    <div style="flex:1;">
                        <span class="track-title" style="font-weight:600;">${track.title}</span>
                        <div class="track-artist" style="font-size:0.95em;color:#aaa;">${track.artist_name}</div>
                    </div>
                    <div style="margin-left:auto;display:flex;align-items:center;gap:10px;">
                        <i class="bi bi-dash-circle remove-track-icon"
                           data-track-id="${track.id}"
                           style="font-size:1.3rem;cursor:pointer;color:#ff3b30; margin-left: 450px;"></i>
                    </div>
                </div>
            </td>
        </tr>
    `).join('');
}

// Render the playlist view with the new table (single column)
function renderPlaylistView(playlistData) {
    return `
        <div class="album-detail-view playlist-view" data-playlist-id="${playlistData.playlist_id}">
            <div class="album-detail-header">
                <div class="album-detail-cover" id="playlist-detail-cover" style="width:180px;height:180px;display:flex;align-items:center;justify-content:center;background:hsl(0,0%,16%);border-radius:12px;overflow:hidden;cursor:pointer;">
                    ${playlistData.cover_image_url ? `<img src="${playlistData.cover_image_url}" alt="Cover" style="width:100%;height:100%;object-fit:cover;">` : `<i class="bi bi-music-note-beamed" style="font-size:4rem;color:#fff;"></i>`}
                </div>
                <div class="album-detail-info">
                    <span class="album-type">Playlist</span>
                    <h1 class="album-title" id="playlist-detail-title" style="cursor:pointer;">${playlistData.name}</h1>
                    <div class="album-meta">
                        <span class="album-artist-name">${playlistData.owner_username || 'You'}</span>
                        <span class="meta-dot">•</span>
                        <span class="album-track-count">${playlistData.tracks.length} songs</span>
                    </div>
                </div>
            </div>
            <div class="album-actions">
                <i class="fa-solid fa-circle-play action-play-button"></i>
                <i class="fa-regular fa-square-plus action-icon"></i>
                <i class="bi bi-x-octagon"></i>
                <div class="spacer"></div>
            </div>
            <div class="track-list-container">
                <table class="track-list" style="width:100%;">
                    <thead>
                        <tr class="track-list-header">
                            <th>Track</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${renderPlaylistTracksTable(playlistData.tracks)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// UI for Add Track Modal (improved design)
function showAddTrackModal(playlistId) {
    // Remove any existing search modal before showing add-track-modal
    document.getElementById('search-modal')?.remove();
    document.getElementById('add-track-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'add-track-modal';
    modal.style = `
        position:fixed; top:0; left:0; width:100vw; height:100vh; background:#000a; z-index:3000; display:flex; align-items:center; justify-content:center;
    `;
    modal.innerHTML = `
        <div style="background:#181818; padding:32px 28px 24px 28px; border-radius:16px; min-width:340px; max-width:95vw; color:#fff; position:relative; box-shadow:0 4px 32px #000a;">
            <button id="add-track-modal-close" style="position:absolute;top:12px;right:18px;background:none;border:none;color:#fff;font-size:1.5rem;cursor:pointer;">&times;</button>
            <h2 style="margin-bottom:18px;">Add Track to Playlist</h2>
            <input id="add-track-search-input" type="text" placeholder="Search for a track..." style="width:100%;padding:10px 12px;border-radius:7px;border:none;background:#232323;color:#fff;font-size:1.05rem;margin-bottom:18px;">
            <div id="add-track-search-results" style="max-height:260px;overflow-y:auto;"></div>
        </div>
    `;
    document.body.appendChild(modal);

    // Close modal logic
    modal.querySelector('#add-track-modal-close').onclick = () => {
        modal.remove();
        // Reset modal open flag
        if (typeof addTrackModalOpen !== 'undefined') addTrackModalOpen = false;
    };
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            if (typeof addTrackModalOpen !== 'undefined') addTrackModalOpen = false;
        }
    });

    // Search logic
    const searchInput = modal.querySelector('#add-track-search-input');
    const resultsDiv = modal.querySelector('#add-track-search-results');
    searchInput.addEventListener('input', async () => {
        const query = searchInput.value.trim();
        if (query.length < 2) {
            resultsDiv.innerHTML = '<div style="color:#888;padding:16px 0;">Type at least 2 characters to search.</div>';
            return;
        }
        resultsDiv.innerHTML = '<div style="color:#888;padding:16px 0;">Searching...</div>';
        try {
            const resp = await fetch(`/api/search_tracks/?query=${encodeURIComponent(query)}`);
            if (!resp.ok) {
                resultsDiv.innerHTML = '<div style="color:#888;padding:16px 0;">An error occurred.</div>';
                return;
            }
            const data = await resp.json();
            const tracks = data.tracks || [];
            if (!Array.isArray(tracks) || tracks.length === 0) {
                resultsDiv.innerHTML = '<div style="color:#888;padding:16px 0;">No tracks found.</div>';
                return;
            }
            resultsDiv.innerHTML = tracks.map(track => `
                <div class="add-track-result" style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #232323;">
                    <img src="${track.image_url || track.cover_url || '/static/home/assets/logo.png'}" alt="cover" style="width:38px;height:38px;object-fit:cover;border-radius:6px;">
                    <div style="flex:1;">
                        <div style="font-weight:600;">${track.title}</div>
                        <div style="font-size:0.97em;color:#aaa;">${track.artist || track.artist_name || ''}</div>
                    </div>
                    <button class="add-track-btn" data-track-id="${track.id}" style="background:#1ed760;color:#222;border:none;border-radius:6px;padding:6px 18px;font-weight:600;cursor:pointer;">Add</button>
                </div>
            `).join('');
            // Add click listeners for add buttons
            resultsDiv.querySelectorAll('.add-track-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    e.stopPropagation();
                    const trackId = btn.dataset.trackId;
                    btn.disabled = true;
                    btn.textContent = 'Adding...';
                    try {
                        const addResp = await fetch('/api/add_track_to_playlist/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': getCsrfToken()
                            },
                            body: JSON.stringify({ playlist_id: playlistId, track_id: trackId })
                        });
                        const addResult = await addResp.json();
                        if (addResult.success) {
                            modal.remove();
                            loadPlaylist(playlistId, false);
                        } else {
                            btn.textContent = 'Add';
                            btn.disabled = false;
                            alert(addResult.error || 'Failed to add track.');
                        }
                    } catch {
                        btn.textContent = 'Add';
                        btn.disabled = false;
                        alert('An error occurred while adding the track.');
                    }
                };
            });
        } catch {
            resultsDiv.innerHTML = '<div style="color:#888;padding:16px 0;">An error occurred.</div>';
        }
    });
}

// Attach event listener to the "add track" icon in playlist actions
document.addEventListener('DOMContentLoaded', () => {
    // Only attach one global handler for add track modal
    let addTrackModalOpen = false;
    document.body.addEventListener('click', (event) => {
        const addTrackIcon = event.target.closest('.fa-square-plus.action-icon');
        if (addTrackIcon) {
            if (addTrackModalOpen) return; // Prevent multiple modals
            addTrackModalOpen = true;
            // Remove any existing search modal before showing add-track-modal
            document.getElementById('search-modal')?.remove();
            const playlistId = addTrackIcon.closest('.album-detail-view')?.dataset.playlistId;
            if (playlistId) {
                showAddTrackModal(playlistId);
            }
        }
    });

    // Listen for modal close to reset flag
    document.body.addEventListener('click', (event) => {
        if (event.target.id === 'add-track-modal' || event.target.id === 'add-track-modal-close') {
            addTrackModalOpen = false;
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('mouseover', function(e) {
        const trackItem = e.target.closest('.track-item');
        if (trackItem) {
            const index = trackItem.querySelector('.track-index');
            const playIcon = trackItem.querySelector('.album-track-play-icon');
            if (index && playIcon) {
                index.style.display = 'none';
                playIcon.style.display = 'block';
                
                // Check if track is currently playing to show pause icon
                if (window.audioElement && window.audioElement.src === playIcon.dataset.trackUrl && !window.audioElement.paused) {
                    playIcon.classList.remove('fa-circle-play');
                    playIcon.classList.add('fa-circle-pause');
                }
            }
        }
    });

    document.addEventListener('mouseout', function(e) {
        const trackItem = e.target.closest('.track-item');
        if (trackItem) {
            const index = trackItem.querySelector('.track-index');
            const playIcon = trackItem.querySelector('.album-track-play-icon');
            if (index && playIcon && !playIcon.classList.contains('playing')) {
                index.style.display = 'block';
                playIcon.style.display = 'none';
            }
        }
    });

    document.addEventListener('click', function(e) {
        const playIcon = e.target.closest('.album-track-play-icon');
        if (playIcon) {
            const isPlaying = playIcon.classList.contains('fa-circle-pause');
            
            // Reset all other play icons
            document.querySelectorAll('.album-track-play-icon').forEach(icon => {
                icon.classList.remove('fa-circle-pause', 'playing');
                icon.classList.add('fa-circle-play');
            });

            if (isPlaying) {
                window.audioElement?.pause();
                playIcon.classList.remove('fa-circle-pause', 'playing');
                playIcon.classList.add('fa-circle-play');
            } else {
                if (window.playTrack) {
                    window.playTrack(
                        playIcon.dataset.trackUrl,
                        playIcon.dataset.trackTitle,
                        playIcon.dataset.artistName,
                        playIcon.dataset.coverUrl,
                        playIcon
                    );
                    playIcon.classList.remove('fa-circle-play');
                    playIcon.classList.add('fa-circle-pause', 'playing');
                }
            }
        }
    });

    // Handle audio element state changes
    if (window.audioElement) {
        window.audioElement.addEventListener('play', () => {
            const currentUrl = window.audioElement.src;
            document.querySelectorAll('.album-track-play-icon').forEach(icon => {
                if (icon.dataset.trackUrl === currentUrl) {
                    icon.classList.remove('fa-circle-play');
                    icon.classList.add('fa-circle-pause', 'playing');
                }
            });
        });

        window.audioElement.addEventListener('pause', () => {
            document.querySelectorAll('.album-track-play-icon.playing').forEach(icon => {
                icon.classList.remove('fa-circle-pause', 'playing');
                icon.classList.add('fa-circle-play');
            });
        });
    }
});