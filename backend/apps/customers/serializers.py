from rest_framework import serializers
from .models import Customer

class CustomerSerializer(serializers.ModelSerializer):
    pending_balance = serializers.DecimalField(source='calculated_pending_balance', max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ('pending_balance', 'created_at', 'updated_at', 'created_by', 'is_deleted')
