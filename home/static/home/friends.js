document.addEventListener('DOMContentLoaded', function () {
    console.log('Friends UI script loaded.');
    const addFriendBtn = document.getElementById('add-friend-btn');
    const addFriendModal = document.getElementById('add-friend-modal');
    const userIdInput = document.getElementById('add-friend-userid-input');
    const sendRequestBtn = document.getElementById('send-friend-request-btn');
    const addFriendMsg = document.getElementById('add-friend-message');
    const addFriendPreview = document.getElementById('add-friend-preview');
    const modalContent = addFriendModal ? addFriendModal.querySelector('.modal-content') : null;
    const closeBtn = addFriendModal ? addFriendModal.querySelector('.modal-close-btn') : null;

    // --- BEGIN: Setup current user, blocked, and friend lists ---
    // These should be set in your template or elsewhere in your JS
    // Example:
    // window.currentUserId = "{{ user_id|escapejs }}";
    // window.blockedUserIds = [...]; // Array of userids you have blocked
    // window.friendUserIds = [...]; // Array of userids you are already friends with
    // If not set, fallback to empty values
    const currentUserId = window.currentUserId || "";
    const blockedUserIds = window.blockedUserIds || [];
    const friendUserIds = window.friendUserIds || [];
    // --- END: Setup current user, blocked, and friend lists ---

    let foundUser = null;
    let searchTimeout = null;

    // Add a global isAuthenticated variable in your template or set it here:
    // window.isAuthenticated = {{ is_authenticated|yesno:"true,false" }};
    const isAuthenticated = typeof window.isAuthenticated !== 'undefined' ? window.isAuthenticated : false;

    // Function to animate modal opening
    function openAddFriendModal() {
        if (!addFriendModal) return;
        
        // Reset state
        userIdInput.value = '';
        addFriendMsg.textContent = '';
        if (addFriendPreview) addFriendPreview.style.display = 'none';
        foundUser = null;
        
        // Show modal with animation
        addFriendModal.classList.remove('hidden');
        addFriendModal.style.display = 'flex';
        
        // Trigger animation after a small delay to ensure display:flex is applied
        setTimeout(() => {
            if (modalContent) {
                modalContent.style.opacity = '1';
                modalContent.style.transform = 'scale(1)';
            }
        }, 50);
        
        // Focus input field for better UX
        setTimeout(() => userIdInput.focus(), 300);
    }

    // Function to animate modal closing
    function closeAddFriendModal() {
        if (!addFriendModal || !modalContent) return;
        
        // Animate closing
        modalContent.style.opacity = '0';
        modalContent.style.transform = 'scale(0.95)';
        
        // Hide modal after animation completes
        setTimeout(() => {
            addFriendModal.style.display = 'none';
            addFriendModal.classList.add('hidden');
        }, 300);
    }

    if (addFriendBtn && addFriendModal) {
        addFriendBtn.addEventListener('click', () => {
            if (!isAuthenticated) {
                // Show login modal instead of doing nothing
                if (typeof showLoginModal === 'function') {
                    showLoginModal();
                } else if (window.loginButtonTrigger) {
                    window.loginButtonTrigger.click();
                }
                return;
            }
            openAddFriendModal();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeAddFriendModal();
        });
        
        // Add hover effect
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.transform = 'scale(1.1)';
            closeBtn.style.backgroundColor = 'rgba(255,255,255,0.1)';
        });
        
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.transform = '';
            closeBtn.style.backgroundColor = '';
        });
    }

    if (userIdInput) {
        userIdInput.addEventListener('input', () => {
            // Clear any previous timeout
            if (searchTimeout) clearTimeout(searchTimeout);
            
            const userid = userIdInput.value.trim();
            addFriendMsg.textContent = '';
            foundUser = null;
            
            if (addFriendPreview) {
                // Hide with animation if currently visible
                if (addFriendPreview.style.display !== 'none') {
                    addFriendPreview.style.opacity = '0';
                    addFriendPreview.style.transform = 'translateY(5px)';
                    setTimeout(() => {
                        addFriendPreview.style.display = 'none';
                    }, 300);
                }
            }
            
            if (userid.length < 3) return;

            // Prevent sending request to existing friends
            if (friendUserIds.includes(userid)) {
                addFriendMsg.textContent = "You are already friends with this user";
                return;
            }

            // Validate against current user
            if (userid === currentUserId) {
                addFriendMsg.textContent = "You can't send a friend request to yourself";
                return;
            }

            // Validate against blocked users
            if (Array.isArray(blockedUserIds) && blockedUserIds.includes(userid)) {
                addFriendMsg.textContent = "This user is blocked";
                return;
            }

            // Validate against existing friends
            if (Array.isArray(friendUserIds) && friendUserIds.includes(userid)) {
                addFriendMsg.textContent = "You are already friends with this user";
                return;
            }

            // Delay search for better UX and to prevent too many requests
            addFriendMsg.textContent = 'Searching...';
            searchTimeout = setTimeout(async () => {
                try {
                    const resp = await fetch(`/api/get_user_details/?userid=${encodeURIComponent(userid)}`);
                    if (!resp.ok) {
                        addFriendMsg.textContent = 'User not found.';
                        return;
                    }
                    const data = await resp.json();
                    if (data && data.success) {
                        foundUser = data;
                        addFriendMsg.textContent = '';
                        if (addFriendPreview) {
                            // Enhanced user preview with better styling
                            addFriendPreview.innerHTML = `
                                <div style="display:flex; align-items:center; width:100%;">
                                    <div style="width:50px; height:50px; border-radius:50%; overflow:hidden; background:#333; flex-shrink:0; margin-right:15px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                                        <img src="${data.icon_url || '/static/home/assets/logo.png'}" style="width:100%; height:100%; object-fit:cover;">
                                    </div>
                                    <div style="flex-grow:1;">
                                        <div style="font-weight:700; font-size:1.1rem; color:#fff; margin-bottom:3px;">${data.username}</div>
                                        <div style="font-size:0.9rem; color:#aaa; display:flex; align-items:center;">
                                            <i class="bi bi-person-badge" style="margin-right:5px; font-size:0.85rem;"></i>
                                            ${data.userid || ''}
                                        </div>
                                    </div>
                                </div>
                            `;
                            
                            // Show with animation
                            addFriendPreview.style.display = 'flex';
                            setTimeout(() => {
                                addFriendPreview.style.opacity = '1';
                                addFriendPreview.style.transform = 'translateY(0)';
                            }, 50);
                        }
                    } else {
                        addFriendMsg.textContent = data && data.error ? data.error : 'User not found.';
                        if (addFriendPreview) addFriendPreview.style.display = 'none';
                    }
                } catch (err) {
                    addFriendMsg.textContent = 'Network error.';
                    if (addFriendPreview) addFriendPreview.style.display = 'none';
                }
            }, 500); // 500ms delay for smoother UX
        });
    }

    if (sendRequestBtn) {
        // Add hover and active states for button
        sendRequestBtn.addEventListener('mouseenter', () => {
            sendRequestBtn.style.backgroundColor = '#25b3ca';
            sendRequestBtn.style.transform = 'translateY(-50%) scale(1.05)';
        });
        
        sendRequestBtn.addEventListener('mouseleave', () => {
            sendRequestBtn.style.backgroundColor = '#1DA3B9';
            sendRequestBtn.style.transform = 'translateY(-50%)';
        });
        
        sendRequestBtn.addEventListener('mousedown', () => {
            sendRequestBtn.style.transform = 'translateY(-50%) scale(0.95)';
        });
        
        sendRequestBtn.addEventListener('mouseup', () => {
            sendRequestBtn.style.transform = 'translateY(-50%) scale(1.05)';
        });

        sendRequestBtn.addEventListener('click', async () => {
            if (!isAuthenticated) {
                // Show login modal instead of alert
                if (typeof showLoginModal === 'function') {
                    showLoginModal();
                } else if (window.loginButtonTrigger) {
                    window.loginButtonTrigger.click();
                }
                return;
            }
            const userid = userIdInput.value.trim();
            
            // Validate input and found user
            if (!userid || !foundUser) {
                addFriendMsg.textContent = 'Please enter a valid UserID';
                return;
            }

            // Prevent sending request to existing friends
            if (friendUserIds.includes(userid)) {
                addFriendMsg.textContent = "You are already friends with this user";
                return;
            }
            
            try {
                // First check if already friends or request exists
                const checkResp = await fetch(`/api/check_friend_request_exists/?recipient_id=${encodeURIComponent(userid)}`);
                const checkData = await checkResp.json();
                
                if (checkData.error === 'blocked' || checkData.error === 'already_friends') {
                    addFriendMsg.textContent = checkData.error === 'blocked' ? 
                        "Cannot send request - you have been blocked" : 
                        "You are already friends with this user";
                    return;
                }

                // Proceed with sending request if all validations pass
                sendRequestBtn.disabled = true;
                sendRequestBtn.style.opacity = '0.7';
                sendRequestBtn.style.cursor = 'wait';
                addFriendMsg.textContent = 'Sending request...';

                const resp = await fetch('/api/send_friend_request/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCsrfToken()
                    },
                    body: JSON.stringify({ userid })
                });
                
                const data = await resp.json();
                if (data.success) {
                    addFriendMsg.innerHTML = '<span style="color:#4cfa7d;"><i class="bi bi-check-circle-fill" style="margin-right:5px;"></i>Friend request sent!</span>';
                    updateFriendActivitySidebar();
                    
                    // Auto close after successful request
                    setTimeout(closeAddFriendModal, 2000);
                } else {
                    if (data.error === 'already_friends') {
                        addFriendMsg.textContent = "You are already friends with this user";
                    } else {
                        addFriendMsg.textContent = data.error || 'Failed to send request';
                    }
                }
            } catch (err) {
                addFriendMsg.textContent = 'Network error';
            } finally {
                sendRequestBtn.disabled = false;
                sendRequestBtn.style.opacity = '1';
                sendRequestBtn.style.cursor = 'pointer';
            }
        });
    }

    // Close modal on overlay click
    if (addFriendModal) {
        addFriendModal.addEventListener('click', e => {
            if (e.target === addFriendModal) closeAddFriendModal();
        });
    }

    // --- Notifications ---
    async function loadNotifications() {
        await checkPendingRequests();
    }

    // Add this after loadNotifications() function
    async function checkPendingRequests() {
        try {
            const resp = await fetch('/api/get_pending_requests/');
            const data = await resp.json();
            const notifIcon = document.getElementById('notification-icon');
            
            if (notifIcon) {
                if (Array.isArray(data.requests) && data.requests.length > 0) {
                    // Add notification styling
                    notifIcon.style.color = '#1ed760';  // Spotify green
                    notifIcon.style.animation = 'bellPulse 2s infinite';
                } else {
                    // Reset to default style
                    notifIcon.style.color = '';
                    notifIcon.style.animation = '';
                }
            }
            return data.requests || [];
        } catch (err) {
            console.error('Error checking notifications:', err);
            return [];
        }
    }

    // Add click handler for notification bell
    document.addEventListener('DOMContentLoaded', function() {
        const notifIcon = document.getElementById('notification-icon');
        const settingsBtn = document.getElementById('settings-btn');
        
        if (notifIcon) {
            notifIcon.addEventListener('click', async () => {
                const requests = await checkPendingRequests();
                if (requests.length > 0) {
                    // Open settings modal and show pending requests section
                    if (settingsBtn) {
                        settingsBtn.click(); // Open settings modal
                        
                        // Switch to friends section
                        const friendsLink = document.getElementById('sidebar-friends');
                        if (friendsLink) {
                            friendsLink.click();
                        }
                    }
                }
            });

            // Check for notifications periodically
            setInterval(checkPendingRequests, 30000); // Check every 30 seconds
            checkPendingRequests(); // Initial check
        }
    });

    // Add this to your existing CSS or create new style element
    const style = document.createElement('style');
    style.textContent = `
        @keyframes bellPulse {
            0% { transform: scale(1); }
            15% { transform: scale(1.2); }
            30% { transform: scale(1); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(style);

    // Call on load and optionally on interval
    loadNotifications();

    // --- Pending Friend Requests in Settings ---
    async function loadPendingRequests() {
        const list = document.getElementById('friend-request-list');
        const badge = document.getElementById('pending-requests-badge');
        const empty = document.getElementById('pending-empty');
        if (!list) return;
        list.innerHTML = '';
        try {
            const resp = await fetch('/api/get_pending_requests/');
            const data = await resp.json();
            if (Array.isArray(data.requests) && data.requests.length > 0) {
                badge.textContent = data.requests.length;
                empty.style.display = 'none';
                data.requests.forEach(req => {
                    const card = document.createElement('div');
                    card.className = 'friend-request-card';
                    card.innerHTML = `
                        <img src="${req.sender_icon_url || '/static/home/assets/logo.png'}" class="friend-request-avatar">
                        <div class="friend-request-info">
                            <span class="friend-request-username">${req.sender_username}</span>
                            <span class="friend-request-mutual">${req.sender_userid}</span>
                        </div>
                        <div class="friend-request-actions">
                            <button class="friend-request-btn accept">Accept</button>
                            <button class="friend-request-btn reject">Reject</button>
                        </div>
                    `;
                    card.querySelector('.accept').onclick = () => respondRequest(req.request_id, 'accept', card);
                    card.querySelector('.reject').onclick = () => respondRequest(req.request_id, 'reject', card);
                    list.appendChild(card);
                });
            } else {
                badge.textContent = '0';
                empty.style.display = '';
            }
        } catch {}
    }
    async function respondRequest(requestId, action, card) {
        try {
            const resp = await fetch('/api/respond_friend_request/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                body: JSON.stringify({ request_id: requestId, action })
            });
            const data = await resp.json();
            if (data.success) {
                card.classList.add('hide');
                setTimeout(() => card.remove(), 300);
                loadPendingRequests();
                loadFriendsList();
                loadNotifications();
                updateFriendActivitySidebar(); // Refresh sidebar after accepting/rejecting
            }
        } catch {}
    }
    // --- Friends List in Settings ---
    async function loadFriendsList() {
        const grid = document.getElementById('friends-list-grid');
        const empty = document.getElementById('friends-empty');
        if (!grid) return;
        grid.innerHTML = '';
        try {
            const resp = await fetch('/api/get_friends_list/');
            const data = await resp.json();
            if (Array.isArray(data.friends) && data.friends.length > 0) {
                empty.style.display = 'none';
                data.friends.forEach(friend => {
                    const card = document.createElement('div');
                    card.className = 'friend-card';
                    card.innerHTML = `
                        <img src="${friend.icon_url || '/static/home/assets/logo.png'}" class="friend-avatar">
                        <div class="friend-info">
                            <span class="friend-username">${friend.username}</span>
                            <span class="friend-last-active">${friend.last_seen || ''}</span>
                        </div>
                        <div class="friend-actions">
                            <button class="friend-btn block unfriend-btn" aria-label="Unfriend">
                                <i class="bi bi-person-x "></i> Unfriend
                            </button>
                        </div>
                    `;
                    // Add unfriend dialog logic
                    card.querySelector('.unfriend-btn').onclick = function () {
                        // Always create a fresh dialog
                        const dialog = createRemoveTrackDialog();

                        // Update dialog title/message and confirm button for unfriending
                        dialog.querySelector('h3').textContent = 'Unfriend';
                        dialog.querySelector('p').textContent = `Are you sure you want to unfriend ${friend.username}?`;
                        dialog.querySelector('#remove-track-confirm').textContent = 'Unfriend';

                        dialog.style.display = 'flex';

                        const confirmBtn = dialog.querySelector('#remove-track-confirm');
                        const cancelBtn = dialog.querySelector('#remove-track-cancel');

                        // Confirm unfriending
                        confirmBtn.onclick = async function () {
                            dialog.style.display = 'none';
                            try {
                                const resp = await fetch('/api/unfriend/', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                                    body: JSON.stringify({ userid: friend.userid || friend.username })
                                });
                                const data = await resp.json();
                                if (data.success) {
                                    card.classList.add('hide');
                                    setTimeout(() => card.remove(), 300);
                                    updateFriendActivitySidebar();
                                    loadFriendsList();
                                } else {
                                    alert(data.error || 'Failed to unfriend.');
                                }
                            } catch {
                                alert('Network error.');
                            }
                        };
                        // Cancel closes dialog
                        cancelBtn.onclick = function () {
                            dialog.style.display = 'none';
                        };
                    };
                    grid.appendChild(card);
                });
            } else {
                empty.style.display = '';
            }
        } catch {}
    }

    // --- Friends List Search/Filter ---
    const friendsSearchInput = document.getElementById('friends-search');
    if (friendsSearchInput) {
        friendsSearchInput.addEventListener('input', function () {
            const query = this.value.trim().toLowerCase();
            const cards = document.querySelectorAll('#friends-list-grid .friend-card');
            let anyVisible = false;
            cards.forEach(card => {
                const username = card.querySelector('.friend-username')?.textContent.toLowerCase() || '';
                if (username.includes(query)) {
                    card.style.display = '';
                    anyVisible = true;
                } else {
                    card.style.display = 'none';
                }
            });
            // Show/hide empty state if nothing matches
            const empty = document.getElementById('friends-empty');
            if (empty) empty.style.display = anyVisible ? 'none' : '';
        });
    }

    // --- Block User Dialog and Logic ---
    const blockUserBtn = document.getElementById('block-user-btn');
    const blockUserInput = document.getElementById('block-user-input');
    if (blockUserBtn && blockUserInput) {
        blockUserBtn.onclick = function () {
            const userid = blockUserInput.value.trim();
            if (!userid) return;

            // Create and show block dialog
            const dialog = createBlockUserDialog(userid);

            dialog.style.display = 'flex';

            const confirmBtn = dialog.querySelector('#block-user-confirm');
            const cancelBtn = dialog.querySelector('#block-user-cancel');

            confirmBtn.onclick = async function () {
                dialog.style.display = 'none';
                try {
                    const resp = await fetch('/api/block/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                        body: JSON.stringify({ target_userid: userid, reason: 'Blocked by user from settings' })
                    });
                    const data = await resp.json();
                    if (data.success) {
                        blockUserInput.value = '';
                        window.refreshFriendsUI && window.refreshFriendsUI();
                    } else {
                        alert(data.error || 'Failed to block user.');
                    }
                } catch {
                    alert('Network error.');
                }
            };
            cancelBtn.onclick = function () {
                dialog.style.display = 'none';
            };
        };
    }

    // --- Blocked Users List ---
    async function loadBlockedList() {
        const list = document.getElementById('blocked-list');
        const empty = document.getElementById('blocked-empty');
        if (!list) return;
        list.innerHTML = '';
        try {
            const resp = await fetch('/api/blocked/list/');
            const data = await resp.json();
            if (Array.isArray(data.blocked_users) && data.blocked_users.length > 0) {
                empty.style.display = 'none';
                data.blocked_users.forEach(user => {
                    const card = document.createElement('div');
                    card.className = 'blocked-card';
                    card.tabIndex = 0;
                    card.innerHTML = `
                        <img class="blocked-avatar" src="${user.icon_url || '/static/home/assets/logo.png'}" alt="Blocked">
                        <div class="blocked-info">
                            <span class="blocked-username">${user.username}</span>
                            <span class="blocked-date">Blocked on ${user.blocked_at ? user.blocked_at.split('T')[0] : ''}</span>
                        </div>
                        <div class="blocked-actions">
                            <button class="blocked-btn" aria-label="Unblock">
                                <i class="bi bi-arrow-repeat"></i> Unblock
                            </button>
                        </div>
                    `;
                    // Unblock logic
                    card.querySelector('.blocked-btn').onclick = async function () {
                        try {
                            const resp = await fetch('/api/unblock/', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                                body: JSON.stringify({ target_userid: user.userid })
                            });
                            const data = await resp.json();
                            if (data.success) {
                                card.classList.add('hide');
                                setTimeout(() => card.remove(), 300);
                                loadBlockedList();
                                window.refreshFriendsUI && window.refreshFriendsUI();
                            } else {
                                alert(data.error || 'Failed to unblock user.');
                            }
                        } catch {
                            alert('Network error.');
                        }
                    };
                    list.appendChild(card);
                });
            } else {
                empty.style.display = '';
            }
        } catch {
            empty.style.display = '';
        }
    }

    // --- Friend Activity Sidebar ---
    async function updateFriendActivitySidebar() {
        const container = document.querySelector('.friend-activity-list');
        if (!container) return;
    
        try {
            const resp = await fetch('/api/get_friends_list/');
            if (!resp.ok) {
                throw new Error(`HTTP error! status: ${resp.status}`);
            }
            const data = await resp.json();
    
            if (!Array.isArray(data.friends)) {
                throw new Error('Invalid response format');
            }
    
            container.innerHTML = ''; // Clear existing content
    
            if (data.friends.length > 0) {
                data.friends.forEach(friend => {
                    const friendDiv = document.createElement('div');
                    friendDiv.className = 'friend-activity';
                    // Add .me class to your own status for easier update
                    const isMe = window.currentUserId && (friend.userid === window.currentUserId || friend.username === window.currentUsername);
                    friendDiv.innerHTML = `
                        <div class="friend-activity-content">
                            <div class="friend-avatar">
                                <img src="${friend.icon_url || '/static/home/assets/logo.png'}" alt="${friend.username}">
                                <div class="status-dot ${friend.last_seen ? 'online' : 'offline'}"></div>
                            </div>
                            <div class="friend-info">
                                <span class="friend-name">${friend.username}</span>
                                <span class="friend-status${isMe ? ' me' : ''}">
                                    ${friend.listeningto && friend.listeningto.trim() ? `<i class="bi bi-music-note-beamed"></i> ${friend.listeningto}` : 'Nothing'}
                                </span>
                            </div>
                        </div>
                    `;
                    container.appendChild(friendDiv);
                });
            } else {
                container.innerHTML = `
                    <div class="no-friends-message">
                        <i class="bi bi-people"></i>
                        <p>Add some friends to see their activity!</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error updating friend activity:', error);
            container.innerHTML = `
                <div class="error-message">
                    <i class="bi bi-exclamation-circle"></i>
                    <p>Couldn't load friend activity.<br>Please try again later.</p>
                </div>
            `;
        }
    }
    
    // Ensure updateFriendActivitySidebar is called periodically
    setInterval(updateFriendActivitySidebar, 60000); // Update every minute

    // Expose for manual refresh if needed
    window.refreshFriendsUI = function () {
        loadPendingRequests();
        loadFriendsList();
        updateFriendActivitySidebar();
        loadNotifications();
        loadBlockedList();
    };

    // Initial load
    loadPendingRequests();
    loadFriendsList();
    updateFriendActivitySidebar();
    loadBlockedList();
});

// Helper to get CSRF token from cookie
function getCsrfToken() {
    const csrfCookie = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
    return csrfCookie ? csrfCookie.split('=')[1] : null;
}

// Place this function at the end of the file (or before usage)
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

// Block user dialog
function createBlockUserDialog(userid) {
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
            <h3 style="margin:0 0 16px;">Block User</h3>
            <p style="margin:0 0 24px;">Are you sure you want to block <b>${userid}</b>?<br>This will remove them from your friends list if present.</p>
            <div style="display:flex; gap:12px; justify-content:center;">
                <button id="block-user-confirm" style="background:#ff3b30; color:#fff; border:none; padding:8px 24px; border-radius:6px; cursor:pointer;">Block</button>
                <button id="block-user-cancel" style="background:#444; color:#fff; border:none; padding:8px 24px; border-radius:6px; cursor:pointer;">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);
    return dialog;
}
