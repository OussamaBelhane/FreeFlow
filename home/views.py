from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from django.contrib.auth import get_user_model
from .models import Track, Album, Artist  # Import your models
from .models import Track, Album, Artist, Playlist # Import Playlist model
from datetime import datetime, timedelta, timezone  # Add datetime imports
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone  # Ensure this import is present
from django.db import connection
from django.contrib.auth import authenticate, login
import random
import string
from django.contrib.auth import logout
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.views.decorators.http import require_POST
from django.conf import settings
from django.contrib.auth.decorators import login_required # Import login_required

# Accept optional album_id from the URL dispatcher
def music_home(request, album_id=None, playlist_id=None): # Add playlist_id parameter
    # --- Fetch Data Examples (Only needed for the actual home page view) ---
    made_for_you_tracks = []
    recommended_tracks = [] # Changed from recommended_albums
    recent_tracks = []
    latest_track_for_player = None

    # Fetch albums for display in main-content-header
    albums = Album.objects.prefetch_related('tracks').all()

    # Only fetch home page data if we are not loading a specific album page initially
    # (We could fetch it anyway, but it's slightly more efficient not to if just rendering the shell for an album)
    # However, let's keep fetching it for simplicity, the JS will replace the content anyway.
    # Fetch tracks for "Made For You" (e.g., first 7)
    # Use select_related to optimize fetching album/artist info if needed in template
    made_for_you_tracks = Track.objects.all().only('title', 'artist_name', 'file_url', 'track_image_url')[:7]
    print(f"DEBUG: Found {made_for_you_tracks.count()} tracks for 'Made For You'") # Add print statement

    # --- Fetch Recommended Tracks with 24h Cache ---
    now = timezone.now()
    recommended_track_ids = request.session.get('recommended_track_ids')
    recommended_timestamp_str = request.session.get('recommended_timestamp')
    recommended_timestamp = None

    if recommended_timestamp_str:
        try:
            # Attempt to parse the timestamp string
            recommended_timestamp = datetime.fromisoformat(recommended_timestamp_str)
            # Ensure it's timezone-aware (UTC)
            if recommended_timestamp.tzinfo is None:
                 recommended_timestamp = recommended_timestamp.replace(tzinfo=timezone.utc)
        except ValueError:
            # Handle cases where the stored timestamp is invalid
            recommended_timestamp = None
            recommended_track_ids = None # Invalidate IDs if timestamp is bad

    # Check if cache is valid (less than 24 hours old)
    cache_valid = False
    if recommended_track_ids and recommended_timestamp:
        if now - recommended_timestamp < timedelta(hours=24):
            cache_valid = True

    if cache_valid:
        # Fetch tracks from cached IDs, preserving order might be tricky with filter(id__in=...)
        # Fetching individually or using a Case/When might be needed for strict order preservation
        # For simplicity, let's fetch and rely on Python sorting if order matters deeply,
        # or accept database default order for filter(id__in=...).
        recommended_tracks = list(Track.objects.filter(track_id__in=recommended_track_ids).only('track_id', 'title', 'artist_name', 'file_url', 'track_image_url'))
        # Optional: Reorder based on stored ID list if needed
        # ordered_tracks = {track.track_id: track for track in fetched_tracks}
        # recommended_tracks = [ordered_tracks[tid] for tid in recommended_track_ids if tid in ordered_tracks]
        print("DEBUG: Using cached recommended tracks.")
    else:
        # Fetch 7 new random tracks
        recommended_tracks = list(Track.objects.order_by('?').only('track_id', 'title', 'artist_name', 'file_url', 'track_image_url')[:7])
        # Update session cache
        request.session['recommended_track_ids'] = [track.track_id for track in recommended_tracks]
        request.session['recommended_timestamp'] = now.isoformat() # Store as ISO format string
        print("DEBUG: Fetched new recommended tracks and updated cache.")
    # --- End Recommended Tracks ---

    # Fetch tracks for "Recent Listening" (e.g., latest 5 by ID)
    recent_tracks = Track.objects.all().only('title', 'artist_name', 'file_url', 'track_image_url').order_by('-track_id')[:5]

    # Fetch the first track overall to potentially preload the player
    # Fetch the latest track overall to potentially preload the player
    latest_track_for_player = Track.objects.order_by('-track_id').first()

    # Use session cookies to determine authentication state
    user_id = request.session.get('_auth_user_id')
    is_authenticated = bool(user_id)
    is_superuser = False
    username = None
    listeningto = None
    userid = None
    user_icon_url = None
    user_playlists = []
    has_playlists = False
    if is_authenticated:
        with connection.cursor() as cursor:
            cursor.execute("SELECT is_superuser, username, listeningto, userid, icon_url FROM auth_user WHERE id=%s", [user_id])
            row = cursor.fetchone()
            if row:
                is_superuser, username, listeningto, userid, user_icon_url = bool(row[0]), row[1], row[2], row[3], row[4]
        # Fetch playlists for this user
        with connection.cursor() as cursor:
            cursor.execute("SELECT playlist_id, name, cover_image_url FROM playlists WHERE owner_user_id=%s", [user_id])
            user_playlists = cursor.fetchall()
            has_playlists = len(user_playlists) > 0

    # --- Prepare Context ---
    context = {
        'made_for_you_items': made_for_you_tracks,
        'recommended_items': recommended_tracks, # Pass tracks here now
        'recent_items': recent_tracks,
        'initial_player_track': latest_track_for_player, # Pass the latest track for the player
        'initial_album_id': album_id, # Pass the album_id if provided by URL
        'initial_playlist_id': playlist_id, # Pass the playlist_id if provided by URL
        'albums': albums, # Add albums to context
        'user': username,  # Ensure the current username is passed
        'user_id': userid,
        'listeningto': listeningto,
        'is_authenticated': is_authenticated,
        'is_superuser': is_superuser,
        'user_icon_url': user_icon_url,
        'has_playlists': has_playlists,
        'user_playlists': user_playlists,
    }

    # --- Render Template ---
    # Path relative to TEMPLATES['DIRS']
    return render(request, 'index.html', context)

# Renamed view to return JSON data specifically
def album_detail_json(request, album_id):
    album = get_object_or_404(
        Album.objects.select_related('primary_artist').prefetch_related('tracks'), # Keep optimizations
        pk=album_id
    )

    # Prepare data for JSON response
    album_data = {
        'title': album.title,
        'cover_image_url': album.image_url_or_default, # Use the property for fallback
        'artist_name': album.primary_artist.name if album.primary_artist else "Unknown Artist",
        'tracks': [
            {
                'id': track.track_id,
                'title': track.title,
                'file_url': track.file_url,
                'image_url': track.image_url_or_default, # Use property for fallback
                'artist_name': track.all_artists, # Use property for combined artists
            } for track in album.tracks.all() # Fetch all related tracks
        ]
    }
    return JsonResponse(album_data)

@csrf_exempt
def check_email(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            email = data.get("email", "").strip()
            User = get_user_model()
            exists = User.objects.filter(email=email).exists()
            return JsonResponse({"exists": exists})
        except Exception:
            return JsonResponse({"exists": False})
    return JsonResponse({"error": "Invalid request"}, status=400)

@csrf_exempt
def login_user(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            email = data.get('email', '').strip()
            password = data.get('password', '')
            with connection.cursor() as cursor:
                cursor.execute("SELECT id, username, password, is_superuser FROM auth_user WHERE email=%s AND is_active=1", [email])
                row = cursor.fetchone()
                if not row:
                    return JsonResponse({"success": False, "error": "Invalid credentials"}, status=400)
                user_id, username, hashed_password, is_superuser = row
                if not check_password(password, hashed_password):
                    return JsonResponse({"success": False, "error": "Invalid credentials"}, status=400)
            # Authenticate and set session
            request.session.flush()  # Clear any old session
            request.session['_auth_user_id'] = str(user_id)
            request.session['_auth_user_backend'] = 'django.contrib.auth.backends.ModelBackend'
            request.session.set_expiry(30 * 24 * 60 * 60)  # 30 days
            # Django login (optional, for request.user)
            from django.contrib.auth import get_user_model, login as django_login
            User = get_user_model()
            try:
                user = User.objects.filter(pk=int(user_id)).first()
                if user:
                    django_login(request, user, backend='django.contrib.auth.backends.ModelBackend')
            except Exception as e:
                print(f"Login exception: {e}")
                pass
            response = JsonResponse({"success": True, "is_superuser": bool(is_superuser)})
            max_age = 30 * 24 * 60 * 60  # 1 month
            response.set_cookie('is_connected', '1', max_age=max_age, httponly=False, samesite='Lax')
            response.set_cookie('is_superuser', '1' if is_superuser else '0', max_age=max_age, httponly=False, samesite='Lax')
            response.set_cookie('username', username, max_age=max_age, httponly=False, samesite='Lax')
            return response
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=400)
    return JsonResponse({"error": "Invalid request"}, status=400)

def generate_unique_userid(username):
    for _ in range(10):  # Try up to 10 times to avoid collisions
        digits = ''.join(random.choices(string.digits, k=2))
        letters = ''.join(random.choices(string.ascii_lowercase, k=3))
        userid = f"{username}{digits}{letters}"
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM auth_user WHERE userid=%s", [userid])
            if cursor.fetchone()[0] == 0:
                return userid
    raise Exception("Could not generate unique userid")

@csrf_exempt
def signup_user(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            email = data.get('email', '').strip()
            username = data.get('username', '').strip()
            password = data.get('password', '')
            if not email or not username or not password:
                return JsonResponse({"success": False, "error": "Missing fields"}, status=400)
            with connection.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM auth_user WHERE email=%s", [email])
                if cursor.fetchone()[0] > 0:
                    return JsonResponse({"success": False, "error": "Email already exists"}, status=400)
                userid = generate_unique_userid(username)
                hashed_password = make_password(password)
                now = timezone.now()
                cursor.execute(
                    "INSERT INTO auth_user (userid, username, email, password, is_superuser, is_active, date_joined) VALUES (%s, %s, %s, %s, 0, 1, %s)",
                    [userid, username, email, hashed_password, now]
                )
            # Authenticate and log in the user
            from django.contrib.auth import get_user_model, login
            User = get_user_model()
            try:
                # Get the newly created user directly instead of authenticating
                user = User.objects.filter(username=username).first()
                if user:
                    login(request, user)
                    request.session.set_expiry(30 * 24 * 60 * 60)  # 30 days
            except Exception as e:
                print(f"Signup login exception: {e}")
                # Continue even if login fails
            # Fetch is_superuser for the new user
            with connection.cursor() as cursor:
                cursor.execute("SELECT is_superuser FROM auth_user WHERE username=%s", [username])
                row = cursor.fetchone()
                is_superuser = bool(row[0]) if row else False
            response = JsonResponse({"success": True, "is_superuser": is_superuser})
            max_age = 30 * 24 * 60 * 60
            response.set_cookie('is_connected', '1', max_age=max_age, httponly=False, samesite='Lax')
            response.set_cookie('is_superuser', '1' if is_superuser else '0', max_age=max_age, httponly=False, samesite='Lax')
            response.set_cookie('username', username, max_age=max_age, httponly=False, samesite='Lax')
            return response
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=400)
    return JsonResponse({"error": "Invalid request"}, status=400)

    
@require_POST
def custom_logout(request):
    # Optional: Clear any custom session data
    request.session.flush()
    logout(request)
    response = HttpResponseRedirect('/')  # Redirect to home page by URL path
    # Clear all cookies
    cookie_names = list(request.COOKIES.keys())
    for cookie in cookie_names:
        response.delete_cookie(
            cookie,
            path='/',
            domain=getattr(settings, 'SESSION_COOKIE_DOMAIN', None)
        )
    # Prevent caching
    response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response

@csrf_exempt
@require_POST
def update_icon(request):
    try:
        user_id = request.session.get('_auth_user_id')
        if not user_id:
            return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)
        data = json.loads(request.body)
        icon_url = data.get('icon_url', '').strip()
        if not icon_url:
            return JsonResponse({'success': False, 'error': 'No icon URL provided'}, status=400)
        if len(icon_url) > 999:
            return JsonResponse({'success': False, 'error': 'Image link too long (max 999 characters).'}, status=400)
        with connection.cursor() as cursor:
            cursor.execute("UPDATE auth_user SET icon_url=%s WHERE id=%s", [icon_url, user_id])
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@csrf_exempt
@require_POST
def update_username(request):
    try:
        user_id = request.session.get('_auth_user_id')
        if not user_id:
            return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)

        data = json.loads(request.body)
        new_username = data.get('username', '').strip()

        if not new_username:
            return JsonResponse({'success': False, 'error': 'Username cannot be empty'}, status=400)

        if len(new_username) > 150:  # Max length from auth_user model
            return JsonResponse({'success': False, 'error': 'Username too long (max 150 characters).'}, status=400)

        # Check if the username already exists
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM auth_user WHERE username=%s AND id != %s", [new_username, user_id])
            if cursor.fetchone()[0] > 0:
                return JsonResponse({'success': False, 'error': 'Username already taken'}, status=400)

        # Update the username in the database
        with connection.cursor() as cursor:
            cursor.execute("UPDATE auth_user SET username=%s WHERE id=%s", [new_username, user_id])

        # Update the username cookie
        response = JsonResponse({'success': True, 'new_username': new_username})
        max_age = 30 * 24 * 60 * 60  # Keep consistent with login
        response.set_cookie('username', new_username, max_age=max_age, httponly=False, samesite='Lax')

        return response
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@csrf_exempt
@require_POST
def create_playlist(request):
    try:
        user_id = request.session.get('_auth_user_id')
        if not user_id:
            return
        data = json.loads(request.body)
        name = data.get('name', '').strip() or 'MyPlaylist'
        # --- Ensure owner_user_id matches the correct user table ---
        # If your playlists.owner_user_id references auth_user.id:
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO playlists (name, owner_user_id) VALUES (%s, %s)",
                [name, user_id]
            )
        return JsonResponse({'success': True})
    except Exception as e:
        # If you get a foreign key error, your playlists.owner_user_id is referencing users.user_id, not auth_user.id
        # You must either:
        # 1. Change the playlists table to reference auth_user(id)
        # 2. Or, insert a matching row into users for every auth_user
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@csrf_exempt
@require_POST
def update_playlist(request):
    try:
        user_id = request.session.get('_auth_user_id')
        if not user_id:
            return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)
        data = json.loads(request.body)
        playlist_id = data.get('playlist_id')  # <-- get playlist_id from request
        name = data.get('name', '').strip()
        cover = data.get('cover_image_url', '').strip()  # match JS key

        if not playlist_id:
            return JsonResponse({'success': False, 'error': 'Playlist ID required'}, status=400)
        if not name:
            return JsonResponse({'success': False, 'error': 'Playlist name required'}, status=400)

        # Only update the playlist that matches playlist_id and is owned by the user
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE playlists SET name=%s, cover_image_url=%s WHERE playlist_id=%s AND owner_user_id=%s",
                [name, cover, playlist_id, user_id]
            )
            if cursor.rowcount == 0:
                return JsonResponse({'success': False, 'error': 'Playlist not found or access denied'}, status=403)

        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

def playlist_detail_json(request, playlist_id):
    """
    API endpoint to return details of a specific playlist, including its tracks.
    """
    try:
        # Fetch the playlist using the Django ORM
        # Assuming 'tracks' is the related_name or default for the M2M field on Playlist model
        playlist = get_object_or_404(Playlist.objects.prefetch_related('tracks'), pk=playlist_id)

        # Optional: Check ownership if playlists are private
        # user_id = request.session.get('_auth_user_id')
        # if playlist.owner_user_id != user_id:
        #     return JsonResponse({'error': 'Forbidden'}, status=403)

        # Prepare playlist data
        playlist_data = {
            'playlist_id': playlist.playlist_id,
            'name': playlist.name,
            'cover_image_url': playlist.image_url_or_default, # Use property for fallback
            'owner_username': playlist.owner_user.username if playlist.owner_user else 'Unknown', # Get owner username
            'tracks': []
        }

        # Prepare track data using the ORM relationship
        for track in playlist.tracks.all():
            playlist_data['tracks'].append({
                'id': track.track_id,
                'title': track.title,
                'file_url': track.file_url,
                'image_url': track.image_url_or_default, # Use property for fallback
                'artist_name': track.all_artists, # Use property for combined artists
                'album_title': track.album.title if track.album else 'Unknown Album',
                # Add duration if available in your Track model/db
                # 'duration': format_duration(track.duration_seconds)
            })

        return JsonResponse(playlist_data)

    except Playlist.DoesNotExist:
         return JsonResponse({'error': 'Playlist not found'}, status=404)
    except Exception as e:
        # Log the error e
        print(f"Error fetching playlist {playlist_id}: {e}") # Basic logging
        return JsonResponse({'error': 'An error occurred'}, status=500)

def playlist_detail_json(request, playlist_id):
    # Fetch playlist info
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT playlist_id, name, cover_image_url, owner_user_id FROM playlists WHERE playlist_id=%s",
            [playlist_id]
        )
        row = cursor.fetchone()
        if not row:
            return JsonResponse({'error': 'Playlist not found'}, status=404)
        playlist = {
            'playlist_id': row[0],
            'name': row[1],
            'cover_image_url': row[2],
            'owner_user_id': row[3],
        }
    # Fetch owner username
    with connection.cursor() as cursor:
        cursor.execute("SELECT username FROM auth_user WHERE id=%s", [playlist['owner_user_id']])
        owner_row = cursor.fetchone()
        playlist['owner_username'] = owner_row[0] if owner_row else 'Unknown'

    # Fetch tracks in playlist
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT t.track_id, t.title, t.file_url, t.track_img_url, t.artist_name, t.album_id, a.title as album_title
            FROM playlisttracks pt
            JOIN tracks t ON pt.tracks = t.track_id
            LEFT JOIN albums a ON t.album_id = a.album_id
            WHERE pt.playlistid = %s
        """, [playlist_id])
        tracks = []
        for t in cursor.fetchall():
            tracks.append({
                'id': t[0], # Match the key expected by frontend ('track.id')
                'title': t[1],
                'file_url': t[2],
                'image_url': t[3],
                'artist_name': t[4],
                'album_id': t[5],
                'album_title': t[6],
            })
    playlist['tracks'] = tracks
    return JsonResponse(playlist)

@csrf_exempt
@require_POST
def add_track_to_playlist(request):
    try:
        user_id = request.session.get('_auth_user_id')
        if not user_id:
            return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)

        data = json.loads(request.body)
        playlist_id = data.get('playlist_id')
        track_id = data.get('track_id')

        # Verify playlist ownership
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT owner_user_id FROM playlists WHERE playlist_id=%s",
                [playlist_id]
            )
            row = cursor.fetchone()
            if not row or str(row[0]) != user_id:
                return JsonResponse({
                    'success': False, 
                    'error': 'Playlist not found or access denied'
                }, status=403)

            # Add track to playlist
            cursor.execute(
                "INSERT INTO playlisttracks (playlistid, tracks) VALUES (%s, %s)",
                [playlist_id, track_id]
            )

        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import connection

@csrf_exempt 
def search_tracks_json(request):
    if request.method == "GET":  # Changed from POST to GET
        try:
            # Get query from URL parameters instead of request body
            query = request.GET.get('query', '').strip()
            if len(query) < 2:
                return JsonResponse({'tracks': []})

            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT track_id, title, artist_name, file_url, track_img_url 
                    FROM tracks 
                    WHERE title LIKE %s OR artist_name LIKE %s
                    LIMIT 8
                """, [f'%{query}%', f'%{query}%'])
                
                tracks = []
                for row in cursor.fetchall():
                    tracks.append({
                        'id': row[0],
                        'title': row[1],
                        'artist': row[2],
                        'file_url': row[3],
                        'image_url': row[4]
                    })
                return JsonResponse({'tracks': tracks})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Invalid request'}, status=400)

def search_tracks(request):
    query = request.GET.get('q', '').strip()
    if len(query) < 2:
        return JsonResponse({'tracks': []})
        
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT track_id, title, artist_name, file_url, track_img_url
            FROM tracks 
            WHERE LOWER(title) LIKE LOWER(%s) OR LOWER(artist_name) LIKE LOWER(%s)
            LIMIT 10
        """, [f'%{query}%', f'%{query}%'])
        
        tracks = []
        for row in cursor.fetchall():
            tracks.append({
                'id': row[0],
                'title': row[1],
                'artist_name': row[2],
                'file_url': row[3],
                'image_url': row[4] or '/static/default-track.png'
            })
    
    return JsonResponse({'tracks': tracks})

@require_POST
def add_track_to_playlist(request):
    try:
        data = json.loads(request.body)
        playlist_id = data.get('playlist_id')
        track_id = data.get('track_id')
        
        if not playlist_id or not track_id:
            return JsonResponse({'success': False, 'error': 'Missing data'}, status=400)
            
        with connection.cursor() as cursor:
            # Insert into playlisttracks
            cursor.execute("""
                INSERT INTO playlisttracks (playlistid, tracks) 
                VALUES (%s, %s)
            """, [playlist_id, track_id])
            
        return JsonResponse({'success': True})
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

from .models import Friendship, BlockedUser, CustomUser # Add Friendship and BlockedUser

# --- Friendship and Blocking Views ---

@csrf_exempt
@require_POST
@login_required
def send_friend_request(request):
    try:
        user_id = request.session.get('_auth_user_id')
        if not user_id:
            return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)

        data = json.loads(request.body)
        target_userid = data.get('target_userid', '').strip()

        if not target_userid:
            return JsonResponse({'success': False, 'error': 'Target UserID required'}, status=400)

        with connection.cursor() as cursor:
            # Get current user's ID and target user's ID
            cursor.execute("SELECT id FROM auth_user WHERE userid=%s", [target_userid])
            target_user_row = cursor.fetchone()
            if not target_user_row:
                return JsonResponse({'success': False, 'error': 'Target user not found'}, status=404)
            target_user_id = target_user_row[0]

            if str(user_id) == str(target_user_id):
                 return JsonResponse({'success': False, 'error': 'Cannot send friend request to yourself'}, status=400)

            # Check if blocked by target
            cursor.execute("SELECT COUNT(*) FROM blocked_users WHERE blocker_id=%s AND blocked_id=%s", [target_user_id, user_id])
            if cursor.fetchone()[0] > 0:
                return JsonResponse({'success': False, 'error': 'Cannot send request, you are blocked by this user'}, status=403)

            # Check if target is blocked by sender
            cursor.execute("SELECT COUNT(*) FROM blocked_users WHERE blocker_id=%s AND blocked_id=%s", [user_id, target_user_id])
            if cursor.fetchone()[0] > 0:
                return JsonResponse({'success': False, 'error': 'Cannot send request, you have blocked this user'}, status=403)

            # Check if already friends (accepted status in either direction)
            cursor.execute("""
                SELECT COUNT(*) FROM friendships
                WHERE ((user1_id = %s AND user2_id = %s) OR (user1_id = %s AND user2_id = %s))
                AND status = 'accepted'
            """, [user_id, target_user_id, target_user_id, user_id])
            if cursor.fetchone()[0] > 0:
                return JsonResponse({'success': False, 'error': 'Already friends with this user'}, status=400)

            # Check if a pending request already exists (in either direction)
            cursor.execute("""
                SELECT COUNT(*) FROM friendships
                WHERE ((user1_id = %s AND user2_id = %s) OR (user1_id = %s AND user2_id = %s))
                AND status = 'pending'
            """, [user_id, target_user_id, target_user_id, user_id])
            if cursor.fetchone()[0] > 0:
                return JsonResponse({'success': False, 'error': 'Friend request already pending'}, status=400)

            # Create new friend request
            cursor.execute(
                "INSERT INTO friendships (user1_id, user2_id, status) VALUES (%s, %s, 'pending')",
                [user_id, target_user_id]
            )
        return JsonResponse({'success': True, 'message': 'Friend request sent'})

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@csrf_exempt
@require_POST
@login_required
def respond_friend_request(request):
    try:
        data = json.loads(request.body)
        user_id = request.session.get('_auth_user_id')
        request_id = data.get('request_id')
        action = data.get('action')  # 'accept' or 'reject'
        if not user_id or not request_id or action not in ['accept', 'reject']:
            return JsonResponse({'success': False, 'error': 'Invalid data'}, status=400)
        with connection.cursor() as cursor:
            # Check the friend request exists and is for this user
            cursor.execute(
                "SELECT sender_id FROM friend_requests WHERE id=%s AND recipient_id=%s",
                [request_id, user_id]
            )
            row = cursor.fetchone()
            if not row:
                return JsonResponse({'success': False, 'error': 'Request not found'}, status=404)
            sender_id = row[0]
            if action == 'accept':
                # Add to friendships table (if not already friends)
                cursor.execute("""
                    SELECT COUNT(*) FROM friendships
                    WHERE (user1_id=%s AND user2_id=%s) OR (user1_id=%s AND user2_id=%s)
                """, [user_id, sender_id, sender_id, user_id])
                if cursor.fetchone()[0] == 0:
                    cursor.execute(
                        "INSERT INTO friendships (user1_id, user2_id, status) VALUES (%s, %s, 'accepted')",
                        [user_id, sender_id]
                    )
            # Remove the friend request
            cursor.execute("DELETE FROM friend_requests WHERE id=%s", [request_id])
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@login_required
def get_pending_requests(request):
    user_id = request.session.get('_auth_user_id')
    if not user_id:
        return JsonResponse({'requests': []}) # Or return error

    pending_requests = []
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT f.friendship_id, u.username, u.userid, u.icon_url
            FROM friendships f
            JOIN auth_user u ON f.user1_id = u.id
            WHERE f.user2_id = %s AND f.status = 'pending'
        """, [user_id])
        for row in cursor.fetchall():
            pending_requests.append({
                'request_id': row[0],
                'sender_username': row[1],
                'sender_userid': row[2],
                'sender_icon_url': row[3]
            })
    return JsonResponse({'requests': pending_requests})

@login_required
def get_friends_list(request):
    try:
        user_id = request.session.get('_auth_user_id')
        if not user_id:
            return JsonResponse({'friends': [], 'error': 'Not authenticated'}, status=401)

        friends = []
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    CASE
                        WHEN f.user1_id = %s THEN f.user2_id
                        ELSE f.user1_id
                    END AS friend_id,
                    u.username,
                    u.userid,
                    u.icon_url,
                    u.listeningto,
                    u.last_login as last_seen
                FROM friendships f
                JOIN auth_user u ON u.id = CASE 
                    WHEN f.user1_id = %s THEN f.user2_id 
                    ELSE f.user1_id 
                END
                WHERE (f.user1_id = %s OR f.user2_id = %s) 
                AND f.status = 'accepted'
            """, [user_id, user_id, user_id, user_id])
            
            for row in cursor.fetchall():
                friends.append({
                    'friend_id': row[0],
                    'username': row[1],
                    'userid': row[2],
                    'icon_url': row[3] or '/static/home/assets/logo.png',
                    'listeningto': row[4] or None,
                    'last_seen': row[5].isoformat() if row[5] else None
                })
        return JsonResponse({'friends': friends})
    except Exception as e:
        return JsonResponse({'friends': [], 'error': str(e)}, status=500)

@csrf_exempt
@require_POST
@login_required
def block_user(request):
    try:
        user_id = request.session.get('_auth_user_id')
        if not user_id:
            return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)

        data = json.loads(request.body)
        target_userid = data.get('target_userid', '').strip()
        reason = data.get('reason', None) # Optional reason

        if not target_userid:
            return JsonResponse({'success': False, 'error': 'Target UserID required'}, status=400)

        with connection.cursor() as cursor:
            # Get target user's ID
            cursor.execute("SELECT id FROM auth_user WHERE userid=%s", [target_userid])
            target_user_row = cursor.fetchone()
            if not target_user_row:
                return JsonResponse({'success': False, 'error': 'Target user not found'}, status=404)
            target_user_id = target_user_row[0]

            if str(user_id) == str(target_user_id):
                 return JsonResponse({'success': False, 'error': 'Cannot block yourself'}, status=400)

            # Check if already blocked
            cursor.execute("SELECT COUNT(*) FROM blocked_users WHERE blocker_id=%s AND blocked_id=%s", [user_id, target_user_id])
            if cursor.fetchone()[0] > 0:
                return JsonResponse({'success': False, 'error': 'User already blocked'}, status=400)

            # Remove existing friendship (if any) - delete regardless of status
            cursor.execute("""
                DELETE FROM friendships
                WHERE (user1_id = %s AND user2_id = %s) OR (user1_id = %s AND user2_id = %s)
            """, [user_id, target_user_id, target_user_id, user_id])

            # Remove any pending friend requests between the users (both directions)
            cursor.execute("""
                DELETE FROM friend_requests
                WHERE (sender_id = %s AND recipient_id = %s)
                   OR (sender_id = %s AND recipient_id = %s)
            """, [user_id, target_user_id, target_user_id, user_id])

            # Add to blocked list
            cursor.execute(
                "INSERT INTO blocked_users (blocker_id, blocked_id, reason) VALUES (%s, %s, %s)",
                [user_id, target_user_id, reason]
            )

        return JsonResponse({'success': True, 'message': 'User blocked successfully'})

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@csrf_exempt
@require_POST
@login_required
def unblock_user(request):
    try:
        user_id = request.session.get('_auth_user_id')
        if not user_id:
            return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)

        data = json.loads(request.body)
        target_userid = data.get('target_userid', '').strip()

        if not target_userid:
            return JsonResponse({'success': False, 'error': 'Target UserID required'}, status=400)

        with connection.cursor() as cursor:
            # Get target user's ID
            cursor.execute("SELECT id FROM auth_user WHERE userid=%s", [target_userid])
            target_user_row = cursor.fetchone()
            if not target_user_row:
                # Still return success even if target doesn't exist, as the goal is achieved (they aren't blocked)
                return JsonResponse({'success': True, 'message': 'User unblocked (or was not found)'})
            target_user_id = target_user_row[0]

            # Delete the block record
            cursor.execute(
                "DELETE FROM blocked_users WHERE blocker_id=%s AND blocked_id=%s",
                [user_id, target_user_id]
            )
            deleted_count = cursor.rowcount

        if deleted_count > 0:
            return JsonResponse({'success': True, 'message': 'User unblocked successfully'})
        else:
            return JsonResponse({'success': True, 'message': 'User was not blocked'}) # Indicate they weren't blocked

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@login_required
def get_blocked_list(request):
    user_id = request.session.get('_auth_user_id')
    if not user_id:
        return JsonResponse({'blocked_users': []}) # Or return error

    blocked_users = []
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT b.block_id, u.username, u.userid, u.icon_url, b.reason, b.created_at
            FROM blocked_users b
            JOIN auth_user u ON b.blocked_id = u.id
            WHERE b.blocker_id = %s
        """, [user_id])
        for row in cursor.fetchall():
            blocked_users.append({
                'block_id': row[0],
                'username': row[1],
                'userid': row[2],
                'icon_url': row[3],
                'reason': row[4],
                'blocked_at': row[5] # Consider formatting
            })
    return JsonResponse({'blocked_users': blocked_users})

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.shortcuts import get_object_or_404

@csrf_exempt
@require_POST
def remove_track_from_playlist(request):
    try:
        data = json.loads(request.body)
        playlist_id = data.get('playlist_id')
        track_id = data.get('track_id')

        if not playlist_id or not track_id:
            return JsonResponse({'success': False, 'error': 'Invalid playlist or track ID'}, status=400)

        # Remove track from playlist
        with connection.cursor() as cursor:
            cursor.execute(
                "DELETE FROM playlisttracks WHERE playlistid=%s AND tracks=%s",
                [playlist_id, track_id]
            )

        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@csrf_exempt
def get_user_details(request):
    userid = request.GET.get('userid', '').strip()
    if not userid:
        return JsonResponse({'success': False, 'error': 'User ID is required.'})
    with connection.cursor() as cursor:
        cursor.execute("SELECT username, icon_url FROM auth_user WHERE userid=%s", [userid])
        row = cursor.fetchone()
        if row:
            return JsonResponse({'success': True, 'username': row[0], 'icon_url': row[1]})
    return JsonResponse({'success': False, 'error': 'User not found.'})

@csrf_exempt
@require_POST
def send_friend_request(request):
    try:
        data = json.loads(request.body)
        sender_id = request.session.get('_auth_user_id')
        recipient_userid = data.get('userid', '').strip()
        if not sender_id or not recipient_userid:
            return JsonResponse({'success': False, 'error': 'Invalid request.'})
        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM auth_user WHERE userid=%s", [recipient_userid])
            recipient_id = cursor.fetchone()
            if not recipient_id:
                return JsonResponse({'success': False, 'error': 'Recipient not found.'})
            cursor.execute(
                "INSERT INTO friend_requests (sender_id, recipient_id) VALUES (%s, %s)",
                [sender_id, recipient_id[0]]
            )
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
def accept_friend_request(request):
    try:
        data = json.loads(request.body)
        request_id = data.get('request_id')
        user_id = request.session.get('_auth_user_id')
        if not request_id or not user_id:
            return JsonResponse({'success': False, 'error': 'Invalid request.'})
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT sender_id FROM friend_requests WHERE id=%s AND recipient_id=%s",
                [request_id, user_id]
            )
            row = cursor.fetchone()
            if not row:
                return JsonResponse({'success': False, 'error': 'Friend request not found.'})
            sender_id = row[0]
            cursor.execute(
                "INSERT INTO friendships (user1_id, user2_id) VALUES (%s, %s)",
                [user_id, sender_id]
            )
            cursor.execute("DELETE FROM friend_requests WHERE id=%s", [request_id])
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
def get_notifications(request):
    user_id = request.session.get('_auth_user_id')
    if not user_id:
        return JsonResponse({'success': False, 'error': 'Not authenticated.'})
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT id, sender_id FROM friend_requests WHERE recipient_id=%s",
            [user_id]
        )
        requests = cursor.fetchall()
        notifications = []
        for req in requests:
            cursor.execute("SELECT username FROM auth_user WHERE id=%s", [req[1]])
            sender_username = cursor.fetchone()
            if sender_username:
                notifications.append({
                    'type': 'request',
                    'request_id': req[0],
                    'message': f"{sender_username[0]} sent you a friend request."
                })
    return JsonResponse({'success': True, 'notifications': notifications})

@csrf_exempt
def get_pending_requests(request):
    user_id = request.session.get('_auth_user_id')
    if not user_id:
        return JsonResponse({'requests': []})
    pending_requests = []
    with connection.cursor() as cursor:
        # Fetch friend requests where the current user is the recipient
        cursor.execute("""
            SELECT fr.id, u.username, u.userid, u.icon_url
            FROM friend_requests fr
            JOIN auth_user u ON fr.sender_id = u.id
            WHERE fr.recipient_id = %s
        """, [user_id])
        for row in cursor.fetchall():
            pending_requests.append({
                'request_id': row[0],
                'sender_username': row[1],
                'sender_userid': row[2],
                'sender_icon_url': row[3]
            })
    return JsonResponse({'requests': pending_requests})

from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

@csrf_exempt
@require_POST
def unfriend(request):
    try:
        user_id = request.session.get('_auth_user_id')
        if not user_id:
            return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)
        data = json.loads(request.body)
        target_userid = data.get('userid', '').strip()
        if not target_userid:
            return JsonResponse({'success': False, 'error': 'UserID required'}, status=400)
        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM auth_user WHERE userid=%s", [target_userid])
            row = cursor.fetchone()
            if not row:
                return JsonResponse({'success': False, 'error': 'User not found'}, status=404)
            target_id = row[0]
            # Remove friendship in either direction
            cursor.execute("""
                DELETE FROM friendships
                WHERE ((user1_id = %s AND user2_id = %s) OR (user1_id = %s AND user2_id = %s))
            """, [user_id, target_id, target_id, user_id])
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

from django.http import JsonResponse
from .models import Album, Track

def api_search(request):
    q = request.GET.get('q', '').strip()
    if not q:
        return JsonResponse({'success': True, 'albums': [], 'tracks': []})

    albums = list(Album.objects.filter(title__icontains=q).values('album_id', 'title', 'cover_image_url'))
    tracks = list(Track.objects.filter(title__icontains=q).values(
        'track_id', 'title', 'file_url', 'track_image_url', 'artist_name'
     ))
    
    # Map "track_image_url" to "image_url_or_default" for consistency in frontend display.
    for track in tracks:
        track['image_url_or_default'] = track.pop('track_image_url', '')

    for album in albums:
        first_track = Track.objects.filter(album_id=album['album_id']).first()
        album['first_track'] = {
            'file_url': first_track.file_url if first_track else '',
            'title': first_track.title if first_track else '',
            'artist_name': first_track.artist_name if first_track else '',
        } if first_track else None

    return JsonResponse({'success': True, 'albums': albums, 'tracks': tracks})
# View for rendering the artists page template
def artists_page(request):
    # Similar context setup as music_home might be needed if the template
    # relies on shared context variables (like user auth state, playlists etc.)
    # For simplicity, starting with minimal context. Add more as needed.
    user_id = request.session.get('_auth_user_id')
    is_authenticated = bool(user_id)
    is_superuser = False
    username = None
    listeningto = None
    userid = None
    user_icon_url = None
    user_playlists = []
    has_playlists = False
    if is_authenticated:
        with connection.cursor() as cursor:
            cursor.execute("SELECT is_superuser, username, listeningto, userid, icon_url FROM auth_user WHERE id=%s", [user_id])
            row = cursor.fetchone()
            if row:
                is_superuser, username, listeningto, userid, user_icon_url = bool(row[0]), row[1], row[2], row[3], row[4]
        # Fetch playlists for this user (copied from music_home)
        with connection.cursor() as cursor:
            cursor.execute("SELECT playlist_id, name, cover_image_url FROM playlists WHERE owner_user_id=%s", [user_id])
            user_playlists = cursor.fetchall()
            has_playlists = len(user_playlists) > 0

    context = {
        'user': username,
        'user_id': userid,
        'listeningto': listeningto,
        'is_authenticated': is_authenticated,
        'is_superuser': is_superuser,
        'user_icon_url': user_icon_url,
        'has_playlists': has_playlists,
        'user_playlists': user_playlists,
    }
    return render(request, 'artists.html', context)

# API view to return artist data as JSON
def artists_api(request):
    try:
        # Fetch all artists using the ORM
        artists = Artist.objects.all().values('artist_id', 'name', 'artist_image_url') # Select only needed fields
        return JsonResponse(list(artists), safe=False) # Convert QuerySet to list for JSON serialization
    except Exception as e:
        print(f"Error fetching artists API: {e}") # Basic logging
        return JsonResponse({'error': 'Could not fetch artists'}, status=500)

@login_required
def get_active_friends(request):
    try:
        user_id = request.session.get('_auth_user_id')
        if not user_id:
            return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)

        with connection.cursor() as cursor:
            # Get active friends (accepted friendships) with their current status
            cursor.execute("""
                SELECT u.id, u.username, u.icon_url, u.listeningto
                FROM auth_user u
                INNER JOIN friendships f ON (f.user1_id = u.id OR f.user2_id = u.id)
                WHERE f.status = 'accepted'
                AND (f.user1_id = %s OR f.user2_id = %s)
                AND u.id != %s
            """, [user_id, user_id, user_id])
            
            friends = []
            for row in cursor.fetchall():
                friends.append({
                    'id': row[0],
                    'username': row[1],
                    'icon_url': row[2] or '/static/home/assets/logo.png',
                    'listeningto': row[3] or 'Nothing'
                })

        return JsonResponse({
            'success': True,
            'friends': friends
        })

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@login_required
def get_all_artists(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT artist_id, name, bio, artist_image_url
                FROM artists
                ORDER BY name ASC
            """)
            
            artists = [
                {
                    'artist_id': row[0],
                    'name': row[1],
                    'bio': row[2],
                    'artist_image_url': row[3]
                }
                for row in cursor.fetchall()
            ]
            
        return JsonResponse({'success': True, 'artists': artists})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@csrf_exempt
@require_POST
def delete_playlist(request):
    try:
        # Check if user is authenticated
        user_id = request.session.get('_auth_user_id')
        if not user_id:
            return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)

        # Parse request data
        data = json.loads(request.body)
        playlist_id = data.get('playlist_id')
        
        if not playlist_id:
            return JsonResponse({'success': False, 'error': 'Missing playlist ID'}, status=400)

        # Delete playlist if user owns it
        with connection.cursor() as cursor:
            # First check ownership
            cursor.execute(
                "SELECT owner_user_id FROM playlists WHERE playlist_id = %s",
                [playlist_id]
            )
            result = cursor.fetchone()
            
            if not result:
                return JsonResponse({'success': False, 'error': 'Playlist not found'}, status=404)
            
            if str(result[0]) != str(user_id):
                return JsonResponse({'success': False, 'error': 'Not authorized to delete this playlist'}, status=403)
            
            # Delete the playlist
            cursor.execute(
                "DELETE FROM playlists WHERE playlist_id = %s AND owner_user_id = %s",
                [playlist_id, user_id]
            )

        return JsonResponse({'success': True})

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        print("Error deleting playlist:", str(e))
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def artist_detail_api(request, artist_id):
    try:
        with connection.cursor() as cursor:
            # Get artist details
            cursor.execute("""
                SELECT name, bio, artist_image_url, artist_image_url2 
                FROM artists 
                WHERE artist_id = %s
            """, [artist_id])
            artist_row = cursor.fetchone()
            
            if not artist_row:
                return JsonResponse({'success': False, 'error': 'Artist not found'}, status=404)
            
            # Get artist's tracks
            cursor.execute("""
                SELECT t.track_id, t.title, t.file_url, t.track_img_url, t.artist_name 
                FROM tracks t 
                WHERE t.artist_name = %s
                OR t.artist_name2 = %s 
                OR t.artist_name3 = %s
            """, [artist_row[0], artist_row[0], artist_row[0]])
            
            tracks = []
            for track in cursor.fetchall():
                tracks.append({
                    'id': track[0],
                    'title': track[1],
                    'file_url': track[2],
                    'image_url': track[3] or '/static/home/assets/default-track.jpg',
                    'artist_name': track[4]
                })
            
            artist_data = {
                'success': True,
                'artist': {
                    'name': artist_row[0],
                    'bio': artist_row[1],
                    'artist_image_url': artist_row[2],
                    'artist_image_url2': artist_row[3]
                },
                'tracks': tracks
            }
            
            return JsonResponse(artist_data)
            
    except Exception as e:
        print('Error fetching artist details:', e)
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.http import JsonResponse
from django.db import connection

@csrf_exempt
@require_POST 
def update_listening_to(request):
    try:
        user_id = request.session.get('_auth_user_id')
        if not user_id:
            return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=403)

        data = json.loads(request.body)
        listeningto = data.get('listeningto') # Changed from track_title
        
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE auth_user SET listeningto = %s WHERE id = %s",
                [listeningto, user_id]
            )
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse

@login_required
def add_friend(request):
    if request.method == "POST":
        # Your logic to add a friend
        # ...
        return JsonResponse({"status": "success"})
    return JsonResponse({"error": "Invalid request"}, status=400)

@csrf_exempt
@require_POST
def update_listening_status(request):
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)
    
    try:
        data = json.loads(request.body)
        track_title = data.get('track_title', '')
        status = data.get('listeningto_status', False)

        # Update both fields
        request.user.listeningto = track_title
        request.user.listeningto_status = status
        request.user.save()

        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def get_tracks(request):
    """API endpoint to fetch all tracks"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT track_id, title, artist_name, artist_name2, file_url, track_img_url 
                FROM tracks
            """)
            tracks = cursor.fetchall()
            
            tracks_data = [{
                'id': track[0],
                'title': track[1],
                'artist_name': track[2],
                'artist_name2': track[3],
                'file_url': track[4],
                'image_url': track[5] or '/static/home/assets/default-track.jpg',
                'genre': 'music'
            } for track in tracks]
            
            response = JsonResponse({
                'success': True,
                'tracks': tracks_data
            })
            
            # Add CORS headers
            response["Access-Control-Allow-Origin"] = "http://localhost:3000"
            response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type"
            
            return response
            
    except Exception as e:
        print(f"Error in get_tracks: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@csrf_exempt
def check_friend_request_exists(request):
    try:
        user_id = request.session.get('_auth_user_id')
        target_userid = request.GET.get('target_userid', '')
        
        if not user_id or not target_userid:
            return JsonResponse({'exists': False})
            
        with connection.cursor() as cursor:
            # Get target user ID
            cursor.execute("SELECT id FROM auth_user WHERE userid=%s", [target_userid])
            target_row = cursor.fetchone()
            if not target_row:
                return JsonResponse({'exists': False})
            target_id = target_row[0]
            
            # Check if a friend request already exists in either direction
            cursor.execute("""
                SELECT COUNT(*) FROM friendships
                WHERE ((user1_id = %s AND user2_id = %s) OR (user1_id = %s AND user2_id = %s))
                AND status = 'pending'
            """, [user_id, target_id, target_id, user_id])
            
            exists = cursor.fetchone()[0] > 0
            
        return JsonResponse({'exists': exists})
    except Exception as e:
        print(f"Error checking friend request: {e}")
        return JsonResponse({'exists': False})
