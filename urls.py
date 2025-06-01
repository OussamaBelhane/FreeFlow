from django.contrib import admin
from django.urls import path, include
from home import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('home.urls')),
    path('dashboard/', include('dashboard.urls')),  # Include dashboard URLs
    path('api/tracks/', views.get_tracks, name='get_tracks'),
]