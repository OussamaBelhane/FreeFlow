from django.db import models
from django.templatetags.static import static # Needed for default image path
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin

class Artist(models.Model):
    artist_id = models.AutoField(primary_key=True) # Explicit PK matching artist_id column
    name = models.CharField(max_length=255)
    bio = models.TextField(null=True, blank=True)
    artist_image_url = models.CharField(max_length=512, null=True, blank=True) # Assumes column name matches

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'artists'
        managed = False # Tell Django not to manage this table

class Album(models.Model):
    album_id = models.AutoField(primary_key=True) # Explicit PK matching album_id column
    title = models.CharField(max_length=255)
    cover_image_url = models.CharField(max_length=512, null=True, blank=True) # Assumes column name matches
    primary_artist = models.ForeignKey(
        Artist,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='albums',
        db_column='primary_artist_id' # Explicit FK column name
    )

    def __str__(self):
        return self.title

    # Helper property for a guaranteed image URL (with fallback)
    @property
    def image_url_or_default(self):
        if self.cover_image_url:
            return self.cover_image_url
        # Return path to a default static image
        return static('home/assets/album.jpg') # Default image if none set

    class Meta:
        db_table = 'albums'
        managed = False # Tell Django not to manage this table

class Track(models.Model):
    track_id = models.AutoField(primary_key=True) # Explicit PK matching track_id column
    title = models.CharField(max_length=255)
    file_url = models.CharField(max_length=512) # Assumes column name matches
    album = models.ForeignKey(
        Album,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tracks',
        db_column='album_id' # Explicit FK column name
    )
    # Explicitly map model field to db column name
    track_image_url = models.CharField(max_length=512, null=True, blank=True, db_column='track_img_url')
    artist_name = models.CharField(max_length=255, db_column='artist_name')  # Primary artist
    artist_name2 = models.CharField(max_length=255, null=True, blank=True, db_column='artist_name2')  # Secondary artist
    artist_name3 = models.CharField(max_length=50, null=True, blank=True, db_column='artist_name3')  # Tertiary artist

    def __str__(self):
        return self.title

    # Helper to get the best available image URL
    @property
    def image_url_or_default(self):
         if self.track_image_url:
             return self.track_image_url
         # Fallback to album image if track image doesn't exist
         if self.album:
             return self.album.image_url_or_default
         # Final fallback to a generic static image
         return static('home/assets/album.jpg')

    @property
    def all_artists(self):
        """Return a list of all artists for the track."""
        artists = [self.artist_name]
        if self.artist_name2:
            artists.append(self.artist_name2)
        if self.artist_name3:
            artists.append(self.artist_name3)
        return ", ".join(artists)

    class Meta:
        db_table = 'tracks'
        managed = False # Tell Django not to manage this table

class Playlist(models.Model):
    playlist_id = models.AutoField(primary_key=True)
    owner_user = models.ForeignKey(
        'CustomUser', # Use string reference if CustomUser is defined later
        on_delete=models.CASCADE,
        db_column='owner_user_id'
    )
    name = models.CharField(max_length=255, null=True, blank=True) # Allow null based on SQL
    cover_image_url = models.CharField(max_length=512, null=True, blank=True)
    tracks = models.ManyToManyField(
        'Track',
        through='PlaylistTrack',  # Explicitly use the correct through model
        related_name='playlists'
    )

    def __str__(self):
        return self.name or f"Playlist {self.playlist_id}"

    @property
    def image_url_or_default(self):
        if self.cover_image_url:
            return self.cover_image_url
        # Return path to a default static image (adjust path if needed)
        return static('home/assets/music-note.bbffeaba.png') # Default playlist icon

    class Meta:
        db_table = 'playlists'
        managed = False # Tell Django not to manage this table

class PlaylistTrack(models.Model):
    id = models.AutoField(primary_key=True)
    playlist = models.ForeignKey(Playlist, on_delete=models.CASCADE, db_column='playlistid')
    track = models.ForeignKey('Track', on_delete=models.CASCADE, db_column='tracks')

    class Meta:
        db_table = 'playlisttracks'
        managed = False
        unique_together = ('playlist', 'track')

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models

class CustomUserManager(BaseUserManager):
    def create_user(self, username, email, password=None, **extra_fields):
        if not username:
            raise ValueError('Username is required')
        user = self.model(username=username, email=email, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        return self.create_user(username, email, password, **extra_fields)

class CustomUser(AbstractBaseUser, PermissionsMixin):
    password = models.CharField(max_length=128)
    username = models.CharField(unique=True, max_length=150)
    email = models.CharField(max_length=254)
    is_active = models.BooleanField(null=True, default=True)
    is_superuser = models.BooleanField(default=False)
    icon_url = models.CharField(max_length=999, blank=True, default='')
    date_joined = models.DateTimeField(blank=True, null=True)
    userid = models.CharField(max_length=50)
    privacy_settings = models.JSONField(blank=True, null=True)
    listeningto = models.CharField(max_length=254, blank=True, null=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'username'
    EMAIL_FIELD = 'email'
    REQUIRED_FIELDS = ['email']

    @property
    def is_staff(self):
        return self.is_superuser

    class Meta:
        managed = False
        db_table = 'auth_user'

# --- Friendship and Blocking Models ---

class Friendship(models.Model):
    friendship_id = models.AutoField(primary_key=True)
    user1 = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='friendship_requests_sent',
        db_column='user1_id'
    )
    user2 = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='friendship_requests_received',
        db_column='user2_id'
    )
    status = models.CharField(
        max_length=10,
        choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('rejected', 'Rejected')],
        default='pending'
    )
    created_at = models.DateTimeField(auto_now_add=True) # Use auto_now_add for creation timestamp
    updated_at = models.DateTimeField(auto_now=True) # Use auto_now for update timestamp

    class Meta:
        db_table = 'friendships'
        managed = False # Tell Django not to manage this table
        unique_together = ('user1', 'user2') # Ensure unique constraint

    def __str__(self):
        return f"{self.user1.username} -> {self.user2.username} ({self.status})"

class BlockedUser(models.Model):
    block_id = models.AutoField(primary_key=True)
    blocker = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='blocking', # Users this user is blocking
        db_column='blocker_id'
    )
    blocked = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='blocked_by', # Users who have blocked this user
        db_column='blocked_id'
    )
    created_at = models.DateTimeField(auto_now_add=True) # Use auto_now_add
    reason = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = 'blocked_users'
        managed = False # Tell Django not to manage this table
        unique_together = ('blocker', 'blocked') # Ensure unique constraint

    def __str__(self):
        return f"{self.blocker.username} blocked {self.blocked.username}"
