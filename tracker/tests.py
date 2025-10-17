# test_env.py
import os
import django
from pathlib import Path
from dotenv import load_dotenv

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# Ahora probar
from django.conf import settings
print("DATABASES:", list(settings.DATABASES.keys()))