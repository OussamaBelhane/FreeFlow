function showLyricsModal() {
    // Remove existing modal if present
    document.getElementById('lyrics-modal')?.remove();

    // Create modal structure
    const modal = document.createElement('div');
    modal.id = 'lyrics-modal';
    modal.style.cssText = `
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 3000;
        align-items: center;
        justify-content: center;
    `;

    modal.innerHTML = `
        <div class="lyrics-container" style="
            background: #282828;
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            border-radius: 12px;
            padding: 24px;
            position: relative;
            overflow-y: auto;
        ">
            <h2 style="color: #fff; margin-bottom: 20px;">Lyrics</h2>
            <div id="lyrics-content" style="color: #b3b3b3; line-height: 1.6;">
                Loading lyrics...
            </div>
            <button id="close-lyrics-modal" style="
                position: absolute;
                top: 20px;
                right: 20px;
                background: none;
                border: none;
                color: #fff;
                font-size: 24px;
                cursor: pointer;
            ">&times;</button>
        </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'flex';

    // Add close handlers
    const closeBtn = document.getElementById('close-lyrics-modal');
    const closeModal = () => {
        modal.classList.add('fade-out');
        setTimeout(() => modal.remove(), 200);
    };

    closeBtn.onclick = closeModal;
    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') closeModal();
    });

    // Attempt to fetch lyrics
    const content = document.getElementById('lyrics-content');
    const title = document.querySelector('.firstword')?.textContent;
    const artist = document.querySelector('.secondword')?.textContent;

    if (!title || !artist) {
        content.textContent = 'No track playing.';
        return;
    }

    // Simulated lyrics fetch - replace with actual API call
    content.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <strong style="color: #fff;">${title}</strong><br>
            <span style="color: #b3b3b3;">${artist}</span>
        </div>
        <p>[Verse 1]</p>
        <p>Lyrics coming soon...</p>
        <p>Feature under development</p>
    `;
}

async function fetchLyrics(artist, title) {
    try {
        const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
        const data = await response.json();
        return data.lyrics;
    } catch (error) {
        console.error('Error fetching lyrics:', error);
        return null;
    }
}

function formatLyrics(lyricsText) {
    if (!lyricsText) return '';
    // Split lyrics into lines and wrap each line in a p tag
    return lyricsText
        .split('\n')
        .map(line => `<p>${line || '&nbsp;'}</p>`) // Empty lines get a space
        .join('');
}

function showLyricsInMain() {
    const mainContent = document.getElementById('main-content-area');
    if (!mainContent) return;

    const title = document.querySelector('.firstword')?.textContent || 'No track playing';
    const artist = document.querySelector('.secondword')?.textContent || '';

    const lyricsHTML = `
        <div class="lyrics-view">
            <div class="lyrics-header">
                <button class="lyrics-close-btn" onclick="closeLyrics()">
                    <i class="bi bi-x-lg"></i>
                </button>
                <h2>${title}</h2>
                <p class="lyrics-artist">${artist}</p>
            </div>
            <div class="lyrics-content">
                <div class="lyrics-placeholder" id="lyrics-loading">
                    <p class="text-muted text-center">
                        Loading lyrics...
                    </p>
                </div>
            </div>
        </div>
    `;

    // Save current content for back button
    if (!window.previousContent) {
        window.previousContent = mainContent.innerHTML;
    }

    mainContent.innerHTML = lyricsHTML;

    // Fetch and display lyrics
    if (title !== 'No track playing' && artist) {
        fetchLyrics(artist, title).then(lyrics => {
            const lyricsContent = document.querySelector('.lyrics-content');
            if (lyrics) {
                lyricsContent.innerHTML = formatLyrics(lyrics);
            } else {
                lyricsContent.innerHTML = `
                    <div class="lyrics-placeholder">
                        <p class="text-muted text-center">
                            Lyrics not found for this track.<br>
                            Try searching for "${title} - ${artist}" lyrics online.
                        </p>
                    </div>
                `;
            }
        });
    }
}

function closeLyrics() {
    const mainContent = document.getElementById('main-content-area');
    if (mainContent && window.previousContent) {
        mainContent.innerHTML = window.previousContent;
        window.previousContent = null;
    }
}

// Export for use in other files
window.showLyricsModal = showLyricsModal;
window.showLyricsInMain = showLyricsInMain;
window.closeLyrics = closeLyrics;
