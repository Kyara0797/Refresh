from django.urls import path
from . import views
from tracker import views_downloads

urlpatterns = [
    # ============================================================
    #  DASHBOARD
    # ============================================================
    path("dashboard/", views.dashboard, name="dashboard"),

    # ============================================================
    #  THEMES / THREATS
    # ============================================================
    path("themes/all/", views.theme_list_all, name="theme_list_all"),
    path("themes/category/<int:category_id>/", views.theme_list_by_category, name="theme_list_by_category"),
    
    path("themes/add/", views.add_theme, name="add_theme"),
    path("themes/add/offcanvas/", views.add_theme_offcanvas, name="add_theme_offcanvas"),
    path("themes/<int:pk>/delete/", views.ThemeDeleteView.as_view(), name="delete_theme"),
    path("themes/toggle/<int:pk>/", views.toggle_theme_active, name="toggle_theme_active"),
    path("theme/<int:pk>/offcanvas/", views.theme_detail_offcanvas, name="theme_detail_offcanvas"),
    path("themes/<int:pk>/edit/offcanvas/", views.edit_theme_offcanvas, name="edit_theme_offcanvas"),

    # ============================================================
    #  EVENTS
    # ============================================================
    path("events/", views.event_list, name="event_list"),
    path("events/view/<int:event_id>/", views.view_event, name="view_event"),
    path("events/<int:pk>/edit/", views.edit_event, name="edit_event"),
    path("events/<int:pk>/delete/", views.EventDeleteView.as_view(), name="event_delete"),
    path("events/toggle/<int:pk>/", views.toggle_event_active, name="toggle_event_active"),
    path("events/add/", views.add_event, name="add_event"),
    path("events/add/<int:theme_id>/", views.add_event, name="add_event_with_theme"),
    path("events/redirect/add/", views.add_event_redirect, name="add_event_redirect"),

    # OFFCANVAS EVENTS
    path("event/add/offcanvas/", views.add_event_offcanvas, name="add_event_offcanvas"),
    path("event/<int:pk>/offcanvas/", views.event_detail_offcanvas, name="event_detail_offcanvas"),

    # ============================================================
    #  SOURCES
    # ============================================================
    path("events/<int:event_pk>/sources/add/", views.add_source, name="add_source"),
    path("sources/redirect/add/", views.add_source_redirect, name="add_source_redirect"),
    path("source/<int:pk>/", views.source_detail, name="source_detail"),
    path("source/<int:pk>/edit/", views.SourceUpdateView.as_view(), name="edit_source"),
    path("source/<int:pk>/delete/", views.SourceDeleteView.as_view(), name="delete_source"),
    path("source/<int:pk>/toggle/", views.toggle_source_active, name="toggle_source_active"),
    
    # OFFCANVAS ADD SOURCE GLOBAL
    path("source/add/global/offcanvas/", views.add_source_global_offcanvas, name="add_source_global_offcanvas"),
    path("source/add/global/offcanvas/submit/", views.add_source_global_offcanvas_submit, name="add_source_global_offcanvas_submit"),

    # ============================================================
    #  SECURE DOWNLOADS
    # ============================================================
    path("f/<str:token>/", views_downloads.secure_file_download, name="secure_file_download"),

    # ============================================================
    #  AJAX HELPERS
    # ============================================================
    path("ajax/themes/", views.get_themes, name="get_themes"),
    path("ajax/events/", views.get_events, name="get_events"),
    path('source/add/offcanvas/<int:event_id>/', views.add_source_global_offcanvas, name='add_source_offcanvas'),
    
    path('source/add/offcanvas/submit/', views.add_source_global_offcanvas_submit, name='add_source_global_offcanvas_submit'),

    # ============================================================
    #  ADMIN / LOGS
    # ============================================================
    path("access-logs/", views.access_logs, name="access_logs"),
    
    # ============================================================
    #  THEME LIST OFFCANVAS
    # ============================================================
    path("themes/all/offcanvas/", views.theme_list_offcanvas, name="theme_list_offcanvas"),

    # ============================================================
    #  AUTH
    # ============================================================
    path("login/", views.login_view, name="login"),
    path("logout/", views.custom_logout, name="logout"),
    
    
    
    
    # URLs para Eventos en offcanvas (agrega estas)
    path('event/edit/offcanvas/<int:pk>/', views.edit_event_offcanvas, name='edit_event_offcanvas'),
    path('event/add/offcanvas/', views.add_event_offcanvas, name='add_event_offcanvas'),
    
    path(
        "event/<int:pk>/edit/offcanvas/",
        views.edit_event_offcanvas,
        name="edit_event_offcanvas"
    ),

]