"""
tracker/views.py

This version includes SharePoint-ready behaviors:
- NEW: Signed download tokens that redirect to storage/link (no database token fields required).
- NEW: Physical move of files between Active/Inactive on archive/restore when storage backend supports it
       (e.g., our SharePoint storage implements `move_between_state`).
- NEW: Bundled sources show a secure download URL using tokens.

All NEW/UPDATED lines are marked with `# NEW:` comments in English.
"""
from django.db.models import Count
from django.db.models.functions import Coalesce
from django.db import transaction
from django.db.models import Q, Case, When, IntegerField
from django.contrib import messages
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth import login, logout
from django.urls import reverse, reverse_lazy
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
from django.views.generic import UpdateView, DeleteView, DetailView
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.conf import settings
from django.http import JsonResponse, HttpResponseRedirect, Http404
from collections import OrderedDict


from .models import (
    Category, Theme, Event, Source, UserAccessLog, SourceFileVersion,
    LINE_OF_BUSINESS_CHOICES,
    RISK_TAXONOMY_LV1, RISK_TAXONOMY_LV2, RISK_TAXONOMY_LV3,
    PHASE_STATUS_CHOICES,
    ONSET_TIMELINE_CHOICES,
)
from .forms import ThemeForm, EventForm, SourceForm, RegisterForm

import json
import os
from urllib.parse import urlparse
from datetime import date
import uuid
import logging

from django.core import signing  # NEW: signed tokens (no migrations needed)
from django.core.files.base import File

from .models import TempUpload
from django.core.files.storage import default_storage   # NEW: used for move_between_state
from django.http.response import HttpResponse, HttpResponseNotAllowed
from django.template.loader import render_to_string
from tracker.models import RISK_COLORS, RISK_CHOICES
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from pip._vendor.rich import theme


# Logger for simple audit trail
logger = logging.getLogger(__name__)


def is_admin(user):
    return user.is_authenticated and (user.is_staff or user.is_superuser)


admin_required = user_passes_test(is_admin)


class AdminRequiredMixin(LoginRequiredMixin, UserPassesTestMixin):
    def test_func(self):
        return is_admin(self.request.user)


# Allowed extensions for uploads
ALLOWED_FILE_EXTS = {".pdf", ".doc", ".docx", ".eml", ".msg"}


# =========================================================
# Helpers
# =========================================================

def _taxonomy_label_lists(event: Event):
    lv1_map = dict(RISK_TAXONOMY_LV1)
    lv2_map = {val: label for items in RISK_TAXONOMY_LV2.values() for val, label in items}
    lv3_map = {val: label for items in RISK_TAXONOMY_LV3.values() for val, label in items}

    lv1_labels = [lv1_map.get(v, v) for v in (event.risk_taxonomy_lv1 or [])]
    lv2_labels = [lv2_map.get(v, v) for v in (event.risk_taxonomy_lv2 or [])]
    lv3_labels = [lv3_map.get(v, v) for v in (event.risk_taxonomy_lv3 or [])]
    return lv1_labels, lv2_labels, lv3_labels


def _resolve_theme_from_request(request, theme_id=None, theme_pk=None):
    candidates = [
        theme_id, theme_pk,
        request.GET.get("theme_id"),
        request.GET.get("theme_pk"),
        request.GET.get("theme"),
    ]
    for val in candidates:
        if val:
            try:
                return get_object_or_404(Theme, pk=int(val))
            except (ValueError, TypeError):
                continue
    return None


def _prefill_event_initial(request, theme: Theme | None):
    initial = {
        "theme": theme.pk if theme else None,
        "risk_rating": request.GET.get("risk_rating") or request.GET.get("risk") or "low",
    }
    if request.GET.get("name"):
        initial["name"] = request.GET.get("name")
    if request.GET.get("date_identified") or request.GET.get("date"):
        initial["date_identified"] = request.GET.get("date_identified") or request.GET.get("date")
    return initial


def build_taxonomy_json(selected_lv1=None, selected_lv2=None, selected_lv3=None):
    sel_lv1 = set(selected_lv1 or [])
    sel_lv2 = set(selected_lv2 or [])
    sel_lv3 = set(selected_lv3 or [])

    hierarchical = []
    for lv1_key, lv1_label in RISK_TAXONOMY_LV1:
        lv1_node = {"key": lv1_key, "label": lv1_label, "selected": lv1_key in sel_lv1, "children": []}
        for lv2_key, lv2_label in RISK_TAXONOMY_LV2.get(lv1_key, []):
            lv2_node = {"key": lv2_key, "label": lv2_label, "selected": lv2_key in sel_lv2, "children": []}
            for lv3_key, lv3_label in RISK_TAXONOMY_LV3.get(lv2_key, []):
                lv2_node["children"].append({
                    "key": lv3_key, "label": lv3_label, "selected": lv3_key in sel_lv3
                })
            lv1_node["children"].append(lv2_node)
        hierarchical.append(lv1_node)

    return {
        "flat": {"lv1": RISK_TAXONOMY_LV1, "lv2": RISK_TAXONOMY_LV2, "lv3": RISK_TAXONOMY_LV3},
        "hierarchical": hierarchical,
    }


def _selected_lists_from_event_or_initial(event: Event | None, form_initial: dict):
    lv1 = (form_initial.get("risk_taxonomy_lv1") or (getattr(event, "risk_taxonomy_lv1", None) or []))
    lv2 = (form_initial.get("risk_taxonomy_lv2") or (getattr(event, "risk_taxonomy_lv2", None) or []))
    lv3 = (form_initial.get("risk_taxonomy_lv3") or (getattr(event, "risk_taxonomy_lv3", None) or []))
    return lv1, lv2, lv3


def _valid_link(v: str) -> bool:
    v = (v or "").strip()
    if not v:
        return False
    if v.startswith("mailto:"):
        return "@" in v[7:]
    p = urlparse(v)
    return p.scheme in ("http", "https") and bool(p.netloc)


def _bundle_filter_dict(src: Source) -> dict:
    return dict(
        event=src.event,
        name=src.name,
        summary=src.summary,
        source_date=src.source_date,
    )


def _bundle_strict_filter(src: Source) -> dict:
    return {
        "event": src.event,
        "name": src.name,
        "summary": src.summary,
        "source_date": src.source_date,
    }


def _bundle_qs_strict(src: Source):
    return Source.objects.filter(**_bundle_strict_filter(src)).order_by("-is_active", "id")


def _leaders_only(queryset):
    leaders = {}
    for s in queryset.order_by("id"):
        key = (s.event_id, s.name or "", s.summary or "", str(s.source_date or ""))
        if key not in leaders:
            leaders[key] = s.id
    return queryset.filter(id__in=list(leaders.values()))


def build_source_bundles(event: Event, show_archived: bool, filter_type: str | None):
    qs = event.sources.all().order_by("id")
    if not show_archived:
        qs = qs.filter(is_active=True)

    groups: dict[tuple, dict] = {}
    for s in qs:
        key = _bundle_key(s)
        bucket = groups.get(key)
        if not bucket:
            bucket = {"leader": s, "links": 0, "files": 0, "any_active": False}
            groups[key] = bucket
        if s.id < bucket["leader"].id:
            bucket["leader"] = s
        bucket["any_active"] = bucket["any_active"] or bool(s.is_active)
        if s.link_or_file:
            bucket["links"] += 1
        if s.file_upload:
            bucket["files"] += 1

    bundles = []
    for b in groups.values():
        if b["links"] and b["files"]:
            b["display_type"] = "MIXED"
        elif b["links"]:
            b["display_type"] = "LINK"
        elif b["files"]:
            b["display_type"] = "FILE"
        else:
            b["display_type"] = "LINK"

        if filter_type and filter_type != b["display_type"]:
            continue
        bundles.append(b)

    bundles.sort(key=lambda d: ((d["leader"].name or "").lower()))
    return bundles


def _ext_ok(uploaded_file):
    ext = os.path.splitext(uploaded_file.name)[1].lower()
    return ext in ALLOWED_FILE_EXTS


def _collect_extra_files(request) -> list:
    files = []
    for key, filelist in request.FILES.lists():
        if key == "extra_files" or key.startswith("extra_files"):
            files.extend(filelist)
    seen, uniq = set(), []
    for f in files:
        sig = (getattr(f, "name", ""), getattr(f, "size", None), getattr(f, "content_type", ""))
        if sig not in seen:
            seen.add(sig)
            uniq.append(f)
    if settings.DEBUG:
        print("DEBUG _collect_extra_files keys:", list(request.FILES.keys()))
        print("DEBUG _collect_extra_files count:", len(uniq))
    return uniq


def _has_any_attachment(leader, extra_links, extra_files):
    if leader and (getattr(leader, "file_upload", None) or getattr(leader, "link_or_file", "")):
        return True
    if extra_links:
        return True
    if extra_files:
        return True
    return False


# === NEW: Signed tokens for downloads (no DB fields required) ===
_TOKEN_SALT = "source-download-v1"  # NEW


def _make_download_token(kind: str, obj_id: int) -> str:  # NEW
    """
    kind: 'S' (Source) | 'V' (SourceFileVersion)
    obj_id: PK of the object
    """
    return signing.dumps({"k": kind, "i": obj_id}, salt=_TOKEN_SALT)


def _parse_download_token(token: str) -> tuple[str, int]:  # NEW
    data = signing.loads(token, salt=_TOKEN_SALT, max_age=None)
    return data["k"], int(data["i"])


def _download_url_for_source(src: Source) -> str:  # NEW
    token = _make_download_token("S", src.pk)
    return reverse("secure_file_download", args=[token])


def _download_url_for_version(ver: SourceFileVersion) -> str:  # NEW
    token = _make_download_token("V", ver.pk)
    return reverse("secure_file_download", args=[token])


def _client_ip(request):
    xfwd = request.META.get("HTTP_X_FORWARDED_FOR")
    if xfwd:
        return xfwd.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


# =========================================================
# Dashboard (public)
# =========================================================
def dashboard(request):
    categories = Category.objects.all().order_by("name")
    MAX_ROWS = 200

    # --- Parámetros GET ---
    category_id = request.GET.get("category_id")
    selected_category = None
    
    # --- Parámetros de búsqueda ---
    threats_search = request.GET.get('threats_search', '').strip()
    events_search = request.GET.get('events_search', '').strip()
    
    # --- Parámetros de paginación ---
    threat_page_number = request.GET.get('threat_page', 1)
    event_page_number = request.GET.get('event_page', 1)
    
    # --- Parámetros de items por página ---
    themes_per_page = request.GET.get('themes_per_page', '5')
    events_per_page = request.GET.get('events_per_page', '5')
    
    # --- Parámetros de archived ---
    show_archived_threats = request.GET.get('show_archived_threats') == '1'
    show_archived_events = request.GET.get('show_archived_events') == '1'
    
    # --- Variables para tracking si es "all" ---
    show_all_themes = themes_per_page == 'all'
    show_all_events = events_per_page == 'all'
    
    # --- Verificar si es AJAX request ---
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
    
    # --- Cargar themes ---
    themes = Theme.objects.all().select_related("category").annotate(
        active_event_count=Count('events', filter=Q(events__is_active=True))
    ).order_by("-created_at")

    # --- Cargar events ---
    events = Event.objects.all().select_related(
        "theme", "theme__category"
    ).order_by("-date_identified")

    # --- Filtro por categoría ---
    if category_id and category_id.isdigit():
        try:
            selected_category = Category.objects.get(pk=category_id)
            themes = themes.filter(category=selected_category)
            events = events.filter(theme__category=selected_category)
        except Category.DoesNotExist:
            selected_category = None

    # --- Filtro por búsqueda de THREATS ---
    if threats_search:
        themes = themes.filter(
            Q(name__icontains=threats_search) |
            Q(category__name__icontains=threats_search)
        )
    
    # --- Filtro por búsqueda de EVENTS ---
    if events_search:
        events = events.filter(
            Q(name__icontains=events_search) |
            Q(description__icontains=events_search) |
            Q(theme__name__icontains=events_search)
        )

    # --- Filtro por archived status ---
    if not show_archived_threats:
        themes = themes.filter(is_active=True)
        
    if not show_archived_events:
        events = events.filter(is_active=True)

    # --- Aplicar límite de filas ---
    themes = themes[:MAX_ROWS]
    events = events[:MAX_ROWS]

    # --- PAGINACIÓN PARA THEMES ---
    if show_all_themes:
        # Para "all", usar un número muy grande como items por página
        THEMES_PER_PAGE = 1000  # Un número grande que cubra todos los registros
    else:
        try:
            THEMES_PER_PAGE = int(themes_per_page)
        except ValueError:
            THEMES_PER_PAGE = 5
    
    themes_paginator = Paginator(themes, THEMES_PER_PAGE)
    try:
        themes_page = themes_paginator.get_page(threat_page_number)
    except PageNotAnInteger:
        themes_page = themes_paginator.get_page(1)
    except EmptyPage:
        themes_page = themes_paginator.get_page(themes_paginator.num_pages)

    # --- PAGINACIÓN PARA EVENTS ---
    if show_all_events:
        # Para "all", usar un número muy grande como items por página
        EVENTS_PER_PAGE = 1000  # Un número grande que cubra todos los registros
    else:
        try:
            EVENTS_PER_PAGE = int(events_per_page)
        except ValueError:
            EVENTS_PER_PAGE = 5
    
    events_paginator = Paginator(events, EVENTS_PER_PAGE)
    try:
        events_page = events_paginator.get_page(event_page_number)
    except PageNotAnInteger:
        events_page = events_paginator.get_page(1)
    except EmptyPage:
        events_page = events_paginator.get_page(events_paginator.num_pages)

    # --- Si es AJAX request, devolver solo la tabla solicitada ---
    if is_ajax:
        partial_type = request.GET.get('partial', '')
        
        if partial_type == 'themes' or 'threats_search' in request.GET or 'show_archived_threats' in request.GET or 'themes_per_page' in request.GET:
            themes_html = render_to_string("tracker/partials/theme_table.html", {
                "themes_page": themes_page,
                "selected_category": selected_category,
                "show_archived_threats": show_archived_threats,
                "themes_per_page": themes_per_page,
                "show_all_themes": show_all_themes,
            }, request=request)
            return HttpResponse(themes_html)
        
        elif partial_type == 'events' or 'events_search' in request.GET or 'show_archived_events' in request.GET or 'events_per_page' in request.GET:
            events_html = render_to_string("tracker/partials/event_list_partial.html", {
                "events_page": events_page,
                "selected_category": selected_category,
                "show_archived_events": show_archived_events,
                "events_per_page": events_per_page,
                "show_all_events": show_all_events,
            }, request=request)
            return HttpResponse(events_html)

    # --- Contexto para renderizado normal ---
    context = {
        "categories": categories,
        "themes_page": themes_page,
        "events_page": events_page,
        "selected_category": selected_category,
        "show_archived_threats": show_archived_threats,
        "show_archived_events": show_archived_events,
        "threats_search": threats_search,
        "events_search": events_search,
        "themes_per_page": themes_per_page,
        "events_per_page": events_per_page,
        "show_all_themes": show_all_themes,
        "show_all_events": show_all_events,
    }

    return render(request, "tracker/dashboard.html", context)
# =========================================================
# Threats / Themes
# =========================================================

# Lists & detail: PUBLIC

def theme_list_all(request):
    show_archived = request.GET.get('show_archived') == '1'
    q = (request.GET.get('q') or '').strip()

    # FIX: cambiamos event_count a active_event_count (sin chocar con nada)
    themes = (Theme.objects
              .select_related('category')
              .annotate(
                  active_event_count=Count('events', filter=Q(events__is_active=True)),
                  total_event_count=Count('events')
              )
              .order_by('name'))

    if not show_archived:
        themes = themes.filter(is_active=True)

    if q:
        themes = themes.filter(
            Q(name__icontains=q) |
            Q(category__name__icontains=q)
        )

    return render(request, 'tracker/theme_list.html', {
        'themes': themes,
        'is_paginated': False,
        'search_query': q,
        'show_archived': show_archived,
        'is_admin': is_admin(request.user),
    })


def theme_list(request, category_id):
    category = get_object_or_404(Category, pk=category_id)
    show_archived = request.GET.get('show_archived') == '1'

    themes = Theme.objects.filter(category=category)
    if not show_archived:
        themes = themes.filter(is_active=True)

    return render(request, 'tracker/theme_list.html', {
        'category': category,
        'themes': themes.order_by('name'),
        'show_archived': show_archived,
        'is_admin': is_admin(request.user),
    })


def view_theme(request, pk):
    theme = get_object_or_404(Theme, pk=pk)
    request.session['last_viewed_theme'] = theme.pk
    events = theme.events.all()
    return render(request, 'tracker/theme_detail.html', {
        'theme': theme,
        'events': events
    })


class ThemeDetailView(DetailView):
    model = Theme
    template_name = 'tracker/theme_detail.html'
    context_object_name = 'theme'


def theme_detail_offcanvas(request, pk):
    theme = get_object_or_404(Theme, pk=pk)

    show_admin_actions = request.user.is_staff or request.user.is_superuser

    html = render_to_string(
        "tracker/offcanvas/theme_detail_offcanvas.html",
        {
            "theme": theme,
            "show_admin_actions": show_admin_actions,
        },
        request=request
    )

    return JsonResponse({"success": True, "html": html})


    
# # Create/edit: LOGIN required
# class ThemeUpdateView(AdminRequiredMixin, UpdateView):
#     model = Theme
#     form_class = ThemeForm
#     template_name = 'tracker/theme_edit.html'

#     def form_valid(self, form):
#         response = super().form_valid(form)
#         messages.success(self.request, "Threat updated successfully")
#         return response

#     def get_success_url(self):
#         return reverse_lazy('view_theme', kwargs={'pk': self.object.pk})


class ThemeDeleteView(AdminRequiredMixin, UserPassesTestMixin, DeleteView):
    model = Theme
    template_name = 'tracker/theme_confirm_delete.html'
    success_url = reverse_lazy('theme_list_all')

    def test_func(self):
        return self.request.user.is_superuser

    def delete(self, request, *args, **kwargs):
        self.object = self.get_object()
        if self.object.events.exists():
            messages.error(request, "Cannot delete: Threat has associated events")
            return redirect('view_theme', pk=self.object.pk)
        messages.success(request, "Threat deleted successfully")
        return super().delete(request, *args, **kwargs)


@admin_required
def add_theme(request):
    preselect_category_id = request.GET.get('category')
    initial = {}
    if preselect_category_id:
        try:
            initial['category'] = Category.objects.get(pk=preselect_category_id)
        except Category.DoesNotExist:
            pass

    if request.method == 'POST':
        form = ThemeForm(request.POST)
        if form.is_valid():
            theme = form.save(commit=False)
            theme.created_by = request.user
            theme.save()
            
            # Soporte para AJAX
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': 'Theme created successfully',
                    'theme_id': theme.id,
                    'redirect_url': reverse('view_theme', kwargs={'pk': theme.pk})
                })
            
            # Comportamiento normal existente
            messages.success(request, "Theme created successfully")
            return redirect('view_theme', pk=theme.pk)
        
        # Manejo de errores para AJAX
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'errors': form.errors.get_json_data(),
                'message': 'Please correct the errors below.'
            })
        
        messages.error(request, "Please correct the errors below.")
    else:
        form = ThemeForm(initial=initial)

    return render(request, 'tracker/add_theme.html', {'form': form})


@admin_required
def toggle_theme_active(request, pk):
    
    if request.method != "POST":
        messages.error(request, "Invalid method.")
        return redirect('theme_list_all')

    theme = get_object_or_404(Theme, pk=pk)
    
    with transaction.atomic():
        theme.is_active = not theme.is_active
        theme.save(update_fields=['is_active'])
        
        # ARCHIVAR: Si estamos archivando el theme, archivar events y sources también
        if not theme.is_active:
            events = theme.events.all()
            events.update(is_active=False)
            event_ids = events.values_list('id', flat=True)
            Source.objects.filter(event_id__in=event_ids).update(is_active=False)
            messages.success(request, "Threat archived along with all associated events and sources.")
        else:
            # RESTAURAR: Al restaurar el theme, restaurar los events también
            events = theme.events.all()
            events.update(is_active=True)
            event_ids = events.values_list('id', flat=True)
            Source.objects.filter(event_id__in=event_ids).update(is_active=True)
            messages.success(request, "Threat restored along with all associated events and sources.")
    
    return redirect(request.META.get('HTTP_REFERER') or 'theme_list_all')
# =========================================================
# Events
# =========================================================

def event_list(request):
    sort = request.GET.get("sort") or "-risk"
    show_archived = request.GET.get('show_archived') == '1'

    events = Event.objects.select_related('theme').all()
    if not show_archived:
        events = events.filter(is_active=True)

    q = request.GET.get('q')
    if q:
        events = events.filter(
            Q(name__icontains=q) |
            Q(description__icontains=q) |
            Q(theme__name__icontains=q)
        )

    risk_order = Case(
        When(risk_rating="CRITICAL", then=1),
        When(risk_rating="HIGH", then=2),
        When(risk_rating="MEDIUM", then=3),
        When(risk_rating="LOW", then=4),
        default=5,
        output_field=IntegerField(),
    )

    if sort == "name":
        events = events.order_by("name", "-id")
    elif sort == "-name":
        events = events.order_by("-name", "-id")
    elif sort == "date":
        events = events.order_by("date_identified", "-id")
    elif sort == "-date":
        events = events.order_by("-date_identified", "-id")
    elif sort == "risk":
        events = events.annotate(rk=risk_order).order_by("rk", "name", "-id")
    elif sort == "-risk":
        events = events.annotate(rk=risk_order).order_by("-rk", "name", "-id")
    else:
        events = events.annotate(rk=risk_order).order_by("rk", "name", "-id")

    return render(request, 'tracker/event_list.html', {
        'events': events,
        'is_paginated': False,
        'search_query': q or '',
        'sort': sort,
        'show_archived': show_archived,
        'is_admin': is_admin(request.user),
    })


def _bundle_key(src):
    """Groups ‘siblings’ created from Add/Edit Source by a stable key."""
    return (
        src.event_id,
        (src.name or "").strip(),
        src.source_date,
        (src.summary or "").strip().lower(),
    )


def _make_bundles(qs):
    """
    Builds bundles from a queryset of Source.
    Returns list of dicts with:
      leader (Source), items (list[Source]), links (int), files (int),
      any_active (bool), display_type ('LINK'|'FILE'|'MIXED')
    """
    buckets = OrderedDict()
    qs = qs.select_related("event").only(
        "id", "event_id", "name", "source_date", "summary",
        "is_active", "file_upload", "link_or_file", "source_type",
        "potential_impact", "potential_impact_notes",
    )

    for s in qs:
        key = _bundle_key(s)
        if key not in buckets:
            buckets[key] = {
                "leader": s,
                "items": [],
                "links": 0,
                "files": 0,
                "any_active": False,
                "display_type": "LINK",
            }
        b = buckets[key]
        b["items"].append(s)
        if s.link_or_file:
            b["links"] += 1
        if getattr(s, "file_upload", None):
            b["files"] += 1
        if s.is_active:
            b["any_active"] = True

    for b in buckets.values():
        if b["links"] and b["files"]:
            b["display_type"] = "MIXED"
        elif b["files"]:
            b["display_type"] = "FILE"
        else:
            b["display_type"] = "LINK"

    bundles = list(buckets.values())
    bundles.sort(key=lambda x: (x["leader"].source_date or date.min), reverse=True)
    return bundles



def view_event(request, event_id):
    event = get_object_or_404(Event, pk=event_id)

    show_archived = request.GET.get("show_archived") == "1"
    selected_source_type = (request.GET.get("source_type") or "").strip().upper() or "ALL"

    qs = Source.objects.filter(event=event)
    if not show_archived:
        qs = qs.filter(is_active=True)

    bundles = _make_bundles(qs)

    if selected_source_type != "ALL":
        bundles = [b for b in bundles if b["display_type"] == selected_source_type]

    bundle_type_choices = [
        ("ALL", "All Types"),
        ("MIXED", "Mixed"),
        ("FILE", "Files"),
        ("LINK", "Links"),
    ]

    def get_risk_labels(event, level):
        lv1_map = dict(RISK_TAXONOMY_LV1)
        lv2_map = {val: label for items in RISK_TAXONOMY_LV2.values() for val, label in items}
        lv3_map = {val: label for items in RISK_TAXONOMY_LV3.values() for val, label in items}
        if level == 1:
            return [lv1_map.get(v, v) for v in (event.risk_taxonomy_lv1 or [])]
        elif level == 2:
            return [lv2_map.get(v, v) for v in (event.risk_taxonomy_lv2 or [])]
        elif level == 3:
            return [lv3_map.get(v, v) for v in (event.risk_taxonomy_lv3 or [])]
        return []

    # NEW: attach signed download URL methods to leader and items
    for b in bundles:
        leader = b["leader"]
        leader.get_download_url = lambda s=leader: _download_url_for_source(s)  # NEW
        for item in b["items"]:
            item.get_download_url = lambda s=item: _download_url_for_source(s)  # NEW

    context = {
        "event": event,
        "source_bundles": bundles,
        "bundle_type_choices": bundle_type_choices,
        "selected_source_type": selected_source_type,
        "show_archived": show_archived,
        "bundle_count": len(bundles),
        "impact_lobs_display": event.impacted_lines if hasattr(event, "impacted_lines") else [],
        "risk_lv1_labels": get_risk_labels(event, level=1),
        "risk_lv2_labels": get_risk_labels(event, level=2),
        "risk_lv3_labels": get_risk_labels(event, level=3),
        "is_admin": request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser),
    }
    return render(request, "tracker/event_detail.html", context)


class EventDetailView(DetailView):
    model = Event
    template_name = 'tracker/event_detail.html'
    context_object_name = 'event'

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        event = self.object
        source_type = self.request.GET.get('source_type')
        show_archived = self.request.GET.get('show_archived') == '1'

        sources = event.sources.all()
        if not show_archived:
            sources = sources.filter(is_active=True)
        if source_type:
            sources = sources.filter(source_type=source_type)

        sources = _leaders_only(sources)

        lv1_labels, lv2_labels, lv3_labels = _taxonomy_label_lists(event)

        # NEW: attach signed download URL to leaders
        for s in sources:
            s.get_download_url = lambda x=s: _download_url_for_source(x)  # NEW

        ctx.update({
            'risk_lv1_labels': lv1_labels,
            'risk_lv2_labels': lv2_labels,
            'risk_lv3_labels': lv3_labels,
            'sources': sources,
            'source_types': Source.SOURCE_TYPE_CHOICES,
            'selected_source_type': source_type,
            'show_archived': show_archived,
            'risk_colors': Event.RISK_COLORS,
        })
        return ctx


def event_detail(request, pk):
    return view_event(request, event_id=pk)


def theme_list_by_category(request, category_id):
    return theme_list(request, category_id)


# Create / Edit / Delete Event
@admin_required
def add_event(request, theme_id=None, theme_pk=None):
    theme = _resolve_theme_from_request(request, theme_id=theme_id, theme_pk=theme_pk)

    if request.method == "POST":
        form = EventForm(request.POST)
        if form.is_valid():
            event = form.save(commit=False)
            event.created_by = request.user
            if theme:
                event.theme = theme

            event.impacted_lines = request.POST.getlist("impacted_lines") or form.cleaned_data.get("impacted_lines", [])
            event.risk_taxonomy_lv1 = request.POST.getlist("risk_taxonomy_lv1") or []
            event.risk_taxonomy_lv2 = request.POST.getlist("risk_taxonomy_lv2") or []
            event.risk_taxonomy_lv3 = request.POST.getlist("risk_taxonomy_lv3") or []

            event.save()
            messages.success(request, "Event created successfully")
            return redirect("view_event", event_id=event.pk)
        messages.error(request, "Please correct the errors below.")
    else:
        form = EventForm(initial=_prefill_event_initial(request, theme))

    sel_lv1, sel_lv2, sel_lv3 = _selected_lists_from_event_or_initial(None, form.initial)
    taxonomy_json = json.dumps(build_taxonomy_json(sel_lv1, sel_lv2, sel_lv3), ensure_ascii=False)

    return render(
        request,
        "tracker/event_edit.html",
        {
            "creating": True,
            "theme": theme,
            "form": form,
            "RISK_TAXONOMY_LV1": RISK_TAXONOMY_LV1,
            "taxonomy_json": taxonomy_json,
        },
    )

@admin_required
def edit_event(request, pk=None, theme_pk=None):
    
    theme = None
    event = None
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
    
    # Obtener el evento si existe
    if pk:
        event = get_object_or_404(Event, pk=pk)
    
    if request.method == "POST":
        form = EventForm(request.POST, instance=event)
        
        if form.is_valid():
            try:
                with transaction.atomic():
                    event = form.save(commit=False)
                    
                    # Manejar campos de listas
                    event.impacted_lines = request.POST.getlist("impacted_lines") or []
                    event.risk_taxonomy_lv1 = request.POST.getlist("risk_taxonomy_lv1") or []
                    event.risk_taxonomy_lv2 = request.POST.getlist("risk_taxonomy_lv2") or []
                    event.risk_taxonomy_lv3 = request.POST.getlist("risk_taxonomy_lv3") or []
                    
                    # Para nuevos eventos, establecer created_by
                    if not event.pk:
                        event.created_by = request.user
                    
                    event.save()
                
                # Respuesta para AJAX
                if is_ajax:
                    return JsonResponse({
                        'success': True,
                        'message': 'Event saved successfully!',
                        'event_id': event.id,
                        'redirect_url': reverse('view_event', kwargs={'event_id': event.id})
                    })
                
                messages.success(request, "Event saved successfully!")
                return redirect("view_event", event_id=event.id)
                
            except Exception as e:
                logger.error(f"Error saving event: {e}", exc_info=True)
                error_msg = "Error saving event data. Please try again."
                if is_ajax:
                    return JsonResponse({'success': False, 'message': error_msg}, status=500)
                messages.error(request, error_msg)
        else:
            # Formulario inválido
            if is_ajax:
                return JsonResponse({
                    'success': False,
                    'errors': form.errors.get_json_data(),
                    'message': 'Please correct the errors below'
                }, status=400)
            messages.error(request, "Please correct the errors below")
    
    else:
        # GET request - mostrar formulario
        form = EventForm(instance=event)
        if event and event.pk:
            # Pre-popular campos de taxonomía
            form.initial.update({
                'risk_taxonomy_lv1': event.risk_taxonomy_lv1 or [],
                'risk_taxonomy_lv2': event.risk_taxonomy_lv2 or [],
                'risk_taxonomy_lv3': event.risk_taxonomy_lv3 or [],
            })

    # Preparar datos de taxonomía para el template
    sel_lv1, sel_lv2, sel_lv3 = _selected_lists_from_event_or_initial(event, form.initial)
    taxonomy_json = json.dumps(
        build_taxonomy_json(sel_lv1, sel_lv2, sel_lv3), 
        ensure_ascii=False
    )

    context = {
        "form": form,
        "event": event,
        "theme": event.theme if event else None,
        "creating": not event or not event.pk,
        "RISK_TAXONOMY_LV1": RISK_TAXONOMY_LV1,
        "taxonomy_json": taxonomy_json,
    }
    
    # Para AJAX, usar un template parcial
    if is_ajax:
        from django.template.loader import render_to_string
        html_content = render_to_string("tracker/partials/event_edit_form.html", context, request=request)
        return JsonResponse({
            'success': True,
            'html': html_content,
            'title': f"{'Edit' if event and event.pk else 'Create'} Event"
        })
    
    # Para requests normales
    return render(request, "tracker/event_edit.html", context)

class EventDeleteView(AdminRequiredMixin, UserPassesTestMixin, DeleteView):
    """Delete Event remains admin-only; create/edit already allowed for logged users."""
    model = Event
    template_name = 'tracker/event_confirm_delete.html'
    success_url = reverse_lazy('dashboard')

    def test_func(self):
        return self.request.user.is_superuser

    def delete(self, request, *args, **kwargs):
        messages.success(request, "Event deleted successfully")
        return super().delete(request, *args, **kwargs)


@login_required
def add_event_redirect(request):
    last_theme_id = request.session.get('last_viewed_theme')
    if last_theme_id:
        theme = Theme.objects.filter(pk=last_theme_id).first()
        if theme:
            return redirect('add_event', theme_id=theme.pk)

    first_theme = Theme.objects.order_by('id').first()
    if first_theme:
        return redirect('add_event', theme_id=first_theme.pk)

    messages.warning(request, "Please create a Theme first")
    return redirect('add_theme')


@admin_required
@login_required
def toggle_event_active(request, pk):
    # event = get_object_or_404(Event, pk=pk)

    # event.is_active = not event.is_active
    # event.save(update_fields=["is_active"])

    # if event.is_active:
    #     messages.success(request, "Event restored.")
    # else:
    #     messages.success(request, "Event archived.")

    # next_url = request.POST.get("next") or request.GET.get("next")
    # if not next_url:
    #     if event.is_active:
    #         next_url = reverse("view_event", kwargs={"event_id": event.pk})
    #     else:
    #         next_url = reverse("view_theme", kwargs={"pk": event.theme_id})

    # return redirect(next_url)
    event = get_object_or_404(Event, pk=pk)
    
    with transaction.atomic():
        event.is_active = not event.is_active
        event.save(update_fields=["is_active"])
        
        # ARCHIVAR/RESTAURAR: Siempre sincronizar con los sources
        if not event.is_active:
            # Archivar sources
            Source.objects.filter(event=event).update(is_active=False)
            messages.success(request, "Event archived along with all associated sources.")
        else:
            # Restaurar sources
            Source.objects.filter(event=event).update(is_active=True)
            messages.success(request, "Event restored along with all associated sources.")

    next_url = request.POST.get("next") or request.GET.get("next")
    if not next_url:
        if event.is_active:
            next_url = reverse("view_event", kwargs={"event_id": event.pk})
        else:
            next_url = reverse("view_theme", kwargs={"pk": event.theme_id})

    return redirect(next_url)

# =========================================================
# Sources
# =========================================================

# Detail: PUBLIC

def source_detail(request, pk):
    src = get_object_or_404(Source, pk=pk)

    bundle_items = Source.objects.filter(
        event=src.event,
        name=src.name,
        summary=src.summary,
        source_date=src.source_date
    ).order_by("-is_active", "id")

    # NEW: attach tokenized download URL
    src.get_download_url = lambda s=src: _download_url_for_source(s)  # NEW
    for s in bundle_items:
        s.get_download_url = lambda x=s: _download_url_for_source(x)  # NEW

    bundle_links = []
    bundle_files = []

    for item in bundle_items:
        if item.link_or_file:
            bundle_links.append({
                "url": item.link_or_file,
                "is_mailto": item.link_or_file.startswith("mailto:") if item.link_or_file else False,
                "is_active": item.is_active,
                "id": item.id
            })
        if item.file_upload:
            filename = item.file_upload.name
            if "/" in filename:
                filename = filename.split("/")[-1]
            file_ext = filename.lower().split(".")[-1] if "." in filename else ""
            is_pdf = file_ext == "pdf"
            is_doc = file_ext in ["doc", "docx"]
            is_email = file_ext in ["eml", "msg"]

            bundle_files.append({
                "name": filename,
                "url": item.file_upload.url,
                "ext": file_ext,
                "is_pdf": is_pdf,
                "is_doc": is_doc,
                "is_email": is_email,
                "is_active": item.is_active,
                "id": item.id
            })

    versions = list(src.file_history.all())
    for v in versions:
        v.get_download_url = lambda x=v: _download_url_for_version(x)  # NEW

    return render(
        request,
        "tracker/source_detail.html",
        {
            "object": src,
            "bundle_items": bundle_items,
            "bundle_links": bundle_links,
            "bundle_files": bundle_files,
            "preview_pdf_url": next((f["url"] for f in bundle_files if f["is_pdf"]), None),
            "file_history": versions,
        },
    )


class SourceDetailView(DetailView):
    model = Source
    template_name = "tracker/source_detail.html"

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        leader = self.object

        bundle_qs = Source.objects.filter(**_bundle_filter_dict(leader)).order_by("id")

        leader.get_download_url = lambda s=leader: _download_url_for_source(s)  # NEW
        for s in bundle_qs:
            s.get_download_url = lambda x=s: _download_url_for_source(x)  # NEW

        ctx["bundle_items"] = bundle_qs

        links, files = [], []
        for s in bundle_qs:
            if s.link_or_file:
                links.append({
                    "url": s.link_or_file,
                    "is_mailto": str(s.link_or_file).startswith("mailto:"),
                    "is_active": s.is_active,
                })
            if s.file_upload:
                try:
                    fname = s.file_upload.name or ""
                    url = s.file_upload.url
                except Exception:
                    fname, url = (getattr(s.file_upload, "name", ""), "")
                base = fname.split("/")[-1]
                ext = base.lower().rsplit(".", 1)[-1] if "." in base else ""
                files.append({
                    "name": base,
                    "url": url,
                    "ext": ext,
                    "is_pdf": (ext == "pdf"),
                    "is_active": s.is_active,
                })
        ctx["bundle_links"] = links
        ctx["bundle_files"] = files
        ctx["preview_pdf_url"] = next((f["url"] for f in files if f.get("is_pdf")), None)

        versions = list(leader.file_history.all())
        for v in versions:
            v.get_download_url = lambda x=v: _download_url_for_version(x)  # NEW
        ctx["file_history"] = versions

        return ctx


# Create / Edit / Archive Sources: LOGIN required
@admin_required
@transaction.atomic
def add_source(request, event_pk):
    event = get_object_or_404(Event, pk=event_pk)
    cancel_url = (
        request.GET.get("next")
        or request.META.get("HTTP_REFERER")
        or reverse_lazy("view_event", kwargs={"event_id": event.pk})
    )

    # batch id for staging temp uploads for this form
    if request.method == "POST":
        upload_batch = request.POST.get("upload_batch") or str(uuid.uuid4())
    else:
        upload_batch = str(uuid.uuid4())

    if request.method == "POST":
        drop_ids = [int(x) for x in request.POST.getlist("drop_temp_ids") if str(x).isdigit()]
        if drop_ids:
            _clear_staged(upload_batch, only_ids=drop_ids)

        _stage_incoming_files(request, upload_batch, request.user)

        form = SourceForm(request.POST, request.FILES, initial={"event": event})

        extra_links = [v.strip() for v in request.POST.getlist("extra_links") if v and v.strip()]
        bad_links = [l for l in extra_links if not _valid_link(l)]
        if bad_links:
            form.add_error("link_or_file", "One or more additional links are invalid. Use http(s):// or mailto:.")

        staged_main, staged_extras = _get_staged(upload_batch)

        if form.is_valid():
            selected_event = form.cleaned_data.get("event") or event

            summary = (form.cleaned_data.get("summary") or "").strip()
            if summary and Source.objects.filter(event=selected_event, summary__iexact=summary).exists():
                form.add_error("summary", "Summary must be different from existing ones for this event.")
            else:
                leader: Source = form.save(commit=False)
                leader.event = selected_event
                leader.created_by = request.user

                if not leader.file_upload and staged_main:
                    leader.file_upload.save(staged_main.original_name, staged_main.file.file, save=False)

                has_any = bool(leader.file_upload or leader.link_or_file or staged_extras or extra_links)
                if not has_any:
                    form.add_error(None, "Please add at least one link or file before saving.")
                else:
                    leader.source_type = "FILE" if leader.file_upload else ("LINK" if leader.link_or_file else "LINK")
                    leader.save()
                    form.save_m2m()

                    created_links = 0
                    for l in extra_links:
                        Source.objects.create(
                            event=leader.event,
                            name=leader.name,
                            source_date=leader.source_date,
                            summary=leader.summary,
                            potential_impact=leader.potential_impact,
                            potential_impact_notes=leader.potential_impact_notes,
                            link_or_file=l,
                            created_by=request.user,
                            source_type="LINK",
                        )
                        created_links += 1

                    created_files = 0
                    for tu in staged_extras:
                        sib = Source(
                            event=leader.event,
                            name=leader.name,
                            source_date=leader.source_date,
                            summary=leader.summary,
                            potential_impact=leader.potential_impact,
                            potential_impact_notes=leader.potential_impact_notes,
                            created_by=request.user,
                            source_type="FILE",
                        )
                        sib.file_upload.save(tu.original_name, tu.file.file, save=False)
                        sib.save()
                        created_files += 1

                    _clear_staged(upload_batch)

                    parts = []
                    if leader.file_upload:
                        parts.append("main file attached")
                    if leader.link_or_file:
                        parts.append("main link added")
                    if created_files:
                        parts.append(f"{created_files} additional file(s) added")
                    if created_links:
                        parts.append(f"{created_links} additional link(s) added")

                    messages.success(request, "Source created: " + ", ".join(parts) + ".")
                    return redirect("view_event", event_id=leader.event_id)

        existing_summaries = list(Source.objects.filter(event=event).values_list("summary", flat=True))
        staged_main, staged_extras = _get_staged(upload_batch)
        return render(
            request,
            "tracker/add_source.html",
            {
                "form": form,
                "event": event,
                "cancel_url": cancel_url,
                "existing_summaries_json": json.dumps(existing_summaries),
                "upload_batch": upload_batch,
                "staged_main": staged_main,
                "staged_extras": staged_extras,
            },
        )

    existing_summaries = list(Source.objects.filter(event=event).values_list("summary", flat=True))
    return render(
        request,
        "tracker/add_source.html",
        {
            "form": SourceForm(initial={"event": event}),
            "event": event,
            "cancel_url": cancel_url,
            "existing_summaries_json": json.dumps(existing_summaries),
            "upload_batch": upload_batch,
            "staged_main": None,
            "staged_extras": [],
        },
    )
class SourceUpdateView(AdminRequiredMixin, UpdateView):
    model = Source
    form_class = SourceForm
    template_name = "tracker/source_edit.html"

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx["bundle_items"] = _bundle_qs_strict(self.object)
        ev = self.object.event
        existing = list(
            Source.objects.filter(event=ev).exclude(pk=self.object.pk).values_list("summary", flat=True)
        )
        ctx["existing_summaries_json"] = json.dumps(existing)
        return ctx

    @transaction.atomic
    def form_valid(self, form):
        req = self.request

        extra_links = [v.strip() for v in req.POST.getlist("extra_links") if v and v.strip()]
        bad_links = [l for l in extra_links if not _valid_link(l)]
        if bad_links:
            form.add_error("link_or_file", "One or more additional links are invalid. Use http(s):// or mailto:.")
            return self.form_invalid(form)

        extra_files = _collect_extra_files(req)

        original = Source.objects.select_for_update().get(pk=self.object.pk)
        old_main_file = original.file_upload
        old_main_name = getattr(old_main_file, "name", None)

        leader: Source = form.save(commit=False)
        if leader.file_upload and not _ext_ok(leader.file_upload):
            form.add_error("file_upload", "File not allowed. Only .pdf, .doc, .docx, .eml, .msg")
            return self.form_invalid(form)

        leader.source_type = "FILE" if leader.file_upload else ("LINK" if leader.link_or_file else "LINK")
        leader.save()
        form.save_m2m()

        has_any = _has_any_attachment(leader, extra_links, extra_files)
        still_any_in_bundle = Source.objects.filter(
            event=leader.event,
            name=leader.name,
            summary=leader.summary,
            source_date=leader.source_date,
            is_active=True
        ).exclude(pk=leader.pk).exists()

        if not has_any and not leader.file_upload and not leader.link_or_file and not still_any_in_bundle:
            form.add_error(None, "Please add at least one link or file before saving.")
            return self.form_invalid(form)

        archived = 0
        to_remove_ids = [int(x) for x in req.POST.getlist("remove_item_ids") if x.isdigit()]
        if to_remove_ids:
            archived = Source.objects.filter(
                id__in=to_remove_ids,
                **_bundle_strict_filter(leader)
            ).update(is_active=False)

        # NEW: physically move archived siblings to Inactive when backend supports it
        if to_remove_ids:  # NEW
            for s in Source.objects.filter(id__in=to_remove_ids, file_upload__isnull=False):  # NEW
                if hasattr(default_storage, "move_between_state"):  # NEW
                    try:  # NEW
                        new_rel = default_storage.move_between_state(  # NEW
                            s.file_upload.name,
                            to_active=False
                        )
                        s.file_upload.name = new_rel
                        s.save(update_fields=["file_upload"])  # NEW
                    except Exception:
                        pass  # Non-fatal; logical archive already applied  # NEW

        created_links = 0
        for l in extra_links:
            Source.objects.create(
                event=leader.event,
                name=leader.name,
                source_date=leader.source_date,
                summary=leader.summary,
                potential_impact=leader.potential_impact,
                potential_impact_notes=leader.potential_impact_notes,
                link_or_file=l,
                created_by=req.user,
                source_type="LINK",
            )
            created_links += 1

        created_files = 0
        skipped = 0
        for f in extra_files:
            if not _ext_ok(f):
                skipped += 1
                continue
            sib = Source(
                event=leader.event,
                name=leader.name,
                source_date=leader.source_date,
                summary=leader.summary,
                potential_impact=leader.potential_impact,
                potential_impact_notes=leader.potential_impact_notes,
                created_by=req.user,
                source_type="FILE",
            )
            sib.file_upload.save(f.name, f, save=False)
            sib.save()
            created_files += 1

        new_main_name = getattr(leader.file_upload, "name", None)
        main_changed = (old_main_name != new_main_name)

        msg_parts = []
        if main_changed:
            if new_main_name:
                msg_parts.append("main file updated")
            else:
                msg_parts.append("main file cleared")
        if created_files:
            msg_parts.append(f"{created_files} additional file(s) added")
        if created_links:
            msg_parts.append(f"{created_links} additional link(s) added")
        if archived:
            msg_parts.append(f"{archived} item(s) archived")
        if skipped:
            messages.warning(req, f"{skipped} file(s) were skipped (only .pdf, .doc, .docx, .eml, .msg allowed).")

        if msg_parts:
            messages.success(req, "Source updated: " + ", ".join(msg_parts) + ".")
        else:
            messages.info(req, "No changes detected. If you intended to add files, make sure they appear under \"Additional files\" before saving.")

        return redirect("source_detail", pk=leader.pk)

    def get_success_url(self):
        return reverse_lazy("source_detail", kwargs={"pk": self.object.pk})


@login_required
def edit_source(request, pk):
    """FBV version: login-only."""
    src = get_object_or_404(Source, pk=pk)
    event = src.event

    if request.method == "POST":
        form = SourceForm(request.POST, request.FILES, instance=src)

        extra_links = [v.strip() for v in request.POST.getlist("extra_links") if v and v.strip()]
        bad = [l for l in extra_links if not _valid_link(l)]
        if bad:
            form.add_error("link_or_file", "One or more additional links are invalid. Use http(s):// or mailto:.")

        if form.is_valid():
            leader = form.save(commit=False)

            if leader.file_upload:
                leader.source_type = "FILE"
            elif leader.link_or_file:
                leader.source_type = "LINK"
            else:
                leader.source_type = "LINK"

            leader.save()
            form.save_m2m()

            created = 0
            skipped = 0

            for l in extra_links:
                Source.objects.create(
                    event=leader.event,
                    name=leader.name,
                    source_date=leader.source_date,
                    summary=leader.summary,
                    potential_impact=leader.potential_impact,
                    potential_impact_notes=leader.potential_impact_notes,
                    link_or_file=l,
                    created_by=request.user,
                    source_type="LINK",
                )
                created += 1

            if 'extra_files' in request.FILES:
                for f in request.FILES.getlist('extra_files'):
                    if not _ext_ok(f):
                        skipped += 1
                        continue
                    sib = Source(
                        event=leader.event,
                        name=leader.name,
                        source_date=leader.source_date,
                        summary=leader.summary,
                        potential_impact=leader.potential_impact,
                        potential_impact_notes=leader.potential_impact_notes,
                        created_by=request.user,
                        source_type="FILE",
                    )
                    sib.file_upload.save(f.name, f, save=False)
                    sib.save()
                    created += 1

            remove_item_ids = request.POST.getlist("remove_item_ids")
            if remove_item_ids:
                Source.objects.filter(
                    id__in=remove_item_ids,
                    event=leader.event,
                    name=leader.name,
                    summary=leader.summary,
                    source_date=leader.source_date
                ).update(is_active=False)

                # NEW: also move archived files to Inactive if backend supports it
                ids_int = [int(x) for x in remove_item_ids if str(x).isdigit()]  # NEW
                if ids_int:  # NEW
                    for s in Source.objects.filter(id__in=ids_int, file_upload__isnull=False):  # NEW
                        if hasattr(default_storage, "move_between_state"):  # NEW
                            try:  # NEW
                                new_rel = default_storage.move_between_state(  # NEW
                                    s.file_upload.name,
                                    to_active=False
                                )
                                s.file_upload.name = new_rel
                                s.save(update_fields=["file_upload"])  # NEW
                            except Exception:
                                pass  # NEW

            if skipped:
                messages.warning(
                    request,
                    f"{skipped} file(s) were skipped (only .pdf, .doc, .docx, .eml, .msg allowed)."
                )

            if created > 0:
                messages.success(request, f"Source updated. {created} item(s) added to bundle.")
            else:
                messages.success(request, "Source updated successfully.")

            return redirect("source_detail", pk=leader.pk)
    else:
        form = SourceForm(instance=src)

    bundle_items = Source.objects.filter(
        event=src.event,
        name=src.name,
        summary=src.summary,
        source_date=src.source_date
    ).order_by("-is_active", "id")

    # NEW: attach tokenized download URLs
    src.get_download_url = lambda s=src: _download_url_for_source(s)  # NEW
    for s in bundle_items:
        s.get_download_url = lambda x=s: _download_url_for_source(x)  # NEW

    existing_links = [item.link_or_file for item in bundle_items if item.link_or_file and item.id != src.id]
    existing_summaries = list(Source.objects.filter(event=event).exclude(pk=src.pk).values_list("summary", flat=True))

    return render(
        request,
        "tracker/source_edit.html",
        {
            "form": form,
            "object": src,
            "event": event,
            "bundle_items": bundle_items,
            "existing_links": existing_links,
            "existing_summaries_json": json.dumps(existing_summaries),
        },
    )


@admin_required
def toggle_source_active(request, pk):
    """
    NEW: Toggle Source.is_active. If storage backend supports physical relocation
    (e.g., SharePoint), move the file between Active/Inactive folders accordingly.
    """
    if request.method != "POST":  # keep the POST requirement
        messages.error(request, "Invalid method.")
        return redirect('source_detail', pk=pk)

    src = get_object_or_404(Source, pk=pk)
    to_active = not src.is_active

    # NEW: move physical file when available & backend supports it
    if src.file_upload and hasattr(default_storage, "move_between_state"):
        try:
            new_rel = default_storage.move_between_state(
                src.file_upload.name,
                to_active=to_active
            )
            src.file_upload.name = new_rel  # reflect the new path
        except Exception as e:
            messages.error(request, f"File move failed: {e}")  # non-blocking

    # Logical toggle
    src.is_active = to_active
    src.save(update_fields=["is_active", "file_upload", "updated_at"])  # NEW: persist file path update

    messages.success(request, "Source restored." if to_active else "Source archived.")

    next_url = (
        request.POST.get("next")
        or request.META.get("HTTP_REFERER")
        or reverse("source_detail", kwargs={"pk": src.pk})
    )
    return redirect(next_url)


class SourceDeleteView(AdminRequiredMixin, DeleteView):
    """
    'Delete' performs a soft-delete (archive). Login-only to align with requirement
    that any logged-in user can archive.
    """
    model = Source
    template_name = "tracker/source_confirm_delete.html"
    context_object_name = "object"

    def delete(self, request, *args, **kwargs):
        self.object = self.get_object()
        self.object.is_active = False
        self.object.save(update_fields=["is_active"])
        messages.success(request, "Source archived.")
        return HttpResponseRedirect(self.get_success_url())

    def get_success_url(self):
        ev_id = getattr(self.object, "event_id", None)
        if ev_id:
            return reverse("view_event", kwargs={"event_id": ev_id})
        return reverse("source_detail", kwargs={"pk": self.object.pk})


@login_required
def add_source_redirect(request):
    last_event_id = request.session.get("last_viewed_event")
    if last_event_id:
        ev = Event.objects.filter(pk=last_event_id).first()
        if ev:
            return redirect("add_source", event_pk=ev.pk)
    first_event = Event.objects.first()
    if first_event:
        return redirect("add_source", event_pk=first_event.pk)
    messages.warning(request, "Please create an Event first")
    return redirect("dashboard")


# =========================================================
# SECURE DOWNLOAD (signed token → redirect to storage/link)
# =========================================================

def secure_file_download(request, token: str):  # NEW
    """
    Accepts a signed token (no expiry) that identifies:
      - Source (kind='S')   => uses file_upload if present, otherwise link_or_file
      - SourceFileVersion (kind='V') => always a file
    Redirects to storage URL (file) or http(s)/mailto link.
    """
    try:
        kind, obj_id = _parse_download_token(token)
    except signing.BadSignature:
        raise Http404("Invalid download token")

    obj = None
    if kind == "S":
        obj = get_object_or_404(Source, pk=obj_id)
        logger.info(
            "DOWNLOAD Source id=%s by=%s ip=%s ua=%s",
            obj_id,
            request.user.id if request.user.is_authenticated else "anon",
            _client_ip(request),
            request.META.get("HTTP_USER_AGENT", "")[:200],
        )
        if obj.file_upload:
            return redirect(obj.file_upload.url)
        elif obj.link_or_file:
            return redirect(obj.link_or_file)
        else:
            raise Http404("No file or link in this Source")

    elif kind == "V":
        ver = get_object_or_404(SourceFileVersion, pk=obj_id)
        logger.info(
            "DOWNLOAD Version id=%s (source=%s) by=%s ip=%s ua=%s",
            obj_id,
            ver.source_id,
            request.user.id if request.user.is_authenticated else "anon",
            _client_ip(request),
            request.META.get("HTTP_USER_AGENT", "")[:200],
        )
        if ver.file:
            return redirect(ver.file.url)
        raise Http404("Version has no file")

    raise Http404("Unknown token kind")


# =========================================================
# AJAX helpers (for create/edit forms)
# =========================================================

@login_required
def get_themes(request):
    category_id = request.GET.get('category_id')
    themes = Theme.objects.filter(category_id=category_id).order_by('name')
    return render(request, 'tracker/theme_dropdown_options.html', {'themes': themes})


@login_required
def get_events(request):
    theme_id = request.GET.get('theme_id')
    events = Event.objects.filter(theme_id=theme_id).order_by('name')
    return render(request, 'tracker/event_dropdown_options.html', {'events': events})


# =========================================================
# Auth & Misc
# =========================================================
@login_required
@user_passes_test(lambda u: u.is_superuser)
def register(request):
    """
    Only superusers can create accounts from the UI.
    Does not auto-login the new user to avoid kicking the admin.
    """
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            new_user = form.save(commit=False)
            new_user.is_active = True
            new_user.save()
            messages.success(request, f'User "{new_user.username}" created successfully.')
            
            
            if request.META.get('HTTP_REFERER'):
                return redirect(f"{request.META.get('HTTP_REFERER')}?registered=success")
            return redirect('dashboard')
        messages.error(request, "Please correct the errors below.")
    else:
        form = RegisterForm()
    
    return render(request, 'registration/register.html', {'form': form})


@user_passes_test(lambda u: u.is_superuser)
@login_required
def access_logs(request):
    logs = UserAccessLog.objects.all().order_by('-login_time')[:100]
    return render(request, 'tracker/access_logs.html', {'logs': logs})


def custom_logout(request):
    logout(request)
    messages.info(request, "You have been logged out")
    return redirect('login')


# ====== Temp upload helpers (staging) ======

def _stage_incoming_files(request, batch_id: str, user):
    """Stages any file in this POST into TempUpload."""
    f = request.FILES.get("file_upload")
    staged_main_id = None
    if f:
        if _ext_ok(f):
            TempUpload.objects.filter(batch_id=batch_id, kind="MAIN").delete()
            tu = TempUpload.objects.create(
                batch_id=batch_id, user=user, file=f, original_name=getattr(f, "name", "file"), kind="MAIN"
            )
            staged_main_id = tu.id
        else:
            pass

    for ef in request.FILES.getlist("extra_files"):
        if _ext_ok(ef):
            TempUpload.objects.create(
                batch_id=batch_id, user=user, file=ef, original_name=getattr(ef, "name", "file"), kind="EXTRA"
            )
    return staged_main_id


def _get_staged(batch_id: str):
    main = TempUpload.objects.filter(batch_id=batch_id, kind="MAIN").first()
    extras = list(TempUpload.objects.filter(batch_id=batch_id, kind="EXTRA"))
    return main, extras


def _clear_staged(batch_id: str, only_ids: list[int] | None = None):
    qs = TempUpload.objects.filter(batch_id=batch_id)
    if only_ids:
        qs = qs.filter(id__in=only_ids)
    qs.delete()


# ====== Forms (CreateUserForm) ======
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth import get_user_model
from django import forms

User = get_user_model()


class CreateUserForm(UserCreationForm):
    email = forms.EmailField(required=True)

    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("username", "email")

    def clean_email(self):
        email = (self.cleaned_data.get("email") or "").strip().lower()
        if email and User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError("Email is already in use.")
        return email

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data["email"].strip().lower()
        if commit:
            user.save()
        return user

# ===========================
#   ADD EVENT — OFFCANVAS
# ===========================
@login_required
def add_event_offcanvas(request):
    """
    Add Event offcanvas con validación COMPLETA
    """
    theme = _resolve_theme_from_request(request)

    # ================= POST =================
    if request.method == "POST":
        
        # --- PETICIÓN PARCIAL (taxonomy sync) ---
        if (
            request.headers.get("X-Requested-With") == "XMLHttpRequest"
            and "__partial__" in request.POST
        ):
            try:
                sel_lv1 = request.POST.getlist("risk_taxonomy_lv1") or []
                sel_lv2 = request.POST.getlist("risk_taxonomy_lv2") or []
                sel_lv3 = request.POST.getlist("risk_taxonomy_lv3") or []

                # Generar opciones de Level 2 basadas en Level 1
                lv2_options_html = ""
                if sel_lv1:
                    for lv1_key in sel_lv1:
                        lv2_items = RISK_TAXONOMY_LV2.get(lv1_key, [])
                        if lv2_items:
                            lv1_label = dict(RISK_TAXONOMY_LV1).get(lv1_key, lv1_key)
                            lv2_options_html += '<div class="taxonomy-group mb-2">'
                            lv2_options_html += f'<div class="fw-bold small text-muted">{lv1_label} <span class="option-count">0/{len(lv2_items)}</span></div>'
                            
                            for lv2_key, lv2_label in lv2_items:
                                checked = 'checked' if lv2_key in sel_lv2 else ''
                                safe_id = lv2_key.replace(' ', '_').replace('(', '').replace(')', '').replace(',', '').replace('.', '')
                                # 🔥 FIX: Usar .format() en lugar de f-string para evitar conflicto con llaves
                                lv2_options_html += '''
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" 
                                           name="risk_taxonomy_lv2" value="{value}" 
                                           id="lv2_{id}" {checked}>
                                    <label class="form-check-label" for="lv2_{id}">
                                        {label}
                                    </label>
                                </div>
                                '''.format(value=lv2_key, id=safe_id, checked=checked, label=lv2_label)
                            lv2_options_html += '</div>'
                
                if not lv2_options_html:
                    lv2_options_html = '<p class="text-muted small">Select Level 1 options first</p>'

                # Generar opciones de Level 3 basadas en Level 2
                lv3_options_html = ""
                if sel_lv2:
                    for lv2_key in sel_lv2:
                        lv3_items = RISK_TAXONOMY_LV3.get(lv2_key, [])
                        if lv3_items:
                            # Buscar label de Level 2
                            lv2_label = lv2_key
                            for items in RISK_TAXONOMY_LV2.values():
                                for k, v in items:
                                    if k == lv2_key:
                                        lv2_label = v
                                        break
                            
                            lv3_options_html += '<div class="taxonomy-group mb-2">'
                            lv3_options_html += f'<div class="fw-bold small text-muted">{lv2_label} <span class="option-count">0/{len(lv3_items)}</span></div>'
                            
                            for lv3_key, lv3_label in lv3_items:
                                checked = 'checked' if lv3_key in sel_lv3 else ''
                                safe_id = lv3_key.replace(' ', '_').replace('(', '').replace(')', '').replace(',', '').replace('.', '')
                                # 🔥 FIX: Usar .format() en lugar de f-string
                                lv3_options_html += '''
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" 
                                           name="risk_taxonomy_lv3" value="{value}" 
                                           id="lv3_{id}" {checked}>
                                    <label class="form-check-label" for="lv3_{id}">
                                        {label}
                                    </label>
                                </div>
                                '''.format(value=lv3_key, id=safe_id, checked=checked, label=lv3_label)
                            lv3_options_html += '</div>'
                
                if not lv3_options_html:
                    lv3_options_html = '<p class="text-muted small">Select Level 2 options first</p>'

                response_html = f'''
                <div id="lv2-options">
                    {lv2_options_html}
                </div>
                <div id="lv3-options">
                    {lv3_options_html}
                </div>
                '''

                # 🔥 FIX: Retornar el HTML generado
                return JsonResponse({
                    "success": True,
                    "html": response_html
                })
            
            except Exception as e:
                import traceback
                print("❌ Error in partial update:")
                print(traceback.format_exc())
                
                return JsonResponse({
                    "success": False,
                    "message": "Error updating taxonomy options"
                }, status=500)

        # --- GUARDAR EVENTO (submit completo) ---
        
        sel_lv1 = request.POST.getlist("risk_taxonomy_lv1") or []
        sel_lv2 = request.POST.getlist("risk_taxonomy_lv2") or []
        sel_lv3 = request.POST.getlist("risk_taxonomy_lv3") or []
        
        post_data = request.POST.copy()
        post_data.setlist("risk_taxonomy_lv1", sel_lv1)
        post_data.setlist("risk_taxonomy_lv2", sel_lv2)
        post_data.setlist("risk_taxonomy_lv3", sel_lv3)
        
        form = EventForm(post_data)
        form.fields['risk_taxonomy_lv2'].choices = form._valid_lv2_from(sel_lv1)
        form.fields['risk_taxonomy_lv3'].choices = form._valid_lv3_from(sel_lv2)
        
        if form.is_valid():
            event = form.save(commit=False)
            event.created_by = request.user
            if theme:
                event.theme = theme

            event.impacted_lines = form.cleaned_data.get("impacted_lines", [])
            event.risk_taxonomy_lv1 = sel_lv1
            event.risk_taxonomy_lv2 = sel_lv2
            event.risk_taxonomy_lv3 = sel_lv3
            
            event.save()

            return JsonResponse({
                "success": True,
                "message": "Event created successfully!",
                "event_id": event.pk
            })
        
        return JsonResponse({
            "success": False,
            "errors": {
                field: [str(error) for error in errors]
                for field, errors in form.errors.items()
            }
        }, status=400)

    # ================= GET (cargar formulario inicial) =================
    initial = {}
    if theme:
        initial['theme'] = theme
        initial['risk_rating'] = theme.risk_rating

    form = EventForm(initial=initial)

    taxonomy_json = json.dumps({
        "lv1": {},
        "lv2": {},
        "lv3": {}
    })

    html = render_to_string(
        "tracker/offcanvas/add_event_offcanvas.html",
        {
            "form": form,
            "theme": theme,
            "taxonomy_json": taxonomy_json,
            "RISK_TAXONOMY_LV1": RISK_TAXONOMY_LV1,
            "LINE_OF_BUSINESS_CHOICES": LINE_OF_BUSINESS_CHOICES,
        },
        request=request
    )

    return JsonResponse({
        "success": True,
        "html": html
    })

# ===========================
#   EDIT EVENT — OFFCANVAS
# ===========================
def edit_event_offcanvas(request, pk):

    event = get_object_or_404(Event, pk=pk)

    if request.method == "POST":
        # El POST lo manejará tu vista normal edit_event
        pass

    form = EventForm(instance=event)

    return render(request, "tracker/offcanvas/event_form_offcanvas.html", {
        "creating": False,
        "form": form,
        "event": event,
        "theme": event.theme,
    })
    
    

    """
    Procesar el formulario de Add Source desde offcanvas
    """
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Invalid method"})
    
    try:
        # Aquí va la lógica de tu función add_source_global_offcanvas
        # que ya tienes en views.py, adaptada para retornar JSON
        
        # Crear el source usando la misma lógica que tu función original
        # ... (tu lógica existente para crear sources)
        
        # Ejemplo simplificado:
        event_id = request.POST.get('event')
        name = request.POST.get('name')
        
        if not event_id:
            return JsonResponse({
                "success": False,
                "errors": {"event": ["Please select an event"]}
            })
        
        if not name or len(name) < 3:
            return JsonResponse({
                "success": False,
                "errors": {"name": ["Name must be at least 3 characters"]}
            })
        
        # Crear el source (simplificado - usa tu lógica real)
        source = Source.objects.create(
            event_id=event_id,
            name=name,
            source_date=request.POST.get('source_date'),
            summary=request.POST.get('summary'),
            # ... otros campos
        )
        
        return JsonResponse({
            "success": True,
            "message": "Source created successfully!",
            "redirect_url": f"/event/{source.event_id}/"  # Redirigir al evento
        })
        
    except Exception as e:
        return JsonResponse({
            "success": False,
            "message": str(e)
        })

    upload_batch = str(uuid.uuid4())

    html = render(
        request,
        "add_source_offcanvas.html",
        {
            "creating": True,
            "event": None,
            "form": SourceForm(),
            "cancel_url": reverse_lazy("dashboard"),
            "existing_summaries_json": "[]",
            "upload_batch": upload_batch,
            "staged_main": None,
            "staged_extras": [],
        }
    )

    return html



def theme_list_offcanvas(request):
    """
    Versión offcanvas de la lista completa de threats.
    Compatible con parámetros del dashboard.
    """
    # Parámetros del dashboard
    show_archived = request.GET.get('show_archived') == '1' or request.GET.get('show_archived_threats') == '1'
    q = (request.GET.get('q') or request.GET.get('threats_search') or '').strip()
    
    # Si viene del dashboard, también puede tener category_id
    category_id = request.GET.get('category_id')
    
    themes = (Theme.objects
              .select_related('category')
              .annotate(
                  active_event_count=Count('events', filter=Q(events__is_active=True)),
                  total_event_count=Count('events')
              )
              .order_by('name'))

    # Filtrar por categoría si se especifica
    if category_id and category_id.isdigit():
        themes = themes.filter(category_id=category_id)

    if not show_archived:
        themes = themes.filter(is_active=True)

    if q:
        themes = themes.filter(
            Q(name__icontains=q) |
            Q(category__name__icontains=q)
        )

    context = {
        'themes': themes,
        'is_paginated': False,
        'search_query': q,
        'show_archived': show_archived,
        'category_id': category_id,
        'is_admin': request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser),
    }
    
    # Si es AJAX request (cuando se llama desde el dashboard), devolver solo el contenido
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
    
    if is_ajax:
        return render(request, 'tracker/partials/theme_list_offcanvas_content.html', context)
    
    # Para el botón "View All" del dashboard
    return render(request, 'tracker/offcanvas/theme_list_offcanvas.html', context)

@login_required
def add_theme_offcanvas(request):
    """
    Vista AJAX para crear themes desde offcanvas
    """
    # ========== POST (guardar) ==========
    if request.method == "POST":
        form = ThemeForm(request.POST)
        
        if form.is_valid():
            theme = form.save(commit=False)
            theme.created_by = request.user
            theme.save()
            
            return JsonResponse({
                "success": True,
                "theme_id": theme.id,
                "message": "Threat created successfully!"
            })
        else:
            # Retornar errores
            return JsonResponse({
                "success": False,
                "errors": {
                    field: [str(error) for error in errors]
                    for field, errors in form.errors.items()
                }
            })
    
    # ========== GET (cargar formulario) ==========
    form = ThemeForm()
    categories = Category.objects.all().order_by('name')
    
    html = render_to_string(
        "tracker/offcanvas/add_theme_offcanvas.html",
        {
            "form": form,
            "categories": categories,
        },
        request=request
    )
    
    return JsonResponse({
        "success": True,
        "html": html
    })

    # ---------------- POST ----------------
    if request.method == "POST" and request.headers.get("X-Requested-With") == "XMLHttpRequest":
        
        name = request.POST.get("name", "").strip()
        category_id = request.POST.get("category")
        risk_rating = request.POST.get("risk_rating", "").lower()
        onset_timeline = request.POST.get("onset_timeline")

        errors = {}

        # Validaciones
        if not name or len(name) < 3:
            errors["name"] = "Name must be at least 3 characters."

        if not category_id:
            errors["category"] = "Please select a category."

        if not risk_rating:
            errors["risk_rating"] = "Please select a risk rating."

        if not onset_timeline:
            errors["onset_timeline"] = "Please select an onset timeline."

        # Evitar duplicados
        if Theme.objects.filter(name__iexact=name, category_id=category_id).exists():
            errors["name"] = "This threat already exists in this category."

        if errors:
            return JsonResponse({"success": False, "errors": errors})

        # Crear registro
        category = Category.objects.get(pk=category_id)
        new_theme = Theme.objects.create(
            name=name,
            category=category,
            risk_rating=risk_rating,
            onset_timeline=onset_timeline
        )

        # RESPUESTA CORRECTA → SOLO enviamos el ID y la URL
        return JsonResponse({
            "success": True,
            "message": "Threat created successfully!",
            "theme_id": new_theme.id,
            "redirect_url": reverse("theme_detail_offcanvas", args=[new_theme.id])
        })

    # ---------------- GET ----------------
    categories = Category.objects.all()
    return render(request, "tracker/offcanvas/add_theme_offcanvas.html", {
        "categories": categories
    })




def login_view(request):
    next_url = request.GET.get("next", "dashboard")

    if request.method == "POST":
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)  # CREA sessionid
            return redirect(request.POST.get("next") or "dashboard")
    else:
        form = AuthenticationForm()

    return render(request, "tracker/login.html", {
        "form": form,
        "next": next_url
    })
    
    

@login_required
def edit_theme_offcanvas(request, pk):
    theme = get_object_or_404(Theme, pk=pk)

    # ========= GET → cargar formulario =========
    if request.method == "GET":
        html = render_to_string(
            "tracker/offcanvas/edit_theme_offcanvas.html",
            {
                "theme": theme,
                "categories": Category.objects.all(),
                "ONSET_TIMELINE_CHOICES": ONSET_TIMELINE_CHOICES,
            },
            request=request
        )
        return JsonResponse({"html": html})

    # ========= POST → guardar =========
    if request.method == "POST":
        name = request.POST.get("name", "").strip()
        category_id = request.POST.get("category")
        risk_rating = request.POST.get("risk_rating")
        onset_timeline = request.POST.get("onset_timeline")

        errors = {}

        if not name or len(name) < 3:
            errors["name"] = "Name must be at least 3 characters."

        if not category_id:
            errors["category"] = "Please select a category."

        if not risk_rating:
            errors["risk_rating"] = "Please select a risk rating."

        if not onset_timeline:
            errors["onset_timeline"] = "Please select onset timeline."

        # Evitar duplicados (excepto el mismo theme)
        if Theme.objects.filter(
            name__iexact=name,
            category_id=category_id
        ).exclude(pk=theme.pk).exists():
            errors["name"] = "Another Threat with this name already exists in this category."

        if errors:
            return JsonResponse({"success": False, "errors": errors})

        # Guardar cambios
        theme.name = name
        theme.category_id = category_id
        theme.risk_rating = risk_rating
        theme.onset_timeline = onset_timeline
        theme.save()

        # Recargar detalle actualizado
        detail_html = render_to_string(
            "tracker/offcanvas/theme_detail_offcanvas.html",
            {
                "theme": theme,
                "show_admin_actions": request.user.is_staff or request.user.is_superuser,
            },
            request=request
        )

        return JsonResponse({
            "success": True,
            "html": detail_html,
            "theme_id": theme.pk
        })

    return HttpResponseNotAllowed(["GET", "POST"])


@login_required
def event_detail_offcanvas(request, pk):  # 🔥 CAMBIO: event_id → pk
    """
    Vista offcanvas de detalle de un Event
    """
    event = get_object_or_404(Event, pk=pk)  # ✅ Usar pk
    
    # Preparar labels de taxonomía (con protección contra None)
    risk_lv1_labels = [dict(RISK_TAXONOMY_LV1).get(v, v) for v in (event.risk_taxonomy_lv1 or [])]
    
    risk_lv2_labels = []
    for lv2_val in (event.risk_taxonomy_lv2 or []):
        found = False
        for items in RISK_TAXONOMY_LV2.values():
            for k, label in items:
                if k == lv2_val:
                    risk_lv2_labels.append(label)
                    found = True
                    break
            if found:
                break
    
    risk_lv3_labels = []
    for lv3_val in (event.risk_taxonomy_lv3 or []):
        found = False
        for items in RISK_TAXONOMY_LV3.values():
            for k, label in items:
                if k == lv3_val:
                    risk_lv3_labels.append(label)
                    found = True
                    break
            if found:
                break
    
    # Impacted lines (con protección contra None)
    impact_lobs_display = [dict(LINE_OF_BUSINESS_CHOICES).get(v, v) for v in (event.impacted_lines or [])]
    
    # Sources count
    try:
        bundle_count = Source.objects.filter(event=event, is_active=True).count()
    except:
        bundle_count = 0
    
    context = {
        'event': event,
        'risk_lv1_labels': risk_lv1_labels,
        'risk_lv2_labels': risk_lv2_labels,
        'risk_lv3_labels': risk_lv3_labels,
        'impact_lobs_display': impact_lobs_display,
        'bundle_count': bundle_count,
        'user': request.user,
    }
    
    html = render_to_string(
        'tracker/offcanvas/event_detail_offcanvas.html',
        context,
        request=request
    )
    
    return JsonResponse({
        'success': True,
        'html': html,
        'title': f'Event: {event.name}'  # ✅ Texto plano sin HTML
    })
    
# ===========================
#   ADD SOURCE GLOBAL — OFFCANVAS
# ===========================

@admin_required
def add_source_global_offcanvas(request, event_id=None):
    """
    Vista para cargar el formulario de Add Source en offcanvas
    """
    preselect_event = None
    events = Event.objects.filter(is_active=True).select_related('theme').order_by('name')
    
    # Si viene con event_id en la URL, preseleccionar ese evento
    if event_id:
        try:
            event = get_object_or_404(Event, pk=event_id, is_active=True)
            preselect_event = event.id
            # También podemos filtrar para mostrar solo ese evento si quieres
            # events = [event]  # Descomenta si quieres mostrar solo ese evento
        except Event.DoesNotExist:
            pass
    
    html = render_to_string(
        "tracker/offcanvas/add_source_offcanvas.html",
        {
            "events": events,
            "preselect_event": preselect_event,  # Pasar el ID del evento a preseleccionar
        },
        request=request
    )
    
    return JsonResponse({
        "success": True,
        "html": html,
        "title": '<i class="fas fa-plus-circle me-2"></i>Add Source'
    })

@admin_required
@transaction.atomic
def add_source_global_offcanvas_submit(request):
    """
    Procesar el formulario de Add Source desde offcanvas
    """
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Invalid method"})
    
    try:
        # Usar la misma lógica que tu función add_source pero adaptada
        # Primero, obtener el evento
        event_id = request.POST.get('event')
        if not event_id:
            return JsonResponse({
                "success": False,
                "errors": {"event": ["Please select an event"]}
            })
        
        # Obtener evento
        event = get_object_or_404(Event, pk=event_id)
        
        # Usar el batch_id para archivos temporales
        upload_batch = request.POST.get("upload_batch") or str(uuid.uuid4())
        
        # Manejar archivos temporales
        drop_ids = [int(x) for x in request.POST.getlist("drop_temp_ids") if str(x).isdigit()]
        if drop_ids:
            _clear_staged(upload_batch, only_ids=drop_ids)
        
        _stage_incoming_files(request, upload_batch, request.user)
        
        # Crear formulario
        form = SourceForm(request.POST, request.FILES, initial={"event": event})
        
        # Validar links extras
        extra_links = [v.strip() for v in request.POST.getlist("extra_links") if v and v.strip()]
        bad_links = [l for l in extra_links if not _valid_link(l)]
        if bad_links:
            form.add_error("link_or_file", "One or more additional links are invalid. Use http(s):// or mailto:.")
        
        # Obtener archivos temporales
        staged_main, staged_extras = _get_staged(upload_batch)
        
        if form.is_valid():
            selected_event = form.cleaned_data.get("event") or event
            
            summary = (form.cleaned_data.get("summary") or "").strip()
            if summary and Source.objects.filter(event=selected_event, summary__iexact=summary).exists():
                form.add_error("summary", "Summary must be different from existing ones for this event.")
            else:
                leader: Source = form.save(commit=False)
                leader.event = selected_event
                leader.created_by = request.user
                
                # Adjuntar archivo temporal principal
                if not leader.file_upload and staged_main:
                    leader.file_upload.save(staged_main.original_name, staged_main.file.file, save=False)
                
                # Verificar que haya al menos un archivo o link
                has_any = bool(leader.file_upload or leader.link_or_file or staged_extras or extra_links)
                if not has_any:
                    form.add_error(None, "Please add at least one link or file before saving.")
                else:
                    leader.source_type = "FILE" if leader.file_upload else "LINK"
                    leader.save()
                    form.save_m2m()
                    
                    # Crear links extras
                    for l in extra_links:
                        Source.objects.create(
                            event=leader.event,
                            name=leader.name,
                            source_date=leader.source_date,
                            summary=leader.summary,
                            potential_impact=leader.potential_impact,
                            potential_impact_notes=leader.potential_impact_notes,
                            link_or_file=l,
                            created_by=request.user,
                            source_type="LINK",
                        )
                    
                    # Crear archivos extras
                    for tu in staged_extras:
                        sib = Source(
                            event=leader.event,
                            name=leader.name,
                            source_date=leader.source_date,
                            summary=leader.summary,
                            potential_impact=leader.potential_impact,
                            potential_impact_notes=leader.potential_impact_notes,
                            created_by=request.user,
                            source_type="FILE",
                        )
                        sib.file_upload.save(tu.original_name, tu.file.file, save=False)
                        sib.save()
                    
                    _clear_staged(upload_batch)
                    
                    # ========== PARTE CRÍTICA AGREGADA: ==========
                    # SI ES PETICIÓN AJAX (offcanvas)
                    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                        return JsonResponse({
                            'success': True,
                            'source_id': leader.id,  # <- ID del source creado
                            'event_id': leader.event.id,  # <- ID del evento
                            'redirect_url': reverse('source_detail', kwargs={'pk': leader.id}),
                            'message': "Source created successfully!"
                        })
                    # ==============================================
                    
                    # Si no es AJAX, comportamiento normal
                    return JsonResponse({
                        "success": True,
                        "message": "Source created successfully!",
                        "redirect_url": reverse("view_event", kwargs={"event_id": leader.event_id})
                    })
        
        # Si hay errores en el formulario
        existing_summaries = list(Source.objects.filter(event=event).values_list("summary", flat=True))
        
        return JsonResponse({
            "success": False,
            "errors": form.errors.get_json_data() if form.errors else {}
        })
        
    except Exception as e:
        logger.error(f"Error in add_source_global_offcanvas_submit: {e}", exc_info=True)
        return JsonResponse({
            "success": False,
            "message": f"An error occurred: {str(e)}"
        })