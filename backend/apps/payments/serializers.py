from rest_framework import serializers
from .models import Payment, SupplierPayment
from apps.customers.serializers import CustomerSerializer
from apps.suppliers.serializers import SupplierSerializer

class PaymentSerializer(serializers.ModelSerializer):
    customer_details = CustomerSerializer(source='customer', read_only=True)

    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'created_by', 'is_deleted')

class SupplierPaymentSerializer(serializers.ModelSerializer):
    supplier_details = SupplierSerializer(source='supplier', read_only=True)

    class Meta:
        model = SupplierPayment
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'created_by', 'is_deleted')
