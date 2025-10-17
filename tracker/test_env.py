
echo "# test_env.py
import os
import django
from pathlib import Path
from dotenv import load_dotenv


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
print('DATABASES:', list(settings.DATABASES.keys()))
print('DB_NAME:', os.getenv('DB_NAME'))
print('DB_USER:', os.getenv('DB_USER'))" > test_env.py