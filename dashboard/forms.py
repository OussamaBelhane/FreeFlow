from django import forms
from home.models import Track, Artist, Album

class TrackForm(forms.ModelForm):
    class Meta:
        model = Track
        fields = [
            'title',
            'file_url',
            'album',
            'track_image_url',
            'artist_name',
            'artist_name2',
            'artist_name3',
        ]
        widgets = {
            'title': forms.TextInput(attrs={'class': 'form-control'}),
            'file_url': forms.URLInput(attrs={'class': 'form-control'}),
            'album': forms.Select(attrs={'class': 'form-select'}),
            'track_image_url': forms.URLInput(attrs={'class': 'form-control'}),
            'artist_name': forms.TextInput(attrs={'class': 'form-control'}),
            'artist_name2': forms.TextInput(attrs={'class': 'form-control'}),
            'artist_name3': forms.TextInput(attrs={'class': 'form-control'}),
        }

class ArtistForm(forms.ModelForm):
    class Meta:
        model = Artist
        fields = ['name', 'bio', 'artist_image_url']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'bio': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'artist_image_url': forms.URLInput(attrs={'class': 'form-control'}),
        }

class AlbumForm(forms.ModelForm):
    class Meta:
        model = Album
        fields = ['title', 'cover_image_url', 'primary_artist']
        widgets = {
            'title': forms.TextInput(attrs={'class': 'form-control'}),
            'cover_image_url': forms.URLInput(attrs={'class': 'form-control'}),
            'primary_artist': forms.Select(attrs={'class': 'form-select'}),
        }