from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PaymentViewSet, SupplierPaymentViewSet

router = DefaultRouter()
router.register(r'supplier', SupplierPaymentViewSet, basename='supplier-payment')
router.register(r'', PaymentViewSet, basename='payment')

urlpatterns = [
    path('', include(router.urls)),
]
