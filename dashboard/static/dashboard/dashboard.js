const sideLinks = document.querySelectorAll('.sidebar .side-menu li a:not(.logout)');

sideLinks.forEach(item => {
    const li = item.parentElement;
    item.addEventListener('click', () => {
        sideLinks.forEach(i => {
            i.parentElement.classList.remove('active');
        })
        li.classList.add('active');
    })
});

const menuBar = document.querySelector('.content nav .bx.bx-menu');
const sideBar = document.querySelector('.sidebar');

menuBar.addEventListener('click', () => {
    sideBar.classList.toggle('close');
});

const searchForm = document.querySelector('.content nav form');

window.addEventListener('resize', () => {
    if (window.innerWidth < 768) {
        sideBar.classList.add('close');
    } else {
        sideBar.classList.remove('close');
    }
});

const toggler = document.getElementById('theme-toggle');

toggler.addEventListener('change', function () {
    if (this.checked) {
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
    }
});

// --- CRUD Modal Form Handling ---

// URLs need to be passed from Django template to JS
// We'll assume these are available globally or passed via data attributes if needed.
// For simplicity here, we construct them, but using Django's {% url %} tag
// in the template and passing to JS is the robust way.
const trackAddUrl = '/dashboard/tracks/add/';
const trackEditUrlBase = '/dashboard/tracks/edit/'; // Needs ID appended
const artistAddUrl = '/dashboard/artists/add/';
const artistEditUrlBase = '/dashboard/artists/edit/'; // Needs ID appended
const albumAddUrl = '/dashboard/albums/add/';
const albumEditUrlBase = '/dashboard/albums/edit/'; // Needs ID appended


// == Track Add/Edit Modal ==
const addEditTrackModal = document.getElementById('addEditTrackModal');
const trackForm = document.getElementById('trackForm');

if (addEditTrackModal && trackForm) {
    addEditTrackModal.addEventListener('show.bs.modal', event => {
        const button = event.relatedTarget; // Button that triggered the modal
        const action = button.getAttribute('data-bs-action');
        const modalTitle = addEditTrackModal.querySelector('.modal-title');

        if (action === 'add') {
            modalTitle.textContent = 'Add New Track';
            trackForm.action = trackAddUrl;
            trackForm.reset(); // Clear form fields
            // No artists dropdown to clear
            // Clear any potential hidden ID field if reusing form
            const hiddenId = trackForm.querySelector('input[type="hidden"][name="track_id"]');
            if (hiddenId) hiddenId.remove();

        } else if (action === 'edit') {
            modalTitle.textContent = 'Edit Track';
            const trackId = button.getAttribute('data-track-id');
            trackForm.action = `${trackEditUrlBase}${trackId}/`; // Set form action URL

            // Populate form fields from data attributes
            trackForm.querySelector('#id_title').value = button.getAttribute('data-track-title');
            trackForm.querySelector('#id_file_url').value = button.getAttribute('data-track-file');
            trackForm.querySelector('#id_album').value = button.getAttribute('data-track-album');
            trackForm.querySelector('#id_track_image_url').value = button.getAttribute('data-track-image');

            // Auto-select primary artist
            const primaryArtistSelect = trackForm.querySelector('#id_primary_artist');
            if (primaryArtistSelect) {
                primaryArtistSelect.value = button.getAttribute('data-track-primary-artist');
            }

            // Auto-select secondary artists (comma-separated IDs)
            const secondaryArtistSelect = trackForm.querySelector('#id_secondary_artists');
            if (secondaryArtistSelect) {
                const artistIds = button.getAttribute('data-track-secondary-artists');
                if (artistIds) {
                    const ids = artistIds.split(',').map(id => id.trim());
                    Array.from(secondaryArtistSelect.options).forEach(option => {
                        option.selected = ids.includes(option.value);
                    });
                }
            }

            // --- Auto-select artists ---
            const artistSelect = trackForm.querySelector('#id_artists');
            if (artistSelect) {
                // Get artist IDs from data attribute (comma-separated)
                const artistIds = button.getAttribute('data-track-artists');
                if (artistIds) {
                    const ids = artistIds.split(',').map(id => id.trim());
                    Array.from(artistSelect.options).forEach(option => {
                        option.selected = ids.includes(option.value);
                    });
                }
            }
        }
    });
}


// == Artist Add/Edit Modal ==
const addEditArtistModal = document.getElementById('addEditArtistModal');
const artistForm = document.getElementById('artistForm');

if (addEditArtistModal && artistForm) {
    addEditArtistModal.addEventListener('show.bs.modal', event => {
        const button = event.relatedTarget;
        const action = button.getAttribute('data-bs-action');
        const modalTitle = addEditArtistModal.querySelector('.modal-title');

        if (action === 'add') {
            modalTitle.textContent = 'Add New Artist';
            artistForm.action = artistAddUrl;
            artistForm.reset();
        } else if (action === 'edit') {
            modalTitle.textContent = 'Edit Artist';
            const artistId = button.getAttribute('data-artist-id');
            artistForm.action = `${artistEditUrlBase}${artistId}/`;

            artistForm.querySelector('#id_name').value = button.getAttribute('data-artist-name');
            artistForm.querySelector('#id_bio').value = button.getAttribute('data-artist-bio');
            artistForm.querySelector('#id_artist_image_url').value = button.getAttribute('data-artist-image');
        }
    });
}

// == Album Add/Edit Modal ==
const addEditAlbumModal = document.getElementById('addEditAlbumModal');
const albumForm = document.getElementById('albumForm');

if (addEditAlbumModal && albumForm) {
    addEditAlbumModal.addEventListener('show.bs.modal', event => {
        const button = event.relatedTarget;
        const action = button.getAttribute('data-bs-action');
        const modalTitle = addEditAlbumModal.querySelector('.modal-title');

        if (action === 'add') {
            modalTitle.textContent = 'Add New Album';
            albumForm.action = albumAddUrl;
            albumForm.reset();
        } else if (action === 'edit') {
            modalTitle.textContent = 'Edit Album';
            const albumId = button.getAttribute('data-album-id');
            albumForm.action = `${albumEditUrlBase}${albumId}/`;

            albumForm.querySelector('#id_title').value = button.getAttribute('data-album-title');
            albumForm.querySelector('#id_cover_image_url').value = button.getAttribute('data-album-cover');
            albumForm.querySelector('#id_primary_artist').value = button.getAttribute('data-album-artist');
        }
    });
}

// Basic Delete Confirmation (already added inline in HTML, but could be done here too)
// const deleteButtons = document.querySelectorAll('.delete-btn');
// deleteButtons.forEach(button => {
//     button.addEventListener('click', function(event) {
//         if (!confirm('Are you sure you want to delete this item?')) {
//             event.preventDefault(); // Stop form submission if user cancels
//         }
//     });
// });

document.addEventListener('DOMContentLoaded', function () {
    // --- Activate section from URL parameter ---
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    if (section) {
        // Remove active from all
        document.querySelectorAll('.side-menu li').forEach(li => li.classList.remove('active'));
        document.querySelectorAll('.section').forEach(sectionEl => {
            sectionEl.classList.remove('active');
            sectionEl.style.display = 'none';
        });
        // Hide dashboard blocks
        document.getElementById('insights-block').style.display = 'none';
        document.getElementById('dashboard-bottom-data').style.display = 'none';
        // Activate sidebar and section
        const sidebarLi = document.querySelector(`.side-menu li[data-section="${section}"]`);
        const sectionEl = document.getElementById(section);
        if (sidebarLi) sidebarLi.classList.add('active');
        if (sectionEl) {
            sectionEl.classList.add('active');
            sectionEl.style.display = '';
            // Update header
            let title = sectionEl.querySelector('.card-header h2, .card-header .mb-0');
            if (title) {
                document.getElementById('main-header-title').textContent = title.textContent;
            } else {
                document.getElementById('main-header-title').textContent = section.replace('-section', '').replace(/^\w/, c => c.toUpperCase());
            }
        }
        // Remove ?section=... from URL after activation (so reload goes to dashboard)
        if (window.history.replaceState) {
            const url = window.location.pathname + window.location.hash;
            window.history.replaceState({}, '', url);
        }
    }
    // Sidebar section switching logic
    // Closing modals does NOT trigger a section switch; user stays in the current section.
    document.querySelectorAll('.side-menu li[data-section]').forEach(item => {
        item.addEventListener('click', function () {
            document.querySelectorAll('.side-menu li').forEach(li => li.classList.remove('active'));
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
                section.style.display = 'none';
            });
            // Hide insights and dashboard bottom data by default
            document.getElementById('insights-block').style.display = 'none';
            document.getElementById('dashboard-bottom-data').style.display = 'none';

            this.classList.add('active');
            const sectionId = this.getAttribute('data-section');
            const section = document.getElementById(sectionId);
            if (section) {
                section.classList.add('active');
                section.style.display = '';
                // Change header title
                let title = section.querySelector('.card-header h2, .card-header .mb-0');
                if (title) {
                    document.getElementById('main-header-title').textContent = title.textContent;
                } else {
                    document.getElementById('main-header-title').textContent = sectionId.replace('-section', '').replace(/^\w/, c => c.toUpperCase());
                }
            }
        });
    });
    // Show dashboard insights and bottom-data only on Dashboard
    // Only trigger on the Dashboard sidebar item (li without data-section)
    document.querySelectorAll('.side-menu li:not([data-section])').forEach(function (dashboardLi) {
        dashboardLi.addEventListener('click', function () {
            document.querySelectorAll('.side-menu li').forEach(li => li.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
                section.style.display = 'none';
            });
            document.getElementById('insights-block').style.display = '';
            document.getElementById('dashboard-bottom-data').style.display = '';
            document.getElementById('main-header-title').textContent = 'Dashboard';
        });
    });

    // Toggle show/hide artists select in Add/Edit Track Modal
    const toggleArtists = document.getElementById('toggle-artists');
    const artistsBlock = document.getElementById('artists-select-block');
    if (toggleArtists && artistsBlock) {
        toggleArtists.addEventListener('change', function () {
            artistsBlock.style.display = this.checked ? '' : 'none';
        });
    }

    // Artist search filter for the select
    const artistSearch = document.getElementById('artist-search');
    const artistSelect = document.getElementById('id_artists');
    if (artistSearch && artistSelect) {
        artistSearch.addEventListener('input', function () {
            const filter = this.value.toLowerCase();
            Array.from(artistSelect.options).forEach(option => {
                option.style.display = option.text.toLowerCase().includes(filter) ? '' : 'none';
            });
        });
        // Limit selection to 3 artists
        artistSelect.addEventListener('change', function () {
            const selected = Array.from(this.selectedOptions);
            if (selected.length > 3) {
                selected[selected.length - 1].selected = false;
            }
        });
    }

    // Track form submit debug
    const trackForm = document.getElementById('trackForm');
    if (trackForm) {
        trackForm.addEventListener('submit', function (e) {
            // No-op debug
        });
    }

    // Secondary artists toggle logic
    const toggleSecondary = document.getElementById('toggle-secondary-artists');
    const secondaryBlock = document.getElementById('secondary-artists-block');
    if (toggleSecondary && secondaryBlock) {
        toggleSecondary.addEventListener('change', function () {
            secondaryBlock.style.display = this.checked ? '' : 'none';
        });
    }

    // Secondary artist search filter
    const secondaryArtistSearch = document.getElementById('secondary-artist-search');
    const secondaryArtistSelect = document.getElementById('id_secondary_artists');
    if (secondaryArtistSearch && secondaryArtistSelect) {
        secondaryArtistSearch.addEventListener('input', function () {
            const filter = this.value.toLowerCase();
            Array.from(secondaryArtistSelect.options).forEach(option => {
                option.style.display = option.text.toLowerCase().includes(filter) ? '' : 'none';
            });
        });
        // Limit selection to 2 secondary artists
        secondaryArtistSelect.addEventListener('change', function () {
            const selected = Array.from(this.selectedOptions);
            if (selected.length > 2) {
                selected[selected.length - 1].selected = false;
            }
        });
    }

    // Reminders functionality
    const addReminderBtn = document.getElementById('add-reminder-btn');
    const reminderInputGroup = document.getElementById('reminder-input-group');
    const reminderInput = document.getElementById('reminder-input');
    const saveReminderBtn = document.getElementById('save-reminder-btn');
    const reminderList = document.getElementById('reminder-list');
    const filterBtn = document.getElementById('reminder-filter-btn');

    let reminderFilter = localStorage.getItem('reminderFilter') || 'all';

    function getReminders() {
        try {
            return JSON.parse(localStorage.getItem('reminders') || '[]');
        } catch {
            return [];
        }
    }
    function saveReminders(reminders) {
        localStorage.setItem('reminders', JSON.stringify(reminders));
    }
    function renderReminders() {
        const reminders = getReminders();
        reminderList.innerHTML = '';
        let filtered = reminders;
        if (reminderFilter === 'done') {
            filtered = reminders.filter(r => r.done);
        } else if (reminderFilter === 'undone') {
            filtered = reminders.filter(r => !r.done);
        }
        filtered.forEach((reminder, idx) => {
            const li = document.createElement('li');
            li.className = reminder.done ? 'completed' : 'not-completed';
            li.setAttribute('data-index', idx);
            li.innerHTML = `
                <div class="task-title">
                    <i class='bx ${reminder.done ? 'bx-check-circle' : 'bx-x-circle'}'></i>
                    <p>${reminder.text}</p>
                </div>
                <i class='bx bx-dots-vertical-rounded reminder-menu' style="cursor:pointer"></i>
            `;
            reminderList.appendChild(li);
        });
        if (filtered.length > 6) {
            reminderList.style.overflowY = 'auto';
        } else {
            reminderList.style.overflowY = 'unset';
        }
    }
    function addReminder(text) {
        const reminders = getReminders();
        reminders.push({ text, done: false });
        saveReminders(reminders);
        renderReminders();
    }
    function toggleReminderDone(idx) {
        const reminders = getReminders();
        if (reminders[idx]) {
            reminders[idx].done = !reminders[idx].done;
            saveReminders(reminders);
            renderReminders();
        }
    }
    function deleteReminder(idx) {
        const reminders = getReminders();
        reminders.splice(idx, 1);
        saveReminders(reminders);
        renderReminders();
    }
    function showMenu(li, idx) {
        document.querySelectorAll('.reminder-context-menu').forEach(m => m.remove());
        const menu = document.createElement('div');
        menu.className = 'reminder-context-menu bg-white border rounded shadow-sm position-absolute';
        menu.style.zIndex = 1000;
        menu.style.minWidth = '120px';
        menu.style.color = 'black';
        menu.innerHTML = `
            <button class="dropdown-item" data-action="toggle">${li.classList.contains('completed') ? 'Mark as Undone' : 'Mark as Done'}</button>
            <button class="dropdown-item text-danger" data-action="delete">Delete</button>
        `;
        const rect = li.getBoundingClientRect();
        menu.style.top = (window.scrollY + rect.top + 30) + 'px';
        menu.style.left = (window.scrollX + rect.right - 140) + 'px';
        document.body.appendChild(menu);

        menu.querySelector('[data-action="toggle"]').onclick = function () {
            toggleReminderDone(idx);
            menu.remove();
        };
        menu.querySelector('[data-action="delete"]').onclick = function () {
            deleteReminder(idx);
            menu.remove();
        };
        setTimeout(() => {
            document.addEventListener('mousedown', function handler(e) {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('mousedown', handler);
                }
            });
        }, 10);
    }

    if (addReminderBtn && reminderInputGroup && reminderInput && saveReminderBtn && reminderList && filterBtn) {
        renderReminders();

        addReminderBtn.addEventListener('click', function () {
            reminderInputGroup.style.display = '';
            reminderInput.focus();
        });

        saveReminderBtn.addEventListener('click', function () {
            const text = reminderInput.value.trim();
            if (text) {
                addReminder(text);
                reminderInput.value = '';
                reminderInputGroup.style.display = 'none';
            }
        });

        reminderInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                saveReminderBtn.click();
            }
        });

        reminderList.addEventListener('click', function (e) {
            const li = e.target.closest('li');
            if (!li) return;
            const idx = li.getAttribute('data-index');
            if (e.target.classList.contains('bx-dots-vertical-rounded')) {
                showMenu(li, idx);
            } else if (e.target.classList.contains('bx-x-circle') || e.target.classList.contains('bx-check-circle')) {
                toggleReminderDone(idx);
            }
        });

        filterBtn.addEventListener('click', function () {
            if (reminderFilter === 'all') {
                reminderFilter = 'undone';
                filterBtn.style.color = '#ffc107';
                filterBtn.title = 'Show undone';
            } else if (reminderFilter === 'undone') {
                reminderFilter = 'done';
                filterBtn.style.color = '#28a745';
                filterBtn.title = 'Show done';
            } else {
                reminderFilter = 'all';
                filterBtn.style.color = '';
                filterBtn.title = 'Show all';
            }
            localStorage.setItem('reminderFilter', reminderFilter);
            renderReminders();
        });

        if (reminderFilter === 'undone') {
            filterBtn.style.color = '#ffc107';
            filterBtn.title = 'Show undone';
        } else if (reminderFilter === 'done') {
            filterBtn.style.color = '#28a745';
            filterBtn.title = 'Show done';
        } else {
            filterBtn.style.color = '';
            filterBtn.title = 'Show all';
        }
    }

    // --- Recent Changes Logic ---
    function getRecentChanges() {
        try {
            return JSON.parse(localStorage.getItem('recentChanges') || '[]');
        } catch {
            return [];
        }
    }
    function saveRecentChanges(changes) {
        localStorage.setItem('recentChanges', JSON.stringify(changes));
    }
    function renderRecentChanges() {
        const tbody = document.getElementById('recent-changes-tbody');
        if (!tbody) return;
        const changes = getRecentChanges();
        tbody.innerHTML = '';
        if (changes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center">No recent changes.</td></tr>`;
            return;
        }
        changes.slice(-6).reverse().forEach(change => {
            tbody.innerHTML += `
                <tr>
                    <td><p>${change.title}</p></td>
                    <td>${change.type}</td>
                    <td>${change.date}</td>
                    <td><span class="status ${change.actionClass}">${change.action}</span></td>
                </tr>
            `;
        });
    }
    function addRecentChange({title, type, action}) {
        const now = new Date();
        const dateStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        let actionClass = '';
        if (action === 'Added') actionClass = 'completed';
        else if (action === 'Edited') actionClass = 'process';
        else if (action === 'Deleted') actionClass = 'pending';
        const changes = getRecentChanges();
        changes.push({title, type, date: dateStr, action, actionClass});
        if (changes.length > 20) changes.shift();
        saveRecentChanges(changes);
        renderRecentChanges();
    }
    renderRecentChanges();

    // --- Hook into add/edit/delete for Tracks, Artists, Albums ---
    // Track form submit
    if (trackForm) {
        trackForm.addEventListener('submit', function (e) {
            const action = trackForm.querySelector('[name="track_id"]') ? 'Edited' : 'Added';
            const title = trackForm.querySelector('[name="title"]') ? trackForm.querySelector('[name="title"]').value : '';
            setTimeout(() => addRecentChange({title, type: 'Track', action}), 100);
        });
        document.querySelectorAll('[data-bs-target="#addEditTrackModal"][data-bs-action="edit"]').forEach(btn => {
            btn.addEventListener('click', function () {
                let input = trackForm.querySelector('[name="track_id"]');
                if (!input) {
                    input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = 'track_id';
                    trackForm.appendChild(input);
                }
                input.value = this.getAttribute('data-track-id');
            });
        });
        document.querySelectorAll('[data-bs-target="#addEditTrackModal"][data-bs-action="add"]').forEach(btn => {
            btn.addEventListener('click', function () {
                const input = trackForm.querySelector('[name="track_id"]');
                if (input) input.remove();
            });
        });
    }
    document.querySelectorAll('form[action*="delete_track"]').forEach(form => {
        form.addEventListener('submit', function (e) {
            const title = this.closest('tr').querySelector('td:nth-child(2) span')?.textContent || '';
            setTimeout(() => addRecentChange({title, type: 'Track', action: 'Deleted'}), 100);
        });
    });

    // Artist form submit
    const artistForm = document.getElementById('artistForm');
    if (artistForm) {
        artistForm.addEventListener('submit', function (e) {
            const action = artistForm.querySelector('[name="artist_id"]') ? 'Edited' : 'Added';
            const title = artistForm.querySelector('[name="name"]') ? artistForm.querySelector('[name="name"]').value : '';
            setTimeout(() => addRecentChange({title, type: 'Artist', action}), 100);
        });
        document.querySelectorAll('[data-bs-target="#addEditArtistModal"][data-bs-action="edit"]').forEach(btn => {
            btn.addEventListener('click', function () {
                let input = artistForm.querySelector('[name="artist_id"]');
                if (!input) {
                    input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = 'artist_id';
                    artistForm.appendChild(input);
                }
                input.value = this.getAttribute('data-artist-id');
            });
        });
        document.querySelectorAll('[data-bs-target="#addEditArtistModal"][data-bs-action="add"]').forEach(btn => {
            btn.addEventListener('click', function () {
                const input = artistForm.querySelector('[name="artist_id"]');
                if (input) input.remove();
            });
        });
    }
    document.querySelectorAll('form[action*="delete_artist"]').forEach(form => {
        form.addEventListener('submit', function (e) {
            const title = this.closest('tr').querySelector('td:nth-child(2) span')?.textContent || '';
            setTimeout(() => addRecentChange({title, type: 'Artist', action: 'Deleted'}), 100);
        });
    });

    // Album form submit
    const albumForm = document.getElementById('albumForm');
    if (albumForm) {
        albumForm.addEventListener('submit', function (e) {
            const action = albumForm.querySelector('[name="album_id"]') ? 'Edited' : 'Added';
            const title = albumForm.querySelector('[name="title"]') ? albumForm.querySelector('[name="title"]').value : '';
            setTimeout(() => addRecentChange({title, type: 'Album', action}), 100);
        });
        document.querySelectorAll('[data-bs-target="#addEditAlbumModal"][data-bs-action="edit"]').forEach(btn => {
            btn.addEventListener('click', function () {
                let input = albumForm.querySelector('[name="album_id"]');
                if (!input) {
                    input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = 'album_id';
                    albumForm.appendChild(input);
                }
                input.value = this.getAttribute('data-album-id');
            });
        });
        document.querySelectorAll('[data-bs-target="#addEditAlbumModal"][data-bs-action="add"]').forEach(btn => {
            btn.addEventListener('click', function () {
                const input = albumForm.querySelector('[name="album_id"]');
                if (input) input.remove();
            });
        });
    }
    document.querySelectorAll('form[action*="delete_album"]').forEach(form => {
        form.addEventListener('submit', function (e) {
            const title = this.closest('tr').querySelector('td:nth-child(2) span')?.textContent || '';
            setTimeout(() => addRecentChange({title, type: 'Album', action: 'Deleted'}), 100);
        });
    });

    // Insights block click: go to section
    document.querySelectorAll('#insights-block li[data-section]').forEach(li => {
        li.addEventListener('click', function () {
            const sectionId = this.getAttribute('data-section');
            // Simulate sidebar click for consistency
            const sidebarLi = document.querySelector(`.side-menu li[data-section="${sectionId}"]`);
            if (sidebarLi) sidebarLi.click();
        });
    });

    // Profile image save logic
    const saveProfileImageBtn = document.getElementById('saveProfileImageBtn');
    const profileImageUrlInput = document.getElementById('profileImageUrlInput');
    const profileImagePreview = document.getElementById('profileImagePreview');
    if (saveProfileImageBtn && profileImageUrlInput && profileImagePreview) {
        saveProfileImageBtn.addEventListener('click', function () {
            const newUrl = profileImageUrlInput.value.trim();
            if (newUrl) {
                fetch('/api/update_icon/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': (function() {
                            const csrfCookie = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
                            return csrfCookie ? csrfCookie.split('=')[1] : '';
                        })()
                    },
                    body: JSON.stringify({ icon_url: newUrl })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        profileImagePreview.src = newUrl;
                        // Optionally close the edit UI here
                    } else {
                        // Optionally show error
                    }
                });
            }
        });
    }
});