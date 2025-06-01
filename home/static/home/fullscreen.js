let isFullscreen = false;
const fullscreenButton = document.getElementById('fullscreen-button');

// Check if music is playing and update button state
function updateFullscreenButtonState() {
    const title = document.querySelector('.firstword')?.textContent;
    if (fullscreenButton) {
        if (!title) {
            fullscreenButton.style.opacity = '0.5';
            fullscreenButton.style.cursor = 'not-allowed';
            fullscreenButton.style.pointerEvents = 'none';
        } else {
            fullscreenButton.style.opacity = '1';
            fullscreenButton.style.cursor = 'pointer';
            fullscreenButton.style.pointerEvents = 'auto';
        }
    }
}

function toggleFullscreen() {
    const title = document.querySelector('.firstword')?.textContent;
    if (!title) return; // Don't do anything if no music is playing
    
    const mainContent = document.getElementById('main-content-area');
    const fsOverlay = document.querySelector('.fs-overlay');
    
    if (!isFullscreen) {
        // Enter fullscreen
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        }
        
        // Show overlay
        fsOverlay.style.display = 'flex';
        setTimeout(() => fsOverlay.classList.add('active'), 10);
        
        // Update cover and details
        updateFullscreenContent();
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
        
        // Hide overlay
        fsOverlay.classList.remove('active');
        setTimeout(() => fsOverlay.style.display = 'none', 300);
    }
    
    isFullscreen = !isFullscreen;
}

function updateFullscreenContent() {
    const title = document.querySelector('.firstword')?.textContent;
    const artist = document.querySelector('.secondword')?.textContent;
    const coverUrl = document.querySelector('.album img')?.src;

    if (title && artist && coverUrl) {
        document.querySelector('.fs-title').textContent = title;
        document.querySelector('.fs-artists').textContent = artist;
        document.querySelector('.fs-cover').src = coverUrl;
        
        // Update backgrounds
        document.querySelectorAll('.fs-bg').forEach(bg => {
            bg.style.backgroundImage = `url('${coverUrl}')`;
        });
    }
}

// Add event listeners
if (fullscreenButton) {
    fullscreenButton.addEventListener('click', toggleFullscreen);
}

// Add event listener for Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isFullscreen) {
        const fsOverlay = document.querySelector('.fs-overlay');
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
        fsOverlay.classList.remove('active');
        setTimeout(() => {
            fsOverlay.style.display = 'none';
            isFullscreen = false;
        }, 300);
    }
});

// Listen for song changes
const observer = new MutationObserver((mutations) => {
    updateFullscreenButtonState();
    if (isFullscreen) {
        updateFullscreenContent();
    }
});

const songInfo = document.querySelector('.name');
if (songInfo) {
    observer.observe(songInfo, { subtree: true, characterData: true, childList: true });
}

// Initial button state
updateFullscreenButtonState();
