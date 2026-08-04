from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from core.mixins import CompanyScopedMixin
from .models import Customer
from .serializers import CustomerSerializer

class CustomerViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    queryset = Customer.objects.filter(is_deleted=False).order_by('-created_at')
    serializer_class = CustomerSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'phone', 'gst_number']
    ordering_fields = ['name', 'created_at', 'pending_balance']

    def perform_create(self, serializer):
        super().perform_create(serializer)
        serializer.instance.created_by = self.request.user
        serializer.instance.save()
    
    def perform_destroy(self, instance):
        instance.delete() # Triggers soft delete
