from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from core.mixins import CompanyScopedMixin
from .models import Sale
from .serializers import SaleSerializer

class SaleViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    queryset = Sale.objects.filter(is_deleted=False).order_by('-date')
    serializer_class = SaleSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'customer': ['exact'],
        'items__product': ['exact'],
        'date': ['exact', 'gte', 'lte']
    }
    search_fields = ['invoice_number', 'vehicle_number']
    ordering_fields = ['date', 'total_amount']

    def perform_create(self, serializer):
        super().perform_create(serializer, created_by=self.request.user)
    
    def perform_destroy(self, instance):
        from apps.inventory.models import Inventory
        from django.db import transaction
        
        with transaction.atomic():
            for item in instance.items.filter(is_deleted=False):
                inventory = Inventory.objects.filter(coal_type=item.product, company=instance.company).first()
                if inventory:
                    inventory.total_stock_out -= item.quantity_ton
                    inventory.current_stock_ton += item.quantity_ton
                    inventory.save()
            instance.delete()
