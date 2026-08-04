from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from core.mixins import CompanyScopedMixin
from .models import Supplier
from .serializers import SupplierSerializer

class SupplierViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    queryset = Supplier.objects.filter(is_deleted=False).order_by('-created_at')
    serializer_class = SupplierSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['supplier_name', 'phone', 'coal_type']
    ordering_fields = ['supplier_name', 'created_at', 'pending_balance']

    def perform_create(self, serializer):
        super().perform_create(serializer, created_by=self.request.user)
    
    def perform_destroy(self, instance):
        instance.delete()
