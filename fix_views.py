#!/usr/bin/env python

with open('home/views.py', 'r') as f:
    lines = f.readlines()

# Fix line 199 (login_user function)
if 'django_login(request' in lines[198] and 'if user:' in lines[197]:
    lines[198] = '                    django_login(request, user, backend=\'django.contrib.auth.backends.ModelBackend\')\n'

# Fix line 251-252 (signup_user function)
if 'user = User.objects.filter(username=username).first()' in lines[249] and 'if user:' in lines[250]:
    lines[251] = '                    login(request, user)\n'
    lines[252] = '                    request.session.set_expiry(30 * 24 * 60 * 60)  # 30 days\n'

with open('home/views.py', 'w') as f:
    f.writelines(lines)

print("Fixed indentation issues in views.py") 