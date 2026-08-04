from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from core.mixins import CompanyScopedMixin
from .models import Inventory
from .serializers import InventorySerializer

class InventoryViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    queryset = Inventory.objects.filter(is_deleted=False).order_by('coal_type')
    serializer_class = InventorySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['coal_type']

    def perform_create(self, serializer):
        super().perform_create(serializer, created_by=self.request.user)
    
    def perform_destroy(self, instance):
        instance.delete()
