// Get references to the player controls and audio element
const playButton = document.getElementById('play-button');
const progressBar = document.getElementById('progress-bar');
const currentTimeElement = document.getElementById('current-time');
const totalTimeElement = document.getElementById('total-time');
const previousButton = document.getElementById('previous-button');
const nextButton = document.getElementById('next-button');
const cardPlayIcons = document.querySelectorAll('.card-play-icon'); // Select all card play icons

let currentTrackUrl = ''; // Track the currently playing track URL
let audioElement = new Audio(); // Create a new audio element dynamically

// Tracklist for player navigation
let trackList = [];
let currentTrackIndex = -1;

// Helper to update trackList and currentTrackIndex based on visible play icons
function updateTrackListAndIndex(currentUrl) {
    trackList = Array.from(document.querySelectorAll('.card-play-icon'))
        .filter(icon => icon.dataset.trackUrl)
        .map(icon => ({
            url: icon.dataset.trackUrl,
            title: icon.dataset.trackTitle,
            artist: icon.dataset.artistName,
            cover: icon.dataset.coverUrl,
            icon: icon
        }));
    currentTrackIndex = trackList.findIndex(t => t.url === currentUrl);
}

// Function to format time in MM:SS
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60) || 0;
    const secs = Math.floor(seconds % 60) || 0;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

// Function to play a track (update trackList and index)
function playTrack(trackUrl, trackTitle, artistName, coverUrl, cardIcon = null, saveToStorage = true) {
    if (currentTrackUrl !== trackUrl) {
        currentTrackUrl = trackUrl;
        audioElement.src = trackUrl;
        audioElement.play().catch(err => console.error('Error playing track:', err));

        // Update UI
        playButton.classList.remove('fa-circle-play', 'bi-play-circle-fill', 'bi-play-circle');
        playButton.classList.add('fa-circle-pause', 'bi-pause-circle-fill');
        document.querySelector('.firstword').textContent = trackTitle;
        document.querySelector('.secondword').textContent = artistName;
        document.querySelector('.album img').src = coverUrl;

        // Save last played track
        if (saveToStorage) {
            const data = JSON.stringify({ trackUrl, trackTitle, artistName, coverUrl });
            localStorage.setItem('lastPlayedTrack', data);
            sessionStorage.setItem('lastPlayedTrack', data);
        }

        // Update all card icons to play state except the current one
        cardPlayIcons.forEach(icon => icon.classList.remove('fa-circle-pause'));
        if (cardIcon) {
            cardIcon.classList.add('fa-circle-pause');
        }
    } else {
        if (audioElement.paused) {
            audioElement.play().catch(err => console.error('Error resuming track:', err));
            playButton.classList.remove('fa-circle-play', 'bi-play-circle-fill', 'bi-play-circle');
            playButton.classList.add('fa-circle-pause', 'bi-pause-circle-fill');
            if (cardIcon) {
                cardIcon.classList.add('fa-circle-pause');
            }
        } else {
            audioElement.pause();
            playButton.classList.remove('fa-circle-pause', 'bi-pause-circle-fill', 'bi-pause-circle');
            playButton.classList.add('fa-circle-play', 'bi-play-circle-fill');
            if (cardIcon) {
                cardIcon.classList.remove('fa-circle-pause');
            }
        }
    }
    updateTrackListAndIndex(trackUrl);
}

// Add event listeners to card play icons
cardPlayIcons.forEach(icon => {
    icon.addEventListener('click', () => {
        const trackUrl = icon.dataset.trackUrl;
        const trackTitle = icon.dataset.trackTitle;
        const artistName = icon.dataset.artistName;
        const coverUrl = icon.dataset.coverUrl;

        if (!trackUrl) {
            console.error('Track URL is missing for this icon:', icon);
            return;
        }

        playTrack(trackUrl, trackTitle, artistName, coverUrl, icon);
    });
});

// Update progress bar and time
audioElement.addEventListener('timeupdate', () => {
    const currentTime = audioElement.currentTime;
    const duration = audioElement.duration;

    // Update progress bar
    if (duration && !progressBar.dragging) {
        const progressPercentage = (currentTime / duration) * 100;
        progressBar.value = progressPercentage;
        // Visually fill the progress bar (for browsers that support accent-color)
        progressBar.style.background = `linear-gradient(to right, #1ed760 0%, #1ed760 ${progressPercentage}%, #444 ${progressPercentage}%, #444 100%)`;
    }

    // Update current time and total time
    currentTimeElement.textContent = formatTime(currentTime);
    totalTimeElement.textContent = formatTime(duration);
});

// Improved seek functionality with drag feedback
let isDragging = false;

progressBar.addEventListener('mousedown', () => {
    isDragging = true;
    progressBar.dragging = true;
});
progressBar.addEventListener('touchstart', () => {
    isDragging = true;
    progressBar.dragging = true;
});

progressBar.addEventListener('input', () => {
    if (audioElement.duration) {
        const seekTime = (progressBar.value / 100) * audioElement.duration;
        if (isDragging) {
            // Show preview time while dragging
            currentTimeElement.textContent = formatTime(seekTime);
        } else {
            audioElement.currentTime = seekTime;
        }
        // Update bar fill on drag
        progressBar.style.background = `linear-gradient(to right, #1ed760 0%, #1ed760 ${progressBar.value}%, #444 ${progressBar.value}%, #444 100%)`;
    }
});

progressBar.addEventListener('mouseup', () => {
    if (audioElement.duration) {
        const seekTime = (progressBar.value / 100) * audioElement.duration;
        audioElement.currentTime = seekTime;
    }
    isDragging = false;
    progressBar.dragging = false;
});
progressBar.addEventListener('touchend', () => {
    if (audioElement.duration) {
        const seekTime = (progressBar.value / 100) * audioElement.duration;
        audioElement.currentTime = seekTime;
    }
    isDragging = false;
    progressBar.dragging = false;
});

// Play/Pause functionality for the main player button (FontAwesome or Bootstrap icon)
if (playButton) {
    playButton.addEventListener('click', () => {
        if (audioElement.paused) {
            audioElement.play().catch(err => console.error('Error playing track:', err));
            playButton.classList.remove('fa-circle-play', 'bi-play-circle-fill', 'bi-play-circle');
            playButton.classList.add('fa-circle-pause', 'bi-pause-circle-fill');
        } else {
            audioElement.pause();
            playButton.classList.remove('fa-circle-pause', 'bi-pause-circle-fill', 'bi-pause-circle');
            playButton.classList.add('fa-circle-play', 'bi-play-circle-fill');
        }
    });

    // Sync icon on audio end and handle next/loop/shuffle
    audioElement.addEventListener('ended', () => {
        // Album detail view repeat button support
        const albumRepeatBtn = document.querySelector('.album-detail-view .bi-repeat, .album-detail-view .fa-repeat');
        const repeatBtn = document.getElementById('repeat-button');
        const shuffleBtn = document.getElementById('shuffle-button');
        // Prefer album repeat if visible, else fallback to main
        const repeatActive = (albumRepeatBtn && albumRepeatBtn.classList.contains('active')) ||
                            (repeatBtn && repeatBtn.classList.contains('active'));
        const shuffleActive = shuffleBtn && shuffleBtn.classList.contains('active');

        if (repeatActive) {
            // Repeat current track
            audioElement.currentTime = 0;
            audioElement.play();
        } else {
            // Play next (shuffle if active)
            playNextTrack(shuffleActive);
        }
    });
}

// Next/Previous/Shuffle/Repeat logic
function playNextTrack(shuffle = false) {
    updateTrackListAndIndex(currentTrackUrl);
    if (trackList.length === 0) return;
    let nextIndex;
    if (shuffle) {
        // Pick a random track, but not the current one if more than 1
        do {
            nextIndex = Math.floor(Math.random() * trackList.length);
        } while (trackList.length > 1 && nextIndex === currentTrackIndex);
    } else {
        nextIndex = (currentTrackIndex + 1) % trackList.length;
    }
    const nextTrack = trackList[nextIndex];
    playTrack(nextTrack.url, nextTrack.title, nextTrack.artist, nextTrack.cover, nextTrack.icon);
}

function playPrevTrack() {
    updateTrackListAndIndex(currentTrackUrl);
    if (trackList.length === 0) return;
    let prevIndex = (currentTrackIndex - 1 + trackList.length) % trackList.length;
    const prevTrack = trackList[prevIndex];
    playTrack(prevTrack.url, prevTrack.title, prevTrack.artist, prevTrack.cover, prevTrack.icon);
}

// Previous and Next button functionality
if (previousButton) {
    previousButton.addEventListener('click', () => {
        playPrevTrack();
    });
}

if (nextButton) {
    nextButton.addEventListener('click', () => {
        const shuffleBtn = document.getElementById('shuffle-button');
        const shuffleActive = shuffleBtn && shuffleBtn.classList.contains('active');
        playNextTrack(shuffleActive);
    });
}

// --- Right Sidebar Toggle ---
const toggleButton = document.getElementById('toggle-right-sidebar');
const rightSidebar = document.querySelector('.sidebar-right');

if (toggleButton && rightSidebar) {
    toggleButton.addEventListener('click', () => {
        rightSidebar.classList.toggle('hidden');
    });

    // Optional: Initially hide the sidebar by adding the class
    // rightSidebar.classList.add('hidden');
} else {
    console.error("Could not find toggle button or right sidebar element.");
}

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

    // Toggle green on shuffle and repeat buttons
    const shuffleBtn = document.getElementById('shuffle-button');
    const repeatBtn = document.getElementById('repeat-button');
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => {
            shuffleBtn.classList.toggle('active');
        });
    }
    if (repeatBtn) {
        repeatBtn.addEventListener('click', () => {
            repeatBtn.classList.toggle('active');
        });
    }

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

});

audioElement.addEventListener('play', function() {
    // Call with the current track title
    if (window.setListeningTo) window.setListeningTo(document.querySelector('.firstword')?.textContent || '');
});
audioElement.addEventListener('pause', function() {
    if (window.clearListeningTo) window.clearListeningTo();
});
audioElement.addEventListener('ended', function() {
    if (window.clearListeningTo) window.clearListeningTo();
});

// Volume control
const volumeBar = document.getElementById('volume-bar');
const volumeButton = document.getElementById('volume-button');
let lastVolumeValue = 100; // Default to max volume

// Load saved volume from localStorage on page load
if (volumeBar && audioElement) {
    let savedVolume = localStorage.getItem('playerVolume');
    if (savedVolume !== null) {
        savedVolume = parseInt(savedVolume, 10);
        if (!isNaN(savedVolume)) {
            volumeBar.value = savedVolume;
            audioElement.volume = savedVolume / 100;
            lastVolumeValue = savedVolume;
        }
    } else {
        volumeBar.value = 100;
        audioElement.volume = 1;
    }
    // Set initial bg
    const val = volumeBar.value;
    volumeBar.style.background = `linear-gradient(to right, #fff 0%, #fff ${val}%, #444 ${val}%, #444 100%)`;
    // Set initial icon
    if (volumeButton) {
        if (val == 0) {
            volumeButton.classList.remove('bi-volume-up');
            volumeButton.classList.add('bi-volume-mute');
        } else {
            volumeButton.classList.remove('bi-volume-mute');
            volumeButton.classList.add('bi-volume-up');
        }
    }
    volumeBar.addEventListener('input', () => {
        const val = volumeBar.value;
        audioElement.volume = val / 100;
        volumeBar.style.background = `linear-gradient(to right, #fff 0%, #fff ${val}%, #444 ${val}%, #444 100%)`;
        // Save to localStorage
        localStorage.setItem('playerVolume', val);
        // Change icon based on volume
        if (volumeButton) {
            if (val == 0) {
                volumeButton.classList.remove('bi-volume-up');
                volumeButton.classList.add('bi-volume-mute');
            } else {
                volumeButton.classList.remove('bi-volume-mute');
                volumeButton.classList.add('bi-volume-up');
            }
        }
        // If not muted, update lastVolumeValue
        if (val > 0) {
            lastVolumeValue = val;
            localStorage.setItem('lastVolumeValue', val);
        }
    });
    // On hover, show green like main progress bar
    volumeBar.addEventListener('mouseenter', () => {
        const val = volumeBar.value;
        volumeBar.style.background = `linear-gradient(to right, rgb(30,215,96) 0%, rgb(30,215,96) ${val}%, #444 ${val}%, #444 100%)`;
    });
    volumeBar.addEventListener('mouseleave', () => {
        const val = volumeBar.value;
        volumeBar.style.background = `linear-gradient(to right, #fff 0%, #fff ${val}%, #444 ${val}%, #444 100%)`;
    });
}

if (volumeButton && volumeBar && audioElement) {
    let muted = false;
    volumeButton.addEventListener('click', () => {
        if (!muted && volumeBar.value > 0) {
            // Save last value and mute
            lastVolumeValue = volumeBar.value;
            localStorage.setItem('lastVolumeValue', lastVolumeValue);
            volumeBar.value = 0;
            audioElement.volume = 0;
            volumeBar.style.background = `linear-gradient(to right, #fff 0%, #fff 0%, #444 0%, #444 100%)`;
            volumeButton.classList.remove('bi-volume-up');
            volumeButton.classList.add('bi-volume-mute');
            localStorage.setItem('playerVolume', 0);
            muted = true;
        } else {
            // Restore last value
            let restoreValue = localStorage.getItem('lastVolumeValue');
            if (restoreValue === null) restoreValue = 100;
            restoreValue = parseInt(restoreValue, 10);
            if (isNaN(restoreValue)) restoreValue = 100;
            volumeBar.value = restoreValue;
            audioElement.volume = restoreValue / 100;
            volumeBar.style.background = `linear-gradient(to right, #fff 0%, #fff ${restoreValue}%, #444 ${restoreValue}%, #444 100%)`;
            volumeButton.classList.remove('bi-volume-mute');
            volumeButton.classList.add('bi-volume-up');
            localStorage.setItem('playerVolume', restoreValue);
            muted = false;
        }
    });
}

if (fullscreenButton) {
    fullscreenButton.addEventListener('click', () => {
        // Implement fullscreen logic here
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    });
}

// --- AJAX Navigation for Albums ---

const mainContentArea = document.getElementById('main-content-area');
let initialHomeHTML = ''; // To store the initial state of the home page

// Function to render the album detail view HTML (Updated for new design)
function renderAlbumView(albumData) {
    // For now, using placeholder or assuming it might come from data later
    let tracksHTML = albumData.tracks.map((track, index) => `
        <tr class="track-item">
            <td class="track-index-cell">
                <span class="track-index">${index + 1}</span>
                <i class="fa-sharp fa-solid fa-circle-play card-play-icon album-track-play-icon "
                   data-track-url="${track.file_url}"
                   data-track-title="${track.title}"
                   data-artist-name="${track.artist_name}"
                   data-cover-url="${track.image_url}" style="top: -10px;bottom: 100px"></i>
            </td>
            <td class="track-title-artist-album">
                <span class="track-title">${track.title}</span>
                <span class="track-artist">${track.artist_name}</span>
            </td>
        </tr>
    `).join('');

    const year = new Date().getFullYear(); // Placeholder
    const trackCount = albumData.tracks.length;

    return `
        <div class="album-detail-view">
            <div class="album-detail-header">
                <img src="${albumData.cover_image_url}" alt="${albumData.title}" class="album-detail-cover">
                <div class="album-detail-info">
                    <span class="album-type">Album</span>
                    <h1 class="album-title">${albumData.title}</h1>
                    <div class="album-meta">
                        <span class="album-artist-name">${albumData.artist_name}</span>
                        <span class="meta-dot">•</span>
                        <span class="album-year">${year}</span>
                        <span class="meta-dot">•</span>
                        <span class="album-track-count">${trackCount} songs</span>
                    </div>
                </div>
            </div>

            <div class="album-actions">
                 <i class="fa-solid fa-circle-play action-play-button"></i>
                 <i class="fa-regular fa-square-plus action-icon"></i>
                 <div class="spacer"></div>
            </div>

            <div class="track-list-container">
                <table class="track-list">
                    <thead>
                        <tr class="track-list-header">
                            <th class="header-title">TRACK</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tracksHTML}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Function to load album details via AJAX
async function loadAlbum(albumId, pushState = true) {
    // Clear existing content immediately for better UX
    mainContentArea.innerHTML = '<div class="loading-spinner"></div>'; // Optional: Add a loading indicator
    try {
        // Use the correct API endpoint
        const response = await fetch(`/api/album/${albumId}/`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const albumData = await response.json();
        mainContentArea.innerHTML = renderAlbumView(albumData);

        if (pushState) {
            // Push state to browser history
            history.pushState({ type: 'album', id: albumId }, albumData.title, `/album/${albumId}/`);
        }
        // Re-attach listeners for the new play icons within the album view
        attachPlayIconListeners(mainContentArea);

        // Add listener for the main album play button
        const albumPlayButton = mainContentArea.querySelector('.action-play-button');
        if (albumPlayButton && albumData.tracks.length > 0) {
            albumPlayButton.addEventListener('click', () => {
                const firstTrack = albumData.tracks[0];
                // Find the corresponding icon in the list to update its state visually
                const firstTrackIcon = mainContentArea.querySelector(`.track-item .track-play-icon[data-track-url="${firstTrack.file_url}"]`);
                playTrack(firstTrack.file_url, firstTrack.title, firstTrack.artist_name, firstTrackIcon);
            });
        }

        // Attach repeat button logic for album-detail-view
        attachAlbumRepeatButton(mainContentArea);

    } catch (error) {
        console.error('Error loading album:', error);
        mainContentArea.innerHTML = '<p>Error loading album details.</p>'; // Show error message
    }
}


// Function to load and display a specific playlist
async function loadPlaylist(playlistId, pushState = true) {
    if (!mainContentArea) return;
    console.log(`Loading playlist ${playlistId}`); // Debug log
    try {
        const response = await fetch(`/api/playlist/${playlistId}/`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const playlistData = await response.json();

        // Render the playlist view
        mainContentArea.innerHTML = renderPlaylistView(playlistData);

        // --- Add click handlers for playlist title and cover to open edit modal ---
        const playlistTitle = mainContentArea.querySelector('#playlist-detail-title');
        const playlistCover = mainContentArea.querySelector('#playlist-detail-cover');
        if (playlistTitle && playlistCover) {
            const openEditModal = () => {
                renderPlaylistEditModal(
                    playlistData.name,
                    playlistData.cover_image_url,
                    async (newName, newCoverUrl) => {
                        try {
                            const resp = await fetch('/api/update_playlist/', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-CSRFToken': getCsrfToken()
                                },
                                body: JSON.stringify({
                                    playlist_id: playlistId,
                                    name: newName,
                                    cover_image_url: newCoverUrl
                                })
                            });
                            const result = await resp.json();
                            if (result.success) {
                                loadPlaylist(playlistId, false);
                            } else {
                                alert(result.error || 'Failed to update playlist.');
                            }
                        } catch (e) {
                            
                        }
                    }
                );
            };
            playlistTitle.addEventListener('click', openEditModal);
            playlistCover.addEventListener('click', openEditModal);
        }
        // --- End click handlers for edit modal ---

        // Attach listeners to the new play icons within the playlist view
        attachPlayIconListeners(mainContentArea);

        // Add event listener for remove track icon
       // ...existing code...

// ...existing code...

        // --- Play all tracks button logic ---
        const playAllBtn = mainContentArea.querySelector('.action-play-button');
        if (playAllBtn && playlistData.tracks.length > 0) {
            playAllBtn.addEventListener('click', () => {
                // Find the first track's play icon in the playlist view
                const firstTrack = playlistData.tracks[0];
                const firstTrackIcon = mainContentArea.querySelector(`.track-item .track-play-icon[data-track-url="${firstTrack.file_url}"]`);
                playTrack(
                    firstTrack.file_url,
                    firstTrack.title,
                    firstTrack.artist_name,
                    firstTrack.image_url,
                    firstTrackIcon
                );
            });
        }
        // --- End Play all tracks logic ---

        // Update browser history
        if (pushState) {
            history.pushState({ view: 'playlist', id: playlistId }, `Playlist: ${playlistData.name}`, `/playlist/${playlistId}/`);
        }
         // Update active sidebar item (optional)
        // activateSidebarLink(`/playlist/${playlistId}/`); // Need a function to handle this

    } catch (error) {
        console.error('Error loading playlist:', error);
        mainContentArea.innerHTML = `<p class="error-message">Could not load playlist. Please try again later.</p>`;
    }
}

// Function to load the initial home page content
function loadHome(pushState = true) {
    mainContentArea.innerHTML = initialHomeHTML;
    if (pushState) {
        // Push state for the home page
        history.pushState({ type: 'home' }, 'Home', '/');
    }
    // Re-attach listeners for album links and play icons on the home page
    attachAlbumLinkListeners(mainContentArea);
    attachPlayIconListeners(mainContentArea);
}

// Function to attach listeners to play icons (used after content updates)
function attachPlayIconListeners(parentElement) {
    parentElement.querySelectorAll('.card-play-icon').forEach(icon => {
        // Remove existing listener to prevent duplicates if re-attaching
        icon.replaceWith(icon.cloneNode(true));
    });
    // Re-query and attach new listeners
    parentElement.querySelectorAll('.card-play-icon').forEach(icon => {
        icon.addEventListener('click', handlePlayIconClick);
    });
    updateTrackListAndIndex(currentTrackUrl);
}

// Handler for play icon clicks (extracted for reusability)
function handlePlayIconClick(event) {
    const icon = event.currentTarget;
    const trackUrl = icon.dataset.trackUrl;
    const trackTitle = icon.dataset.trackTitle;
    const artistName = icon.dataset.artistName;
    const coverUrl = icon.dataset.coverUrl;

    // Check if the clicked icon is already playing this track
    const isCurrentlyPlayingIcon = icon.classList.contains('fa-circle-pause');

    // Reset all icons first
    document.querySelectorAll('.card-play-icon').forEach(i => {
        i.classList.remove('fa-circle-pause');
        i.classList.add('fa-circle-play');
    });

    // If it wasn't the playing icon OR if the track is different, start playing
    if (!isCurrentlyPlayingIcon || currentTrackUrl !== trackUrl) {
        playTrack(trackUrl, trackTitle, artistName, coverUrl, icon); // Pass the icon itself
        icon.classList.remove('fa-circle-play');
        icon.classList.add('fa-circle-pause');
    } else { // If it *was* the playing icon for the *same* track, just pause it
        playTrack(trackUrl, trackTitle, artistName, coverUrl, icon); // Call playTrack to handle pause
        // playTrack function handles the icon state change on pause
    }
}


// Function to attach listeners to album links (used after content updates)
function attachAlbumLinkListeners(parentElement) {
     parentElement.querySelectorAll('.album-link').forEach(link => {
        // Remove existing listener to prevent duplicates if re-attaching
        link.replaceWith(link.cloneNode(true));
    });
    // Re-query and attach new listeners
    parentElement.querySelectorAll('.album-link').forEach(link => {
        link.addEventListener('click', (event) => {
            // Prevent clicking the play icon inside the link from triggering album load
            if (event.target.closest('.card-play-icon')) {
                return;
            }
            event.preventDefault(); // Prevent default link behavior
            const albumId = link.dataset.albumId;
            if (albumId) {
                loadAlbum(albumId);
            }
        });
    });
}

// Handle browser back/forward navigation
window.addEventListener('popstate', (event) => {
    if (event.state) {
        if (event.state.type === 'album') {
            // Load album without pushing state again
            loadAlbum(event.state.id, false);
        } else if (event.state.view === 'playlist') { // Check for playlist view state
            // Load playlist without pushing state again
            loadPlaylist(event.state.id, false);
        } else if (event.state.view === 'home' || !event.state.view) { // Handle home or undefined state
            // Load home without pushing state again
            loadHome(false);
        }
    } else {
        // Fallback for initial state or unexpected scenarios
        loadHome(false);
    }
});

// Initial setup on page load
document.addEventListener('DOMContentLoaded', () => {
    // Read initial album ID from the JSON script tag
    const initialAlbumIdData = document.getElementById('initial-album-id');
    const initialAlbumId = initialAlbumIdData ? JSON.parse(initialAlbumIdData.textContent) : null;
    
    // Check for initial playlist ID
    const initialPlaylistIdData = document.getElementById('initial-playlist-id');
    const initialPlaylistId = initialPlaylistIdData ? JSON.parse(initialPlaylistIdData.textContent) : null;

    if (mainContentArea) {
        initialHomeHTML = mainContentArea.innerHTML; // Store initial content
        
        // Load initial playlist if present
        if (initialPlaylistId !== null) {
            loadPlaylist(initialPlaylistId, false);
            history.replaceState({ type: 'playlist', id: initialPlaylistId }, `Playlist ${initialPlaylistId}`, `/playlist/${initialPlaylistId}/`);
        }

        if (initialAlbumId !== null) {
            // If an initial album ID is provided by the server (meaning we loaded /album/<id>/ directly),
            // load that album's content immediately. Don't push state initially.
            loadAlbum(initialAlbumId, false);
            // Replace the history state so back button goes to home ('/') eventually
            // Use document.title or fetch title if needed for better history entry
            history.replaceState({ type: 'album', id: initialAlbumId }, `Album ${initialAlbumId}`, `/album/${initialAlbumId}/`);
        } else {
             // Otherwise, we are on the home page ('/')
             // Set initial state for the home page (replace current history entry)
             history.replaceState({ type: 'home' }, 'Home', '/');
             // Attach initial listeners for home page elements
             attachAlbumLinkListeners(mainContentArea);
             attachPlayIconListeners(mainContentArea); // Attach to initial play icons too
        }

    } else {
        console.error('Main content area not found!');
    }

    // --- Existing DOMContentLoaded logic ---
    // (Keep the existing player setup logic here if it was inside DOMContentLoaded)
    // Example:
    // const playButton = document.querySelector('.fa-play');
    // const progressBar = document.querySelector('.progress-bar input');
    // ... rest of the existing player setup ...
    // --- End of Existing DOMContentLoaded logic ---

    // Toggle green on shuffle and repeat buttons
    const shuffleBtn = document.getElementById('shuffle-button');
    const repeatBtn = document.getElementById('repeat-button');
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => {
            shuffleBtn.classList.toggle('active');
        });
    }
    if (repeatBtn) {
        repeatBtn.addEventListener('click', () => {
            repeatBtn.classList.toggle('active');
        });
    }

    // Modal logic for login
    const loginButtonTrigger = document.getElementById('login-button-trigger');
    const loginModal = document.getElementById('login-modal');
    const closeModalButton = document.getElementById('close-modal-button');

    if (loginButtonTrigger && loginModal && closeModalButton) {
        loginButtonTrigger.addEventListener('click', () => {
            loginModal.style.display = 'flex';
            setTimeout(() => loginModal.classList.remove('hidden'), 10);
            showEmailStep();
        });

        closeModalButton.addEventListener('click', () => {
            loginModal.classList.add('hidden');
            loginModal.addEventListener('transitionend', () => {
                loginModal.style.display = 'none';
            }, { once: true });
        });

        loginModal.addEventListener('click', (event) => {
            if (event.target === loginModal) {
                closeModalButton.click();
            }
        });
    }

});

// Add this after rendering album view and attaching play icon listeners
function attachAlbumRepeatButton(mainContentArea) {
    const repeatBtn = mainContentArea.querySelector('.album-detail-view .bi-repeat, .album-detail-view .fa-repeat');
    if (repeatBtn) {
        repeatBtn.addEventListener('click', () => {
            repeatBtn.classList.toggle('active');
        });
    }
}

// Utility: Shuffle array
function shuffleArray(arr) {
    let array = arr.slice();
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// --- Recommended for today randomization ---
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...

    // Randomize "Recommended for today" section every 24h
    const RECOMMENDED_KEY = 'recommended_today_tracks';
    const RECOMMENDED_TIME_KEY = 'recommended_today_time';

    function updateRecommendedToday() {
        const container = document.getElementById('recommended-today-container');
        if (!container) return;

        const allCards = Array.from(container.querySelectorAll('.card.recommended-track'));
        if (allCards.length <= 7) return;

        let lastTime = localStorage.getItem(RECOMMENDED_TIME_KEY);
        let savedIndexes = localStorage.getItem(RECOMMENDED_KEY);
        let now = Date.now();
        let indexes = [];

        if (lastTime && savedIndexes && now - parseInt(lastTime, 10) < 24 * 60 * 60 * 1000) {
            try {
                indexes = JSON.parse(savedIndexes);
            } catch {
                indexes = [];
            }
        } else {
            indexes = shuffleArray([...Array(allCards.length).keys()]).slice(0, 7);
            localStorage.setItem(RECOMMENDED_KEY, JSON.stringify(indexes));
            localStorage.setItem(RECOMMENDED_TIME_KEY, now.toString());
        }

        allCards.forEach((card, idx) => {
            card.style.display = indexes.includes(idx) ? '' : 'none';
        });
    }

    updateRecommendedToday();

    window.addEventListener('focus', updateRecommendedToday);

    // ...existing code...
});

// ...existing code...

document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...

    // Modal logic for login/signup
    const loginButtonTrigger = document.getElementById('login-button-trigger');
    const loginModal = document.getElementById('login-modal');
    const closeModalButton = document.getElementById('close-modal-button');
    const modalContent = document.getElementById('modal-content');
    const modalDynamicContent = document.getElementById('modal-dynamic-content');

    function showEmailStep() {
        // Show close button
        document.getElementById('close-modal-button').style.display = '';
        modalDynamicContent.innerHTML = `
            <h2>Continue with Email</h2>
            <div class="modal-subtitle">
                You can sign in if you already have an account, or we'll help you create one.
            </div>
            <input type="email" class="modal-input" id="modal-email-input" placeholder="Email" autocomplete="email">
            <button class="modal-continue-button" id="modal-email-continue">Continue</button>
        `;
        document.getElementById('modal-email-continue').onclick = handleEmailContinue;
        document.getElementById('modal-email-input').onkeydown = function(e) {
            if (e.key === 'Enter') handleEmailContinue();
        };
    }

    // Update handleEmailContinue() to validate email format before sending AJAX request
    async function handleEmailContinue() {
        const emailInput = document.getElementById('modal-email-input');
        const email = emailInput.value.trim();
        // Validate email format
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            emailInput.classList.add('input-error'); // Optionally add error style via CSS
            emailInput.focus();
            return;
        }
        // ...existing AJAX call to /api/check_email/...
        try {
            const resp = await fetch('/api/check_email/', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({email})
            });
            const data = await resp.json();
            if (data.exists) {
                showPasswordStep(email);
            } else {
                showSignupStep(email);
            }
        } catch (e) {
           
        }
    }

    function showPasswordStep(email) {
        document.getElementById('close-modal-button').style.display = '';
        modalDynamicContent.innerHTML = `
            <h2>Enter Your Password</h2>
            <div class="modal-subtitle">
                You have an account associated with this email.
            </div>
            <form class="modal-password-form" autocomplete="off" onsubmit="return false;">
                <div class="modal-password-box">
                    <input type="email" value="${email}" disabled>
                    <div class="modal-password-row">
                        <input type="password" class="modal-password-input" id="modal-password-input" placeholder="Password" autocomplete="current-password">
                        <button class="modal-password-arrow" id="modal-password-arrow" tabindex="0" aria-label="Continue">
                            <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </form>
            <div id="modal-error-container"></div>
        `;
        document.getElementById('modal-password-arrow').onclick = handlePasswordSubmit;
        document.getElementById('modal-password-input').onkeydown = function(e) {
            if (e.key === 'Enter') handlePasswordSubmit();
        };
    }

    async function handlePasswordSubmit() {
        const email = document.querySelector('.modal-password-box input[type="email"]').value;
        const passwordInput = document.getElementById('modal-password-input');
        const password = passwordInput.value;
        const errorDiv = document.getElementById('modal-error-container');
        // AJAX login
        fetch('/api/login/', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email, password })
        })
        .then(resp => resp.json())
        .then(data => {
            if (data.success) {
                // Instead of manually updating the UI, reload the page so the HTML updates
                window.location.reload();
            } else {
                passwordInput.classList.add('modal-password-error');
                if (errorDiv) {
                    errorDiv.innerHTML = `<div class="modal-error-message">${data.error || "Login failed"}</div>`;
                }
                passwordInput.focus();
                passwordInput.select();
            }
        })
        .catch(err => {
            if (errorDiv) {
                errorDiv.innerHTML = `<div class="modal-error-message">Network error. Try again.</div>`;
            }
        });
    }

    function showPasswordError(msg) {
        let errorDiv = document.getElementById('modal-error-container');
        if (errorDiv) {
            errorDiv.innerHTML = `<div class="modal-error-message">${msg}</div>`;
        }
    }

    function showSignupStep(email) {
        // Hide close button, show back arrow
        document.getElementById('close-modal-button').style.display = 'none';
        modalDynamicContent.innerHTML = `
            <button class="modal-back-arrow" id="modal-back-arrow" aria-label="Back">
                <i class="fa-solid fa-arrow-left"></i>
            </button>
            <h2>Create Your Account</h2>
            <div class="modal-subtitle">
                No account found for <b>${email}</b>. Please choose a username and password.
            </div>
            <form class="modal-password-form" autocomplete="off" onsubmit="return false;">
                <div class="modal-password-box">
                    <input type="email" value="${email}" disabled>
                    <input type="text" class="modal-password-input" id="modal-signup-username" placeholder="Username" autocomplete="username">
                    <input type="password" class="modal-password-input" id="modal-signup-password" placeholder="Password" autocomplete="new-password">
                </div>
                <button class="modal-continue-button" id="modal-signup-continue">Sign Up</button>
            </form>
            <div id="modal-error-container"></div>
        `;
        document.getElementById('modal-signup-continue').onclick = handleSignupSubmit;
        document.getElementById('modal-signup-username').onkeydown = function(e) {
            if (e.key === 'Enter') document.getElementById('modal-signup-password').focus();
        };
        document.getElementById('modal-signup-password').onkeydown = function(e) {
            if (e.key === 'Enter') handleSignupSubmit();
        };
        document.getElementById('modal-back-arrow').onclick = () => {
            showEmailStep();
            document.getElementById('close-modal-button').style.display = '';
        };
    }

    function handleSignupSubmit() {
        const email = document.querySelector('.modal-password-box input[type="email"]').value;
        const username = document.getElementById('modal-signup-username').value.trim();
        const password = document.getElementById('modal-signup-password').value;
        const errorDiv = document.getElementById('modal-error-container');
        if (!username || !password) {
            if (errorDiv) {
                errorDiv.innerHTML = `<div class="modal-error-message">Missing fields. Please fill in all required fields.</div>`;
            }
            return;
        }
        fetch('/api/signup/', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email, username, password })
        })
        .then(resp => resp.json())
        .then(data => {
            if (data.success) {
                loginModal.classList.add('hidden');
                loginModal.addEventListener('transitionend', () => {
                    loginModal.style.display = 'none';
                    updateAuthUI(true, data.is_superuser);
                }, { once: true });
                window.location.reload();
            } else {
                if (errorDiv) {
                    errorDiv.innerHTML = `<div class="modal-error-message">${data.error || "Signup failed"}</div>`;
                }
            }
        })
        .catch(err => {
            if (errorDiv) {
                errorDiv.innerHTML = `<div class="modal-error-message">Network error. Try again.</div>`;
            }
        });
    }

    // Update UI after login/signup
    function updateAuthUI(isAuthenticated, isSuperuser) {
        const authSection = document.getElementById('auth-section');
        const topBarOptions = document.querySelector('.top-bar-options');
        // Remove login button
        if (authSection) authSection.style.display = 'none';
        // Show user icon if not present
        if (!document.querySelector('.fa-regular.fa-user.nav-item')) {
            const userIcon = document.createElement('i');
            userIcon.className = 'fa-regular fa-user nav-item';
            userIcon.style.backgroundColor = 'maroon';
            topBarOptions.insertBefore(userIcon, topBarOptions.firstChild.nextSibling);
        }
        // Show dashboard if superuser
        let dashboardBtn = document.getElementById('dashboard-button');
        if (isSuperuser && !dashboardBtn) {
            dashboardBtn = document.createElement('a');
            dashboardBtn.href = '/dashboard/';
            dashboardBtn.className = 'badge dark-badge';
            dashboardBtn.id = 'dashboard-button';
            dashboardBtn.textContent = 'Dashboard';
            topBarOptions.appendChild(dashboardBtn);
        }
        if (!isSuperuser && dashboardBtn) {
            dashboardBtn.remove();
        }
    }

    if (loginButtonTrigger && loginModal && closeModalButton) {
        loginButtonTrigger.addEventListener('click', () => {
            loginModal.style.display = 'flex';
            setTimeout(() => loginModal.classList.remove('hidden'), 10);
            showEmailStep();
        });

        closeModalButton.addEventListener('click', () => {
            loginModal.classList.add('hidden');
            loginModal.addEventListener('transitionend', () => {
                loginModal.style.display = 'none';
            }, { once: true });
        });

        loginModal.addEventListener('click', (event) => {
            if (event.target === loginModal) {
                closeModalButton.click();
            }
        });
    }

    // User profile dropdown logic
    const userProfileTrigger = document.getElementById('user-profile-trigger');
    const userProfileDropdown = document.getElementById('user-profile-dropdown');
    const userIdCopy = document.getElementById('user-id-copy');
    const userIdValue = document.getElementById('user-id-value');
    const toastMessage = document.getElementById('toast-message');
    const logoutBtn = document.getElementById('logout-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const iconUrlInput = document.getElementById('icon-url-input');
    const iconPreview = document.getElementById('icon-preview');
    const saveIconBtn = document.getElementById('save-icon-btn');
    const usernameInput = document.getElementById('username-input');
    const saveUsernameBtn = document.getElementById('save-username-btn');
    const friendsList = document.getElementById('friends-list');
    const manageFriendsBtn = document.getElementById('manage-friends-btn');
    const blocklist = document.getElementById('blocklist');
    const manageBlocklistBtn = document.getElementById('manage-blocklist-btn');

    // Show/hide dropdown
    if (userProfileTrigger && userProfileDropdown) {
        userProfileTrigger.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent document click from immediately closing it
            // Toggle the dropdown visibility
            if (userProfileDropdown.style.display === 'block') {
                userProfileDropdown.style.display = 'none';
            } else {
                userProfileDropdown.style.display = 'block';
            }
        });
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userProfileDropdown.contains(e.target) && e.target !== userProfileTrigger) {
                userProfileDropdown.style.display = 'none';
            }
        });
    }
    
    // Copy user id and show toast
    if (userIdCopy && userIdValue && toastMessage) {
        userIdCopy.addEventListener('click', () => {
            const id = userIdValue.textContent;
            navigator.clipboard.writeText(id).then(() => {
                // toastMessage.textContent = "User ID copied!";
                // toastMessage.style.display = 'block';
                // setTimeout(() => { toastMessage.style.display = 'none'; }, 1800);
            });
        });
    }
    // Logout button (clear cookies and reload)
    // if (logoutBtn) {
    //     logoutBtn.addEventListener('click', () => {
    //         document.cookie.split(";").forEach(function(c) {
    //             document.cookie = c.replace(/^ +/, "")
    //                 .replace(/=.*/, "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/");
    //         });
    //         window.location.reload();
    //     });
    // }
    // Listening to on/off (no backend, just UI)
    const listeningOnBtn = document.getElementById('listening-on-btn');
    const listeningOffBtn = document.getElementById('listening-off-btn');
    const listeningToValue = document.getElementById('listening-to-value');
    if (listeningOnBtn && listeningOffBtn && listeningToValue) {
        listeningOnBtn.addEventListener('click', () => {
            listeningToValue.textContent = "Now Listening";
            listeningOnBtn.style.background = "#1ed760";
            listeningOffBtn.style.background = "#444";
        });
        listeningOffBtn.addEventListener('click', () => {
            listeningToValue.textContent = "Nothing";
            listeningOffBtn.style.background = "#1ed760";
            listeningOnBtn.style.background = "#444";
        });
    }

    // --- Settings Modal Logic ---
    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', () => {
            // Toggle modal display
            if (settingsModal.style.display === 'flex') {
                settingsModal.style.display = 'none';
            } else {
                settingsModal.style.display = 'flex';
                settingsModal.style.alignItems = 'center';
                settingsModal.style.justifyContent = 'center';
            }
            if (userProfileDropdown) userProfileDropdown.style.display = 'none';
            console.log('Settings button clicked, modal display:', settingsModal.style.display);
        });
        // Close modal when clicking outside the settings container
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.style.display = 'none';
            }
        });
        // Close modal when pressing Escape
        document.addEventListener('keydown', (e) => {
            if (settingsModal.style.display === 'flex' && e.key === 'Escape') {
                settingsModal.style.display = 'none';
            }
        });
        // Add a close button inside your settings modal (top-right X)
        const closeSettingsBtn = document.getElementById('close-settings-btn');
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => {
                settingsModal.style.display = 'none';
            });
        }

        // --- Friends/Blocking Section Switching ---
        const sidebarFriends = document.getElementById('sidebar-friends');
        const sidebarBlocking = document.getElementById('sidebar-blocking');
        const pendingSection = document.getElementById('pending-requests-section');
        const friendsSection = document.getElementById('friends-list-section');
        const blockedSection = document.getElementById('blocked-users-section');

        function activateSidebar(link) {
            document.querySelectorAll('.settings-sidebar .sidebar-link').forEach(el => el.classList.remove('active'));
            link.classList.add('active');
        }

        if (sidebarFriends && sidebarBlocking && pendingSection && friendsSection && blockedSection) {
            sidebarFriends.addEventListener('click', () => {
                activateSidebar(sidebarFriends);
                pendingSection.style.display = '';
                friendsSection.style.display = '';
                blockedSection.style.display = 'none';
            });
            sidebarBlocking.addEventListener('click', () => {
                activateSidebar(sidebarBlocking);
                pendingSection.style.display = 'none';
                friendsSection.style.display = 'none';
                blockedSection.style.display = '';
            });
            // Default: show friends, hide blocking
            pendingSection.style.display = '';
            friendsSection.style.display = '';
            blockedSection.style.display = 'none';
        }
    }

    // ...existing code...
    // Show profile icon in nav if set
    const navUserIcon = document.getElementById('user-profile-trigger');
    if (navUserIcon) {
        // Remove: localStorage usage for icon
        // Optionally, you could fetch the icon from the backend and set it here if needed
    }
    // Show profile icon in nav if set (from backend, not localStorage)
    if (userProfileTrigger) {
        // The backend should render a data-icon-url attribute if the user has an icon_url set
        const iconUrl = userProfileTrigger.getAttribute('data-icon-url');
        if (iconUrl) {
            userProfileTrigger.style.backgroundImage = `url('${iconUrl}')`;
            userProfileTrigger.style.backgroundSize = 'cover';
            userProfileTrigger.style.backgroundPosition = 'center';
            userProfileTrigger.style.color = 'transparent';
        }
    }
    // ...existing code...
});

// ...existing code...

document.addEventListener('DOMContentLoaded', () => {
    // --- Settings Modal Logic ---
    const settingsModal = document.getElementById('settings-modal');
    const settingsBtn = document.getElementById('settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings-btn');

    // Sidebar links and sections
    const sidebarLinks = {
        profile: document.getElementById('sidebar-profile'),
        privacy: document.getElementById('sidebar-privacy'), // Assuming this exists or will be added
        friends: document.getElementById('sidebar-friends'),
        blocking: document.getElementById('sidebar-blocking'),
    };
    const settingsSections = {
        profile: document.getElementById('profile-section'),
        // privacy: document.getElementById('privacy-section'), // Add if exists
        pending: document.getElementById('pending-requests-section'),
        friends: document.getElementById('friends-list-section'),
        blocking: document.getElementById('blocked-users-section'),
    };

    // Profile Editing Elements
    const profileImageDisplay = document.getElementById('profile-image-display');
    const profileImageEditOverlay = document.getElementById('profile-image-edit-overlay');
    const profileImageUrlInputGroup = document.getElementById('profile-image-url-input-group');
    const profileImageUrlInput = document.getElementById('profile-image-url');
    const profileImagePreviewBtn = document.getElementById('profile-image-preview-btn');
    const profileImageSaveBtn = document.getElementById('profile-image-save-btn');
    const profileImageCancelBtn = document.getElementById('profile-image-cancel-btn');
    const profileImageUrlPreview = document.getElementById('profile-image-url-preview');
    const userProfileTriggerIcon = document.getElementById('user-profile-trigger'); // Header icon

    // Username Editing Elements
    const usernameDisplayGroup = document.getElementById('username-display-group');
    const usernameDisplay = document.getElementById('username-display');
    const usernameEditBtn = document.getElementById('username-edit-btn');
    const usernameEditGroup = document.getElementById('username-edit-group');
    const usernameInput = document.getElementById('username-input');
    const usernameSaveBtn = document.getElementById('username-save-btn');
    const usernameCancelBtn = document.getElementById('username-cancel-btn');

    // --- Event Listeners ---

    // Open Settings Modal
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            if (settingsModal) settingsModal.style.display = 'flex';
            // Default to Friends view or last active view (optional)
        });
    }

    // Close Settings Modal
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            if (settingsModal) settingsModal.style.display = 'none';
            // Reset any temporary states like input fields being visible
            cancelProfileImageEdit();
            cancelUsernameEdit();
        });
    }
    // Close modal if clicking outside the content
    if (settingsModal) {
        settingsModal.addEventListener('click', (event) => {
            if (event.target === settingsModal) {
                settingsModal.style.display = 'none';
                cancelProfileImageEdit();
                cancelUsernameEdit();
            }
        });
    }


    // Settings Sidebar Navigation
    Object.entries(sidebarLinks).forEach(([key, link]) => {
        if (link) {
            link.addEventListener('click', () => switchSettingsSection(key));
        }
    });

    // --- Profile Image Editing ---
    const showProfileImageInput = () => {
        if (profileImageUrlInputGroup) profileImageUrlInputGroup.style.display = 'flex';
        if (profileImageUrlInput) profileImageUrlInput.focus();
    };

    const hideProfileImageInput = () => {
        if (profileImageUrlInputGroup) profileImageUrlInputGroup.style.display = 'none';
        if (profileImageUrlPreview) profileImageUrlPreview.style.display = 'none'; // Hide preview too
        if (profileImageUrlInput) profileImageUrlInput.value = ''; // Clear input
    };

    const cancelProfileImageEdit = () => {
        hideProfileImageInput();
    };

    if (profileImageDisplay) {
        profileImageDisplay.addEventListener('click', showProfileImageInput);
    }
    if (profileImageEditOverlay) {
        profileImageEditOverlay.addEventListener('click', showProfileImageInput);
    }

    if (profileImagePreviewBtn) {
        profileImagePreviewBtn.addEventListener('click', () => {
            const url = profileImageUrlInput.value.trim();
            if (url && profileImageUrlPreview) {
                profileImageUrlPreview.src = url;
                profileImageUrlPreview.style.display = 'block';
                profileImageUrlPreview.onerror = () => {
                    // Handle invalid image URL if needed (e.g., show placeholder)
                    profileImageUrlPreview.style.display = 'none';
                    // console.log("Invalid image URL or cannot load image.");
                };
            } else if (profileImageUrlPreview) {
                 profileImageUrlPreview.style.display = 'none';
            }
        });
    }

    if (profileImageSaveBtn) {
        profileImageSaveBtn.addEventListener('click', () => {
            const newUrl = profileImageUrlInput.value.trim();
            if (newUrl) {
                fetch('/api/update_icon/', {  // Corrected endpoint
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCsrfToken()
                    },
                    body: JSON.stringify({ icon_url: newUrl })  // Updated key to match backend
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        profileImageDisplay.src = newUrl;
                        if (userProfileTriggerIcon) {
                            userProfileTriggerIcon.style.backgroundImage = `url('${newUrl}')`;
                            userProfileTriggerIcon.style.backgroundSize = 'cover';
                            userProfileTriggerIcon.style.backgroundPosition = 'center';
                        }
                        hideProfileImageInput();
                        // console.log("Profile image updated!");
                    } else {
                        // console.log(data.error || "Failed to update image.");
                    }
                })
                .catch(error => {
                    console.error("Error updating profile image:", error);
                    // console.log("An error occurred.");
                });
            } else {
                // console.log("Please enter a valid URL.");
            }
        });
    }

    if (profileImageCancelBtn) {
        profileImageCancelBtn.addEventListener('click', cancelProfileImageEdit);
    }

    // --- Username Editing ---
    const showUsernameInput = () => {
        if (usernameDisplayGroup) usernameDisplayGroup.style.display = 'none';
        if (usernameEditGroup) usernameEditGroup.style.display = 'flex'; // Use flex for input-group
        if (usernameInput) {
            usernameInput.value = usernameDisplay.textContent.trim(); // Pre-fill with current username
            usernameInput.focus();
            usernameInput.select();
        }
    };

    const hideUsernameInput = () => {
        if (usernameEditGroup) usernameEditGroup.style.display = 'none';
        if (usernameDisplayGroup) usernameDisplayGroup.style.display = 'flex';
    };

// --- Playlist Navigation ---
    function attachPlaylistLinkListeners(parentElement) {
        const playlistLinks = parentElement.querySelectorAll('.sidebar-playlist-item');
        playlistLinks.forEach(link => {
            link.addEventListener('click', (event) => {
                event.preventDefault(); // Prevent default link behavior
                const playlistId = link.dataset.playlistId;
                if (playlistId) {
                    loadPlaylist(playlistId); // Load the playlist view
                } else {
                    console.error("Playlist ID missing from clicked item:", link);
                }
            });
        });
    }
    // Attach listeners initially on load
    attachPlaylistLinkListeners(document.querySelector('.sidebar-left .library'));

    // Re-attach listeners if sidebar content changes (e.g., after adding a playlist)
    // We need a function to add a playlist to the sidebar and call attachPlaylistLinkListeners again
    // Example placeholder:
    function addPlaylistToSidebar(id, name, coverUrl) {
        const libraryBox = document.querySelector('.sidebar-left .lib-box');
        if (!libraryBox) return;

        // Remove "Create your first playlist" box if it exists
        const createBox = libraryBox.querySelector('.box');
        if (createBox) createBox.remove();

        const coverHTML = coverUrl
            ? `<img src="${coverUrl}" style="width:100%; height:100%; object-fit:cover;">`
            : `<i class="bi bi-music-note-beamed" style="font-size:1.5rem; color:#bbb;"></i>`;

        const newPlaylistItemHTML = `
            <div class="sidebar-playlist-item" style="padding:10px 0; display:flex; align-items:center; gap:10px; cursor:pointer;"
                 data-playlist-id="${id}" data-playlist-name="${name}" data-playlist-cover="${coverUrl || ''}">
                <div style="width:36px; height:36px; background:#232323; border-radius:8px; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                    ${coverHTML}
                </div>
                <span style="font-size:1rem; color:#fff;">${name}</span>
            </div>
        `;
        libraryBox.insertAdjacentHTML('beforeend', newPlaylistItemHTML);

        // Re-attach listeners to include the new item
        attachPlaylistLinkListeners(libraryBox);
    }
    // --- End Playlist Navigation ---
    const cancelUsernameEdit = () => {
        hideUsernameInput();
    };

    if (usernameEditBtn) {
        usernameEditBtn.addEventListener('click', showUsernameInput);
    }

    if (usernameSaveBtn) {
        usernameSaveBtn.addEventListener('click', () => {
            const newUsername = usernameInput.value.trim();
            const currentUsername = usernameDisplay.textContent.trim();
            if (newUsername && newUsername !== currentUsername) {
                fetch('/api/update_username/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCsrfToken()
                    },
                    body: JSON.stringify({ username: newUsername })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        usernameDisplay.textContent = newUsername;
                        hideUsernameInput();
                        // console.log("Username updated successfully!");
                    } else {
                        // console.log(data.error || "Failed to update username");
                    }
                })
                .catch(error => {
                    console.error("Error updating username:", error);
                    // console.log("An error occurred while updating username");
                });
            } else if (!newUsername) {
                // console.log("Username cannot be empty.");
            }
        });
    }

    if (usernameCancelBtn) {
        usernameCancelBtn.addEventListener('click', cancelUsernameEdit);
    }


    // --- Helper Functions ---
    function switchSettingsSection(targetKey) {
        console.log("Switching to section:", targetKey);
        // Deactivate all links and hide all sections first
        Object.values(sidebarLinks).forEach(link => link?.classList.remove('active'));
        Object.values(settingsSections).forEach(section => {
            if (section) section.style.display = 'none';
        });

        // Activate the target link
        if (sidebarLinks[targetKey]) {
            sidebarLinks[targetKey].classList.add('active');
        } else {
             console.warn(`Sidebar link for key "${targetKey}" not found.`);
        }

        // Show the corresponding section(s)
        // Note: 'friends' key shows both pending and friends list
        if (targetKey === 'friends') {
            if (settingsSections.pending) settingsSections.pending.style.display = 'block';
            if (settingsSections.friends) settingsSections.friends.style.display = 'block';
        } else if (settingsSections[targetKey]) {
            settingsSections[targetKey].style.display = 'block';
        } else {
             console.warn(`Settings section for key "${targetKey}" not found.`);
        }

        // Reset edit states when switching sections
        cancelProfileImageEdit();
        cancelUsernameEdit();
    }

    // Simple Toast Notification (reuse if exists, or basic implementation)
    const toastElement = document.getElementById('toast-message');
    let toastTimeout;
    // function showToast(message) {
    //     if (!toastElement) {
    //         console.log("Toast:", message); // Fallback to console
    //         return;
    //     }
    //     toastElement.textContent = message;
    //     toastElement.style.display = 'block';
    //     clearTimeout(toastTimeout);
    //     toastTimeout = setTimeout(() => {
    //         toastElement.style.display = 'none';
    //     }, 3000); // Hide after 3 seconds
    // }

    // Function to get CSRF token (needed for Django POST requests)
    function getCsrfToken() {
        const csrfCookie = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
        return csrfCookie ? csrfCookie.split('=')[1] : null;
    }

    // Initialize the view (e.g., default to friends or profile)
    // Check if the modal should be open initially based on some condition (e.g., URL hash)
    // For now, it opens via the settings button click.

}); // End DOMContentLoaded

// --- Any other existing script.js code below ---

// ...existing code...

document.addEventListener('DOMContentLoaded', () => {
    // Update initial section visibility
    const profileSection = document.getElementById('profile-section');
    const friendsSection = document.getElementById('friends-list-section');
    const pendingSection = document.getElementById('pending-requests-section');
    if (profileSection) profileSection.style.display = 'block';
    if (friendsSection) friendsSection.style.display = 'none';
    if (pendingSection) pendingSection.style.display = 'none';

    // Activate profile link by default
    document.querySelectorAll('.settings-sidebar .sidebar-link').forEach(el => el.classList.remove('active'));
    document.getElementById('sidebar-profile')?.classList.add('active');

    // Update preview image logic
    if (profileImagePreviewBtn) {
        profileImagePreviewBtn.addEventListener('click', () => {
            const url = profileImageUrlInput.value.trim();
            if (url && profileImageUrlInput) {
                profileImageUrlInput.src = url;
                profileImageUrlInput.style.display = 'block';
                profileImageUrlInput.onerror = () => {
                    profileImageUrlInput.style.display = 'none';
                    // console.log("Invalid image URL or cannot load image.");
                };
            }
        });
    }

    // Username editing logic
    if (usernameSaveBtn) {
        usernameSaveBtn.addEventListener('click', () => {
            const newUsername = usernameInput.value.trim();
            if (newUsername) {
                fetch('/api/update-username/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCsrfToken()
                    },
                    body: JSON.stringify({ username: newUsername })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        usernameDisplay.textContent = newUsername;
                        hideUsernameInput();
                        // console.log("Username updated successfully!");
                    } else {
                        // console.log(data.error || "Failed to update username");
                    }
                })
                .catch(error => {
                    console.error("Error updating username:", error);
                    // console.log("An error occurred while updating username");
                });
            }
        });
    }
    // ...existing code...
});

// ...existing code...

document.addEventListener('DOMContentLoaded', () => {
    // Profile image editing elements
    const profileImagePreviewBtn = document.getElementById('profile-image-preview-btn');
    const profileImageUrlInput = document.getElementById('profile-image-url');
    const profileImagePreview = document.getElementById('profile-image-preview');
    
    // Preview button click handler
    if (profileImagePreviewBtn && profileImageUrlInput && profileImagePreview) {
        profileImagePreviewBtn.addEventListener('click', () => {
            const url = profileImageUrlInput.value.trim();
            if (url) {
                profileImagePreview.src = url;
                profileImagePreview.style.display = 'block';
                profileImagePreview.onerror = () => {
                    profileImagePreview.style.display = 'none';
                    // console.log("Invalid image URL or cannot load image.");
                };
            }
        });
    }

    // ...existing code...
});

// Remove or comment out any duplicate preview button logic outside DOMContentLoaded
// ...existing code...

// --- Playlist Creation UI ---
function renderEmptyPlaylistView() {
    return `
        <div class="album-detail-view">
            <div class="album-detail-header">
                <div class="album-detail-cover" style="width:180px;height:180px;display:flex;align-items:center;justify-content:center;background:hsl(0,0%,16%);border-radius:12px;">
                    <i class="bi bi-music-note-beamed" style="font-size:4rem;color:#fff;"></i>
                </div>
                <div class="album-detail-info">
                    <span class="album-type">Playlist</span>
                    <h1 class="album-title">MyPlaylist</h1>
                    <div class="album-meta">
                        <span class="album-artist-name">You</span>
                        <span class="meta-dot">•</span>
                        <span class="album-year">${new Date().getFullYear()}</span>
                        <span class="meta-dot">•</span>
                        <span class="album-track-count">0 songs</span>
                    </div>
                </div>
            </div>
            <div class="album-actions">
                <i class="fa-solid fa-circle-play action-play-button"></i>
                <i class="fa-regular fa-square-plus action-icon"></i>
                <i class="fa-solid fa-ellipsis action-icon"></i>
                <div class="spacer"></div>
            </div>
            <div class="track-list-container">
                <table class="track-list">
                    <thead>
                        <tr class="track-list-header">
                            <th class="header-title">TRACK</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td colspan="3" style="text-align:center;color:#888;padding:40px 0;">No tracks yet. Add some songs to your playlist!</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function showEmptyPlaylistView(pushState = true) {
    const mainContentArea = document.getElementById('main-content-area');
    if (mainContentArea) {
        mainContentArea.innerHTML = renderEmptyPlaylistView();
        if (pushState) {
            history.pushState({ type: 'playlist', id: null }, 'MyPlaylist', '/myplaylist/');
        }
    }
}

// Attach event listeners for playlist creation
document.addEventListener('DOMContentLoaded', () => {
    // Plus icon in sidebar
    const createPlaylistBtn = document.getElementById('create-playlist-btn');
    if (createPlaylistBtn) {
        createPlaylistBtn.addEventListener('click', () => {
            
            // AJAX to create playlist
            fetch('/api/create_playlist/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': (function() {
                        const csrfCookie = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
                        return csrfCookie ? csrfCookie.split('=')[1] : '';
                    })()
                },
                body: JSON.stringify({ name: 'MyPlaylist' })
            })
            .then(resp => resp.json())
            .then(data => {
                if (data.success) {
                    //reload page home
                    window.location.reload();
                } else {
                    alert(data.error || "Failed to create playlist.");
                }
            })
            .catch(() => {
                
            });
        });
    }
    // "Create playlist" button in the box
    const createPlaylistMainBtn = document.getElementById('create-playlist-main-btn');
    if (createPlaylistMainBtn) {
        createPlaylistMainBtn.addEventListener('click', () => {
            // Same AJAX as above
            fetch('/api/create_playlist/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': (function() {
                        const csrfCookie = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
                        return csrfCookie ? csrfCookie.split('=')[1] : '';
                    })()
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
                
            });
        });
    }
    // ...existing code...
});

// Handle browser navigation for playlist view
window.addEventListener('popstate', (event) => {
    if (event.state) {
        if (event.state.type === 'playlist') {
            showEmptyPlaylistView(false);
        }
        // ...existing code...
    }
    // ...existing code...
});

// ...existing code...

// ...existing code...

document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...

    // Home navigation via nav-arrow (top bar)
    const navArrow = document.querySelector('.nav-arrow');
    if (navArrow) {
        navArrow.addEventListener('click', (e) => {
            e.preventDefault();
            loadHome();
        });
    }

    // Home navigation via sidebar Home nav-option
    document.querySelectorAll('.nav-option').forEach(option => {
        const link = option.querySelector('a');
        if (link && link.textContent.trim().toLowerCase() === 'home') {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                loadHome();
            });
            link.addEventListener('click', (e) => {
                e.preventDefault();
                loadHome();
            });
        }
    });

    // ...existing code...
});

// --- Playlist Edit Modal ---
function renderPlaylistEditModal(currentName, currentCover, onSave) {
    // Remove any existing modal
    document.getElementById('playlist-edit-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'playlist-edit-modal';
    modal.style = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0,0,0,0.7); z-index: 9999; display: flex; align-items: center; justify-content: center;
    `;
    modal.innerHTML = `
        <div style="background: #232323; color: #fff; border-radius: 16px; padding: 32px 32px 24px 32px; min-width: 340px; max-width: 95vw; position: relative; box-shadow: 0 4px 32px #000a;">
            <button id="playlist-edit-close" style="position:absolute;top:12px;right:18px;background:none;border:none;color:#fff;font-size:1.5rem;cursor:pointer;">&times;</button>
            <h2 style="margin-bottom:18px;">Edit details</h2>
            <div style="display:flex;gap:18px;align-items:flex-start;">
                <div style="flex-shrink:0;">
                    <div id="playlist-edit-cover-preview" style="width:96px;height:96px;background:#181818;border-radius:10px;display:flex;align-items:center;justify-content:center;overflow:hidden; cursor: pointer;" title="Click to change cover">
                        ${
                            currentCover
                            ? `<img src="${currentCover}" alt="Cover" style="width:100%;height:100%;object-fit:cover;">`
                            : `<i class="bi bi-music-note-beamed" style="font-size:2.5rem;color:#bbb;"></i>`
                        }
                    </div>
                    <input type="url" id="playlist-edit-cover-hidden" value="${currentCover || ''}" style="display:none;"> <!-- Stores the final URL -->
                    <div id="playlist-edit-cover-input-group" style="display:none; margin-top: 8px; align-items: center;">
                         <input type="url" id="playlist-edit-cover-url-input" placeholder="Image URL" style="padding: 4px 8px; border-radius: 4px; border: 1px solid #555; background: #333; color: #fff; font-size: 0.9rem; width: 150px; flex-grow: 1;">
                         <button id="playlist-edit-cover-url-save" title="Set URL" style="margin-left: 5px; background: #1ed760; color: #222; border: none; border-radius: 4px; padding: 4px 8px; font-size: 0.9rem; cursor: pointer;">Set</button>
                         <button id="playlist-edit-cover-url-cancel" title="Cancel" style="margin-left: 5px; background: #555; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; font-size: 0.9rem; cursor: pointer;">&times;</button>
                    </div>
                    <button id="playlist-edit-cover-btn" style="margin-top:8px;font-size:0.95rem;background:#333;color:#fff;border:none;border-radius:6px;padding:4px 12px;cursor:pointer;">Change cover</button>
                </div>
                <div style="flex:1;">
                    <label style="font-size:0.95rem;color:#aaa;">Name</label>
                    <input type="text" id="playlist-edit-name" value="${currentName.replace(/"/g, '&quot;')}" style="width:100%;margin-bottom:18px;padding:8px 12px;border-radius:7px;border:none;background:#181818;color:#fff;font-size:1.1rem;">
                </div>
            </div>
            <button id="playlist-edit-save" style="margin-top:18px;background:#1ed760;color:#222;border:none;border-radius:8px;padding:10px 32px;font-size:1.1rem;font-weight:600;cursor:pointer;float:right;">Save</button>
        </div>
    `;
    document.body.appendChild(modal);

    // Modal close
    modal.querySelector('#playlist-edit-close').onclick = () => modal.remove();

    // --- Cover Edit Logic ---
    const coverBtn = modal.querySelector('#playlist-edit-cover-btn');
    const coverInputGroup = modal.querySelector('#playlist-edit-cover-input-group');
    const coverUrlInput = modal.querySelector('#playlist-edit-cover-url-input');
    const coverUrlSaveBtn = modal.querySelector('#playlist-edit-cover-url-save');
    const coverUrlCancelBtn = modal.querySelector('#playlist-edit-cover-url-cancel');
    const coverPreview = modal.querySelector('#playlist-edit-cover-preview');
    const hiddenCoverInput = modal.querySelector('#playlist-edit-cover-hidden'); // Renamed hidden input

    const showCoverInput = () => {
        coverInputGroup.style.display = 'flex';
        coverUrlInput.value = hiddenCoverInput.value; // Pre-fill with current value
        coverUrlInput.focus();
        coverBtn.style.display = 'none'; // Hide the "Change cover" button
    };

    // Show input field when "Change cover" button is clicked
    coverBtn.onclick = showCoverInput;
    // Also allow clicking the preview image to trigger edit
    coverPreview.onclick = showCoverInput;

    // Cancel button for the URL input
    coverUrlCancelBtn.onclick = () => {
        coverInputGroup.style.display = 'none';
        coverBtn.style.display = ''; // Show the "Change cover" button again
    };

    // Save button for the URL input (updates preview and hidden input)
    coverUrlSaveBtn.onclick = () => {
        const url = coverUrlInput.value.trim();
        if (url) {
            // Update preview
            coverPreview.innerHTML = `<img src="${url}" alt="Cover" style="width:100%;height:100%;object-fit:cover;">`;
            // Update hidden input for final save
            hiddenCoverInput.value = url;
        } else {
            // Revert to default preview if URL is cleared
            coverPreview.innerHTML = `<i class="bi bi-music-note-beamed" style="font-size:2.5rem;color:#bbb;"></i>`;
            hiddenCoverInput.value = '';
        }
        // Hide input group and show button again
        coverInputGroup.style.display = 'none';
        coverBtn.style.display = '';
    };
    // Allow pressing Enter in URL input to save
    coverUrlInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission if any
            coverUrlSaveBtn.click();
        } else if (e.key === 'Escape') {
            coverUrlCancelBtn.click();
        }
    };
    // --- End Cover Edit Logic ---

    // Save logic
    modal.querySelector('#playlist-edit-save').onclick = () => {
        const name = modal.querySelector('#playlist-edit-name').value.trim();
        const coverUrl = hiddenCoverInput.value.trim(); // Use the hidden input's value
        if (!name) {
            alert('Playlist name cannot be empty.');
            return;
        }
        modal.remove();
        onSave(name, coverUrl);
    };
}

// --- Playlist Creation UI ---

// Handle browser navigation for playlist view
window.addEventListener('popstate', (event) => {
    if (event.state) {
        if (event.state.type === 'playlist') {
            showEmptyPlaylistView(false);
        }
        // ...existing code...
    }
    // ...existing code...
});

// ...existing code...

// ...existing code...

document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...

    // Home navigation via nav-arrow (top bar)
    const navArrow = document.querySelector('.nav-arrow');
    if (navArrow) {
        navArrow.addEventListener('click', (e) => {
            e.preventDefault();
            loadHome();
        });
    }

    // Home navigation via sidebar Home nav-option
    document.querySelectorAll('.nav-option').forEach(option => {
        const link = option.querySelector('a');
        if (link && link.textContent.trim().toLowerCase() === 'home') {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                loadHome();
            });
            link.addEventListener('click', (e) => {
                e.preventDefault();
                loadHome();
            });
        }
    });

    // ...existing code...
});

// Function to show the search modal


// Attach event listener to the "add track" icon
document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', (event) => {
        const addTrackIcon = event.target.closest('.fa-square-plus.action-icon');
        if (addTrackIcon) {
            const playlistId = addTrackIcon.closest('.album-detail-view').dataset.playlistId;
            if (playlistId) {
                showSearchModal(playlistId);
            } else {
                console.error('Playlist ID not found.');
            }
        }
    });
});

// ...existing code...
// Function to get CSRF token (needed for Django POST requests)
function getCsrfToken() {
    const csrfCookie = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
    return csrfCookie ? csrfCookie.split('=')[1] : null;
}

// ...existing code...

// If you want to make user info available globally, do it like this at the top or inside DOMContentLoaded:
window.currentUserId = window.currentUserId || ""; // Set by template or fallback
window.currentUsername = window.currentUsername || ""; // Set by template or fallback
window.blockedUserIds = window.blockedUserIds || [];
window.friendUserIds = window.friendUserIds || [];

// ...existing code...