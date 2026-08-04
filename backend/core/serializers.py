from rest_framework import serializers
from .models import SystemSettings

class SystemSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSettings
        fields = [
            'company_name', 'address', 'phone_number', 'email', 'tax_id',
            'currency_symbol', 'weight_unit', 'enable_email_notifications'
        ]
