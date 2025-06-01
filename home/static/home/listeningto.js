// Track current listening status
let _listeningToStatus = false;

// Function to update listening status in UI and database
function updateListeningStatus(trackTitle = '', status = false) {
    if (!window.currentUserId) return;

    // Update UI
    const listeningValue = document.getElementById('listening-to-value');
    if (listeningValue) {
        listeningValue.textContent = status ? (trackTitle || 'Now Listening') : 'Nothing';
    }

    // Update friend activity if visible
    const myStatusElem = document.querySelector('.friend-status.me');
    if (myStatusElem) {
        if (status && trackTitle) {
            myStatusElem.innerHTML = `<i class="bi bi-music-note-beamed"></i> ${trackTitle}`;
        } else {
            myStatusElem.textContent = 'Nothing';
        }
    }

    // Update database with both track title and status
    fetch('/api/update_listening_status/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': (function() {
                const csrfCookie = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
                return csrfCookie ? csrfCookie.split('=')[1] : '';
            })()
        },
        body: JSON.stringify({
            track_title: trackTitle,
            listeningto_status: status
        })
    }).catch(console.error);
}

// When audio plays, respect the current status setting
function setListeningTo(trackTitle) {
    if (_listeningToStatus) {
        updateListeningStatus(trackTitle, true);
    }
}

// When audio stops/ends, keep status but clear track
function clearListeningTo() {
    if (_listeningToStatus) {
        updateListeningStatus('', true);
    }
}

// Initialize listeners
document.addEventListener('DOMContentLoaded', () => {
    const listeningOnBtn = document.getElementById('listening-on-btn');
    const listeningOffBtn = document.getElementById('listening-off-btn');

    if (listeningOnBtn && listeningOffBtn) {
        // Get initial status from cookie
        _listeningToStatus = document.cookie.split('; ').find(row => row.startsWith('listening_status='))?.split('=')[1] === 'true';
        
        // Set initial button states based on cookie
        if (_listeningToStatus) {
            listeningOnBtn.style.background = '#1ed760';
            listeningOffBtn.style.background = '#444';
            // Get current track if playing
            const currentTrack = document.querySelector('.firstword')?.textContent;
            updateListeningStatus(currentTrack || '', true);
        } else {
            listeningOffBtn.style.background = '#1ed760';
            listeningOnBtn.style.background = '#444';
            updateListeningStatus('', false);
        }

        listeningOnBtn.addEventListener('click', () => {
            _listeningToStatus = true;
            listeningOnBtn.style.background = '#1ed760';
            listeningOffBtn.style.background = '#444';
            // Set cookie to persist status
            document.cookie = `listening_status=true;path=/;max-age=31536000`; // 1 year expiry
            // Get current track if playing
            const currentTrack = document.querySelector('.firstword')?.textContent;
            updateListeningStatus(currentTrack || '', true);
        });

        listeningOffBtn.addEventListener('click', () => {
            _listeningToStatus = false;
            listeningOffBtn.style.background = '#1ed760';
            listeningOnBtn.style.background = '#444';
            // Set cookie to persist status
            document.cookie = `listening_status=false;path=/;max-age=31536000`;
            updateListeningStatus('', false);
        });
    }
});

// Export functions for use in other files
window.setListeningTo = setListeningTo;
window.clearListeningTo = clearListeningTo;