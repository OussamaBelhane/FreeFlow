from django.urls import path
from django.views.generic import RedirectView
from . import views as home_views  # Alias home views to avoid name conflict
from dashboard import views as dashboard_views # Import dashboard views
from . import views

urlpatterns = [
    path('', home_views.music_home, name='home'),  # Home page URL (renders index.html)
    # URL for direct access to an album page (renders index.html with context)
    path('album/<int:album_id>/', home_views.music_home, name='album_page'),
    # URL for direct access to a playlist page (renders index.html with context)
    path('playlist/<int:playlist_id>/', home_views.music_home, name='playlist_page'),
    # URL for fetching album data as JSON (for AJAX)
    path('api/album/<int:album_id>/', home_views.album_detail_json, name='album_detail_json'),
    path('api/check_email/', views.check_email, name='check_email'),
    path('api/signup/', views.signup_user, name='signup_user'),
    path('api/login/', views.login_user, name='login_user'),
    path('api/update_icon/', views.update_icon, name='update_icon'),  # Added endpoint
    path('api/update_username/', views.update_username, name='update_username'), # Add username update URL
    path('api/create_playlist/', views.create_playlist, name='create_playlist'),
    path('api/update_playlist/', views.update_playlist, name='update_playlist'),
    path('api/playlist/<int:playlist_id>/', views.playlist_detail_json, name='playlist_detail_json'), # Added playlist detail API URL
    path('api/search_tracks/', views.search_tracks_json, name='search_tracks_json'),
    path('api/add_track_to_playlist/', views.add_track_to_playlist, name='add_track_to_playlist'),
    path('api/search/tracks/', views.search_tracks, name='search_tracks'),
    path('api/remove_track_from_playlist/', views.remove_track_from_playlist, name='remove_track_from_playlist'),
    path('api/delete_playlist/', views.delete_playlist, name='delete_playlist'),
    path('logout/', views.custom_logout, name='logout'),

    # Friendship URLs
    path('api/friends/send_request/', views.send_friend_request, name='send_friend_request'),
    path('api/friends/respond/', views.respond_friend_request, name='respond_friend_request'),
    path('api/friends/pending/', views.get_pending_requests, name='get_pending_requests'),
    path('api/friends/list/', views.get_friends_list, name='get_friends_list'),
    path('api/friends/active/', views.get_active_friends, name='get_active_friends'),

    # Blocking URLs
    path('api/block/', views.block_user, name='block_user'),
    path('api/unblock/', views.unblock_user, name='unblock_user'),
    path('api/blocked/list/', views.get_blocked_list, name='get_blocked_list'),

    # Additional friend endpoints
    path('api/get_user_details/', views.get_user_details, name='get_user_details'),
    path('api/send_friend_request/', views.send_friend_request, name='send_friend_request'),
    path('api/get_notifications/', views.get_notifications, name='get_notifications'),
    path('api/get_pending_requests/', views.get_pending_requests, name='get_pending_requests'),
    path('api/respond_friend_request/', views.respond_friend_request, name='respond_friend_request'),
    path('api/get_friends_list/', views.get_friends_list, name='get_friends_list'),
    path('api/unfriend/', views.unfriend, name='unfriend'),  # Add this line
    path('api/check_friend_request_exists/', views.check_friend_request_exists, name='check_friend_request_exists'),
    path('api/search/', views.api_search, name='api_search'),
    path('api/artists/', views.get_all_artists, name='get_all_artists'),
    # Redirect /artists/ to home page
    path('artists/', RedirectView.as_view(url='/'), name='artists_page'),
    path('api/artists/', views.artists_api, name='artists_api'), 
    path('api/artist/<int:artist_id>/', views.artist_detail_api, name='artist_detail_api'),  # Add this line
    path('artists/', views.artists_page, name='artists_page'),
    path('api/update_listening_to/', views.update_listening_to, name='update_listening_to'),
    path('api/update_listening_status/', views.update_listening_status, name='update_listening_status'),
    path('api/tracks/', views.get_tracks, name='get_tracks'),
]
