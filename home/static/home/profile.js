document.addEventListener('DOMContentLoaded', () => {
    const userProfileTrigger = document.getElementById('user-profile-trigger');
    const userProfileDropdown = document.getElementById('user-profile-dropdown');
    const settingsBtn = document.getElementById('settings-btn');
    const userIdCopy = document.getElementById('user-id-copy');
    const userIdValue = document.getElementById('user-id-value');

    // Show/hide profile dropdown
    if (userProfileTrigger && userProfileDropdown) {
        userProfileTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = userProfileDropdown.style.display === 'block';
            userProfileDropdown.style.display = isVisible ? 'none' : 'block';
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userProfileDropdown.contains(e.target) && e.target !== userProfileTrigger) {
                userProfileDropdown.style.display = 'none';
            }
        });
    }

    // Copy UserID functionality
    if (userIdCopy && userIdValue) {
        userIdCopy.addEventListener('click', () => {
            const id = userIdValue.textContent;
            navigator.clipboard.writeText(id).then(() => {
                // Optional: Show a toast notification
                alert('UserID copied to clipboard!');
            });
        });
    }

    // Listening to on/off logic
    const listeningOnBtn = document.getElementById('listening-on-btn');
    const listeningOffBtn = document.getElementById('listening-off-btn');
    const listeningToValue = document.getElementById('listening-to-value');

    // Default: Off
    if (listeningOffBtn && listeningOnBtn && listeningToValue) {
        listeningOffBtn.style.background = '#1ed760';
        listeningOnBtn.style.background = '#444';
        listeningToValue.textContent = 'Nothing';

        listeningOnBtn.addEventListener('click', () => {
            listeningOnBtn.style.background = '#1ed760';
            listeningOffBtn.style.background = '#444';
            // Show current track if available, else "Now Listening"
            const currentTrack = document.querySelector('.firstword')?.textContent;
            listeningToValue.textContent = currentTrack && currentTrack.trim() ? currentTrack : 'Now Listening';
        });
        listeningOffBtn.addEventListener('click', () => {
            listeningOffBtn.style.background = '#1ed760';
            listeningOnBtn.style.background = '#444';
            listeningToValue.textContent = 'Nothing';
        });
    }
});
