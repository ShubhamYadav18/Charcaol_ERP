from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from core.views import SystemSettingsView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Auth endpoints
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # App routers (we will include these as we build them)
    path('api/authentication/', include('apps.authentication.urls')),
    path('api/customers/', include('apps.customers.urls')),
    path('api/suppliers/', include('apps.suppliers.urls')),
    path('api/inventory/', include('apps.inventory.urls')),
    path('api/purchases/', include('apps.purchases.urls')),
    path('api/sales/', include('apps.sales.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/reports/', include('apps.reports.urls')),
    path('api/settings/', SystemSettingsView.as_view(), name='system_settings'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
