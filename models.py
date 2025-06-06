# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class Albums(models.Model):
    album_id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)
    cover_image_url = models.CharField(max_length=512, blank=True, null=True)
    primary_artist = models.ForeignKey('Artists', models.DO_NOTHING, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'albums'


class Artists(models.Model):
    artist_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    bio = models.TextField(blank=True, null=True)
    artist_image_url = models.CharField(max_length=512, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'artists'


class AuthUser(models.Model):
    password = models.CharField(max_length=128)
    is_superuser = models.IntegerField()
    username = models.CharField(unique=True, max_length=150)
    email = models.CharField(max_length=254)
    is_active = models.IntegerField(blank=True, null=True)
    listeningto = models.ForeignKey('Tracks', models.DO_NOTHING, db_column='listeningto', to_field='title', blank=True, null=True)
    icon_url = models.CharField(max_length=999, blank=True, null=True)
    date_joined = models.DateTimeField(blank=True, null=True)
    userid = models.CharField(max_length=50)
    privacy_settings = models.JSONField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'auth_user'


class BlockedUsers(models.Model):
    block_id = models.AutoField(primary_key=True)
    blocker = models.ForeignKey(AuthUser, models.DO_NOTHING)
    blocked = models.ForeignKey(AuthUser, models.DO_NOTHING, related_name='blockedusers_blocked_set')
    created_at = models.DateTimeField()
    reason = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'blocked_users'
        unique_together = (('blocker', 'blocked'),)


class DjangoAdminLog(models.Model):
    action_time = models.DateTimeField()
    object_id = models.TextField(blank=True, null=True)
    object_repr = models.CharField(max_length=200)
    action_flag = models.PositiveSmallIntegerField()
    change_message = models.TextField()
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING, blank=True, null=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'django_admin_log'


class DjangoContentType(models.Model):
    app_label = models.CharField(max_length=100)
    model = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'django_content_type'
        unique_together = (('app_label', 'model'),)


class DjangoMigrations(models.Model):
    id = models.BigAutoField(primary_key=True)
    app = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    applied = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_migrations'


class DjangoSession(models.Model):
    session_key = models.CharField(primary_key=True, max_length=40)
    session_data = models.TextField()
    expire_date = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_session'


class FriendRequests(models.Model):
    sender = models.ForeignKey(AuthUser, models.DO_NOTHING)
    recipient = models.ForeignKey(AuthUser, models.DO_NOTHING, related_name='friendrequests_recipient_set')
    count = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'friend_requests'


class Friendships(models.Model):
    friendship_id = models.AutoField(primary_key=True)
    user1 = models.ForeignKey(AuthUser, models.DO_NOTHING)
    user2 = models.ForeignKey(AuthUser, models.DO_NOTHING, related_name='friendships_user2_set')
    status = models.CharField(max_length=8)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'friendships'
        unique_together = (('user1', 'user2'),)


class Playlists(models.Model):
    playlist_id = models.AutoField(primary_key=True)
    owner_user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    name = models.CharField(max_length=255, blank=True, null=True)
    cover_image_url = models.CharField(max_length=512, blank=True, null=True)
    albums = models.ForeignKey(Albums, models.DO_NOTHING, db_column='albums', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'playlists'


class Playlisttracks(models.Model):
    playlistid = models.ForeignKey(Playlists, models.DO_NOTHING, db_column='playlistid', blank=True, null=True)
    tracks = models.ForeignKey('Tracks', models.DO_NOTHING, db_column='tracks', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'playlisttracks'


class Tracks(models.Model):
    track_id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)
    album = models.ForeignKey(Albums, models.DO_NOTHING, blank=True, null=True)
    file_url = models.CharField(max_length=512, blank=True, null=True)
    track_img_url = models.CharField(max_length=512, blank=True, null=True)
    artist_name = models.ForeignKey(Artists, models.DO_NOTHING, db_column='artist_name', to_field='name')
    artist_name2 = models.ForeignKey(Artists, models.DO_NOTHING, db_column='artist_name2', to_field='name', related_name='tracks_artist_name2_set', blank=True, null=True)
    artist_name3 = models.ForeignKey(Artists, models.DO_NOTHING, db_column='artist_name3', to_field='name', related_name='tracks_artist_name3_set', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'tracks'
