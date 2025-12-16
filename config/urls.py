"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.contrib.auth import views as auth_views
from config import settings
from tracker import views as tracker_views
from django.conf.urls.static import static
from tracker.forms import EmailOrUsernameAuthenticationForm
from django.views.generic.base import TemplateView, RedirectView
from django.shortcuts import redirect

def redirect_to_dashboard(request):
    return redirect('dashboard/')

urlpatterns = [
    path("admin/", admin.site.urls),
    
    # Redirección raíz al dashboard
    path("", RedirectView.as_view(pattern_name='dashboard'), name='root_redirect'),
    
    path("login/", auth_views.LoginView.as_view(
        template_name="registration/login.html",
        authentication_form=EmailOrUsernameAuthenticationForm
    ), name="login"),
    
    # Logout CON redirección al dashboard
    path("logout/", auth_views.LogoutView.as_view(next_page='dashboard'), name="logout"),

    path("register/", TemplateView.as_view(
        template_name="registration/register_disabled.html"
    ), name="register"),
    path("", include("tracker.urls")),
]

if settings.DEBUG and getattr(settings, "MEDIA_PROVIDER", "filesystem") == "filesystem":
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
# ] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

