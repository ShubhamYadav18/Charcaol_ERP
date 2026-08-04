from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from core.mixins import CompanyScopedMixin
from .models import Payment, SupplierPayment
from .serializers import PaymentSerializer, SupplierPaymentSerializer

class PaymentViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    queryset = Payment.objects.filter(is_deleted=False).order_by('-date')
    serializer_class = PaymentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['customer', 'method', 'date']
    search_fields = ['reference_number']
    ordering_fields = ['date', 'amount']

    def perform_create(self, serializer):
        super().perform_create(serializer, created_by=self.request.user)
    
    def perform_destroy(self, instance):
        instance.delete()

class SupplierPaymentViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    queryset = SupplierPayment.objects.filter(is_deleted=False).order_by('-date')
    serializer_class = SupplierPaymentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['supplier', 'method', 'date']
    search_fields = ['reference_number']
    ordering_fields = ['date', 'amount']

    def perform_create(self, serializer):
        super().perform_create(serializer, created_by=self.request.user)
    
    def perform_destroy(self, instance):
        instance.delete()
