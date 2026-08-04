from rest_framework import serializers
from .models import Purchase
from apps.suppliers.serializers import SupplierSerializer

class PurchaseSerializer(serializers.ModelSerializer):
    supplier_details = SupplierSerializer(source='supplier', read_only=True)

    class Meta:
        model = Purchase
        fields = '__all__'
        read_only_fields = ('total_amount', 'created_at', 'updated_at', 'created_by', 'is_deleted')
