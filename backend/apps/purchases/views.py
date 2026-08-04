from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from core.mixins import CompanyScopedMixin
from .models import Purchase
from .serializers import PurchaseSerializer

class PurchaseViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    queryset = Purchase.objects.filter(is_deleted=False).order_by('-date')
    serializer_class = PurchaseSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['supplier', 'coal_type', 'date']
    ordering_fields = ['date', 'total_amount']

    def perform_create(self, serializer):
        super().perform_create(serializer, created_by=self.request.user)
    
    def perform_destroy(self, instance):
        from apps.inventory.models import Inventory
        from django.db import transaction
        
        with transaction.atomic():
            inventory = Inventory.objects.filter(coal_type=instance.coal_type, company=instance.company).first()
            if inventory:
                inventory.total_stock_in -= instance.quantity_ton
                inventory.current_stock_ton -= instance.quantity_ton
                inventory.save()
            instance.delete()
