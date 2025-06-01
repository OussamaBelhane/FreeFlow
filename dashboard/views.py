import json
from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.contrib import messages
from home.models import Track, Album, Artist, CustomUser  # Import CustomUser instead of User
from .forms import TrackForm, ArtistForm, AlbumForm
from django.db.models import Q
from django.db import IntegrityError
from urllib.parse import urlencode
from django.contrib.auth.decorators import user_passes_test, login_required
from django.contrib.auth.models import User  # Add this import
from django.db import connection

@login_required
@user_passes_test(lambda u: u.is_superuser)
def music_dashboard(request):
    # Fetch all data for CRUD tables
    tracks = Track.objects.all()
    albums = Album.objects.select_related('primary_artist').all()
    artists = Artist.objects.all()
    
    # Use raw SQL to get users without last_login field
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id, username, email, is_active, is_superuser, date_joined, icon_url 
            FROM auth_user 
            ORDER BY date_joined DESC
        """)
        columns = [col[0] for col in cursor.description]
        users = [
            dict(zip(columns, row))
            for row in cursor.fetchall()
        ]

    # Preprocess tracks to include a list of artist names
    for track in tracks:
        track.artist_ids = [
            track.artist_name,
            track.artist_name2,
            track.artist_name3
        ]
        # Remove None values and join artist names
        track.artist_ids = [name for name in track.artist_ids if name]

    # Pass data to the template
    context = {
        'tracks': tracks,
        'albums': albums,
        'artists': artists,
        'users': users,
        'user_count': len(users),
    }
    # Add forms to context for potential use in modals (initial load)
    context['track_form'] = TrackForm()
    context['artist_form'] = ArtistForm()
    context['album_form'] = AlbumForm()

    # Find all artist names used in tracks
    used_artist_names = set(
        Track.objects.values_list('artist_name', flat=True)
    )
    used_artist_names.update(
        Track.objects.exclude(artist_name2__isnull=True).exclude(artist_name2='').values_list('artist_name2', flat=True)
    )
    used_artist_names.update(
        Track.objects.exclude(artist_name3__isnull=True).exclude(artist_name3='').values_list('artist_name3', flat=True)
    )
    # Get artist IDs for those names
    used_artist_ids = set(
        Artist.objects.filter(name__in=used_artist_names).values_list('pk', flat=True)
    )
    context['used_artist_ids'] = used_artist_ids

    return render(request, 'dashboard.html', context)

# --- CRUD Views (Initial - Non-AJAX for now) ---
def redirect_with_section(section):
    return redirect(f'/dashboard/?section={section}')

# == TRACKS ==
def add_track(request):
    if request.method == 'POST':
        title = request.POST.get('title', '').strip()
        file_url = request.POST.get('file_url', '').strip() or None
        track_image_url = request.POST.get('track_image_url', '').strip() or None
        album_id = request.POST.get('album')
        primary_artist_id = request.POST.get('primary_artist')
        secondary_artist_ids = request.POST.getlist('secondary_artists')

        # Validation: title and primary artist are required
        if not title or not primary_artist_id:
            messages.error(request, 'Title and primary artist are required.')
            return redirect_with_section('tracks-section')

        # Album can be null
        album = None
        if album_id:
            try:
                album = Album.objects.get(pk=album_id)
            except Album.DoesNotExist:
                album = None

        # Primary artist name (required)
        try:
            primary_artist = Artist.objects.get(pk=primary_artist_id)
            artist_name = primary_artist.name
        except Artist.DoesNotExist:
            messages.error(request, 'Primary artist not found.')
            return redirect_with_section('tracks-section')

        # Secondary artist names (optional)
        artist_name2 = None
        artist_name3 = None
        if secondary_artist_ids:
            try:
                if len(secondary_artist_ids) > 0:
                    artist_name2 = Artist.objects.get(pk=secondary_artist_ids[0]).name
                if len(secondary_artist_ids) > 1:
                    artist_name3 = Artist.objects.get(pk=secondary_artist_ids[1]).name
            except Artist.DoesNotExist:
                pass

        # Create and save the Track
        track = Track(
            title=title,
            file_url=file_url,
            track_image_url=track_image_url,
            album=album,
            artist_name=artist_name,
            artist_name2=artist_name2,
            artist_name3=artist_name3
        )
        track.save()
        messages.success(request, 'Track added successfully!')
        return redirect_with_section('tracks-section')
    return redirect_with_section('tracks-section')

def edit_track(request, track_id):
    track = get_object_or_404(Track, pk=track_id)
    if request.method == 'POST':
        title = request.POST.get('title', '').strip()
        file_url = request.POST.get('file_url', '').strip() or None
        track_image_url = request.POST.get('track_image_url', '').strip() or None
        album_id = request.POST.get('album')
        primary_artist_id = request.POST.get('primary_artist')
        secondary_artist_ids = request.POST.getlist('secondary_artists')

        if not title or not primary_artist_id:
            messages.error(request, 'Title and primary artist are required.')
            return redirect_with_section('tracks-section')

        album = None
        if album_id:
            try:
                album = Album.objects.get(pk=album_id)
            except Album.DoesNotExist:
                album = None

        try:
            primary_artist = Artist.objects.get(pk=primary_artist_id)
            artist_name = primary_artist.name
        except Artist.DoesNotExist:
            messages.error(request, 'Primary artist not found.')
            return redirect_with_section('tracks-section')

        artist_name2 = None
        artist_name3 = None
        if secondary_artist_ids:
            try:
                if len(secondary_artist_ids) > 0:
                    artist_name2 = Artist.objects.get(pk=secondary_artist_ids[0]).name
                if len(secondary_artist_ids) > 1:
                    artist_name3 = Artist.objects.get(pk=secondary_artist_ids[1]).name
            except Artist.DoesNotExist:
                pass

        # Update fields
        track.title = title
        track.file_url = file_url
        track.track_image_url = track_image_url
        track.album = album
        track.artist_name = artist_name
        track.artist_name2 = artist_name2
        track.artist_name3 = artist_name3
        track.save()
        messages.success(request, 'Track updated successfully!')
        return redirect_with_section('tracks-section')
    return redirect_with_section('tracks-section')

@require_POST # Ensure only POST requests
def delete_track(request, track_id):
    track = get_object_or_404(Track, pk=track_id)
    track.delete()
    messages.success(request, 'Track deleted successfully!')
    return redirect('dashboard')

# == ARTISTS ==
def add_artist(request):
    if request.method == 'POST':
        form = ArtistForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'Artist added successfully!')
            return redirect_with_section('artists-section')
        else:
            messages.error(request, 'Error adding artist.')
            return redirect_with_section('artists-section')
    return redirect_with_section('artists-section')

def edit_artist(request, artist_id):
    artist = get_object_or_404(Artist, pk=artist_id)
    if request.method == 'POST':
        form = ArtistForm(request.POST, instance=artist)
        if form.is_valid():
            try:
                form.save()
                messages.success(request, 'Artist updated successfully!')
            except IntegrityError:
                messages.error(request, 'Cannot update artist name: it is referenced by one or more tracks. Please update or remove those tracks first.')
            return redirect_with_section('artists-section')
        else:
            messages.error(request, 'Error updating artist.')
            return redirect_with_section('artists-section')
    return redirect_with_section('artists-section')

@require_POST
def delete_artist(request, artist_id):
    artist = get_object_or_404(Artist, pk=artist_id)
    artist.delete()
    messages.success(request, 'Artist deleted successfully!')
    return redirect('dashboard')

# == ALBUMS ==
def add_album(request):
    if request.method == 'POST':
        form = AlbumForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'Album added successfully!')
            return redirect_with_section('albums-section')
        else:
            messages.error(request, 'Error adding album.')
            return redirect_with_section('albums-section')
    return redirect_with_section('albums-section')

def edit_album(request, album_id):
    album = get_object_or_404(Album, pk=album_id)
    if request.method == 'POST':
        form = AlbumForm(request.POST, instance=album)
        if form.is_valid():
            form.save()
            messages.success(request, 'Album updated successfully!')
            return redirect_with_section('albums-section')
        else:
            messages.error(request, 'Error updating album.')
            return redirect_with_section('albums-section')
    return redirect_with_section('albums-section')

@require_POST
def delete_album(request, album_id):
    album = get_object_or_404(Album, pk=album_id)
    album.delete()
    messages.success(request, 'Album deleted successfully!')
    return redirect('dashboard')

@require_POST
def clone_album_to_playlist(request, album_id):
    album = get_object_or_404(Album, pk=album_id)
    
    # Create new playlist
    playlist = Playlists.objects.create(
        owner_user_id=request.user.id,
        name=f"{album.title} (Clone)",
        cover_image_url=album.cover_image_url,
        albums=album
    )
    
    # Get all tracks from the album
    album_tracks = Track.objects.filter(album_id=album_id)
    
    # Create playlist tracks
    for track in album_tracks:
        Playlisttracks.objects.create(
            playlistid=playlist,
            tracks=track
        )
    
    messages.success(request, f'Album "{album.title}" has been cloned to playlist successfully!')
    return redirect('dashboard')

@user_passes_test(lambda u: u.is_superuser)
def toggle_user_status(request, user_id):
    user = get_object_or_404(CustomUser, pk=user_id)  # Use CustomUser here too
    if not user.is_superuser or request.user.is_superuser:
        user.is_active = not user.is_active
        user.save()
        messages.success(request, f'User {user.username} {"activated" if user.is_active else "deactivated"} successfully.')
    return redirect('dashboard')

@user_passes_test(lambda u: u.is_superuser)
@require_POST
def toggle_admin_status(request, user_id):
    user = get_object_or_404(CustomUser, pk=user_id)
    if user == request.user:
        messages.error(request, "You cannot change your own admin status.")
        return redirect('dashboard')
    user.is_superuser = not user.is_superuser
    user.save()
    if user.is_superuser:
        messages.success(request, f'User {user.username} is now an admin.')
    else:
        messages.success(request, f'User {user.username} is no longer an admin.')
    return redirect('dashboard')

@require_POST
def delete_user(request, user_id):
    # Avoid ORM to prevent selecting all fields (including last_login)
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM auth_user WHERE id = %s", [user_id])
    messages.success(request, f'User has been deleted successfully.')
    return redirect('dashboard')
