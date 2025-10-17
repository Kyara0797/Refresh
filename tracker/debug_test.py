# debug_test.py
import os
from pathlib import Path
from dotenv import load_dotenv

# Cargar .env manualmente
env_path = Path('.').resolve() / '.env'
print(f"Buscando .env en: {env_path}")
print(f"¿Existe?: {env_path.exists()}")

if env_path.exists():
    load_dotenv(dotenv_path=env_path)
    print("✓ .env cargado")
    print(f"DB_NAME: {os.getenv('DB_NAME')}")
    print(f"DB_USER: {os.getenv('DB_USER')}")
    print(f"DB_PASSWORD: {'SET' if os.getenv('DB_PASSWORD') else 'NOT SET'}")
else:
    print("✗ .env no encontrado")