# ...existing code...

# CORS settings
CORS_ORIGIN_ALLOW_ALL = True
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Add corsheaders to INSTALLED_APPS
INSTALLED_APPS += ['corsheaders']

# Add corsheaders middleware
MIDDLEWARE.insert(2, 'corsheaders.middleware.CorsMiddleware')

# ...existing code...