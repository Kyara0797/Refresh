# tracker/context_processors.py
from django.urls import resolve
from .models import Category

def global_ui(request):
    try:
        url_name = resolve(request.path_info).url_name or ""
    except Exception:
        url_name = ""
    nav_categories = []
    try:
        nav_categories = Category.objects.all().order_by("name")
    except Exception:
        pass
    return {"url_name": url_name, "nav_categories": nav_categories}

# === Alias compatible con settings antiguos ===
def navbar_categories(request):
    """
    Deja disponible `nav_categories` (y también `url_name` por conveniencia)
    para compatibilidad con settings/templates que usaban este nombre.
    """
    ctx = global_ui(request)
    return {"nav_categories": ctx.get("nav_categories", []), "url_name": ctx.get("url_name", "")}
