from rest_framework import serializers
from .models import Inventory

class InventorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Inventory
        fields = '__all__'
        read_only_fields = ('current_stock_ton', 'total_stock_in', 'total_stock_out', 'created_at', 'updated_at', 'created_by', 'is_deleted')
