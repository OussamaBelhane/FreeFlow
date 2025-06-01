from django.urls import path
from . import views

urlpatterns = [
    path('', views.music_dashboard, name='dashboard'),  # Home page URL, points to music_home view
    # --- Track CRUD ---
    path('tracks/add/', views.add_track, name='add_track'),
    path('tracks/edit/<int:track_id>/', views.edit_track, name='edit_track'),
    path('tracks/delete/<int:track_id>/', views.delete_track, name='delete_track'),

    # --- Artist CRUD ---
    path('artists/add/', views.add_artist, name='add_artist'),
    path('artists/edit/<int:artist_id>/', views.edit_artist, name='edit_artist'),
    path('artists/delete/<int:artist_id>/', views.delete_artist, name='delete_artist'),

    # --- Album CRUD ---
    path('albums/add/', views.add_album, name='add_album'),
    path('albums/edit/<int:album_id>/', views.edit_album, name='edit_album'),
    path('albums/delete/<int:album_id>/', views.delete_album, name='delete_album'),
    path('clone-album/<int:album_id>/', views.clone_album_to_playlist, name='clone_album_to_playlist'),

    # Add similar patterns for users if needed
    path('users/<int:user_id>/toggle/', views.toggle_user_status, name='toggle_user_status'),
    path('users/<int:user_id>/delete/', views.delete_user, name='delete_user'),  # <-- restore this line
    path('users/<int:user_id>/toggle_admin/', views.toggle_admin_status, name='toggle_admin_status'),
]
