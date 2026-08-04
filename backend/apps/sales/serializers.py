from rest_framework import serializers
from .models import Sale, SaleItem
from apps.customers.serializers import CustomerSerializer

from apps.inventory.models import Inventory
from django.db import transaction

class FilterDeletedListSerializer(serializers.ListSerializer):
    def to_representation(self, data):
        data = data.filter(is_deleted=False)
        return super().to_representation(data)

class SaleItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleItem
        list_serializer_class = FilterDeletedListSerializer
        fields = ('id', 'product', 'quantity_ton', 'unit', 'rate', 'amount')
        read_only_fields = ('id', 'amount')

class SaleSerializer(serializers.ModelSerializer):
    customer_details = CustomerSerializer(source='customer', read_only=True)
    pending_amount = serializers.DecimalField(source='calculated_pending_amount', max_digits=12, decimal_places=2, read_only=True)
    items = SaleItemSerializer(many=True, required=False)

    class Meta:
        model = Sale
        fields = '__all__'
        read_only_fields = ('total_amount', 'pending_amount', 'created_at', 'updated_at', 'created_by', 'is_deleted')
        validators = []

    def validate(self, attrs):
        invoice_number = attrs.get('invoice_number')
        request = self.context.get('request')
        company = request.company_id if request and hasattr(request, 'company_id') else None
        
        # Ensure we don't have another active sale with the same invoice number for this company
        qs = Sale.objects.filter(invoice_number=invoice_number, company_id=company, is_deleted=False)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
            
        if qs.exists():
            raise serializers.ValidationError({"invoice_number": "An active sale with this invoice number already exists."})
            
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        
        # We assume the frontend passes the correct subtotal/tax, but let's ensure it's calculated safely.
        # Actually, let's just let the frontend pass it, or we calculate it here.
        # It's safer to calculate it backend side if we have items_data.
        if items_data:
            calculated_subtotal = sum(item['quantity_ton'] * item['rate'] for item in items_data)
            validated_data['subtotal'] = calculated_subtotal
        
        sale = super().create(validated_data)
        
        for item_data in items_data:
            item = SaleItem.objects.create(
                sale=sale,
                company=sale.company,
                product=item_data['product'],
                quantity_ton=item_data['quantity_ton'],
                unit=item_data.get('unit', 'MT'),
                rate=item_data['rate']
            )
            # Decrease Inventory per item
            inventory, _ = Inventory.objects.get_or_create(
                coal_type=item.product,
                defaults={'company': sale.company, 'current_stock_ton': 0, 'total_stock_in': 0, 'total_stock_out': 0}
            )
            inventory.total_stock_out += item.quantity_ton
            inventory.current_stock_ton -= item.quantity_ton
            inventory.save()
            
        # Generate Invoice PDF after items are created
        try:
            from invoice_generator import generate_invoice_pdf
            pdf_path = generate_invoice_pdf(sale)
            if pdf_path:
                Sale.objects.filter(id=sale.id).update(invoice_pdf=f'invoices/{sale.invoice_number}.pdf')
        except Exception as e:
            print("Error generating invoice:", str(e))
            
        return sale

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        
        if items_data is not None:
            # Calculate new subtotal
            calculated_subtotal = sum(item['quantity_ton'] * item['rate'] for item in items_data)
            validated_data['subtotal'] = calculated_subtotal
            
            # Revert old items inventory and delete them
            for old_item in instance.items.filter(is_deleted=False):
                inventory, _ = Inventory.objects.get_or_create(
                    coal_type=old_item.product,
                    defaults={'company': instance.company, 'current_stock_ton': 0, 'total_stock_in': 0, 'total_stock_out': 0}
                )
                inventory.total_stock_out -= old_item.quantity_ton
                inventory.current_stock_ton += old_item.quantity_ton
                inventory.save()
                old_item.delete()
                
            # Recreate items with new payload
            for item_data in items_data:
                item = SaleItem.objects.create(
                    sale=instance,
                    company=instance.company,
                    product=item_data['product'],
                    quantity_ton=item_data['quantity_ton'],
                    unit=item_data.get('unit', 'MT'),
                    rate=item_data['rate']
                )
                inventory, _ = Inventory.objects.get_or_create(
                    coal_type=item.product,
                    defaults={'company': instance.company, 'current_stock_ton': 0, 'total_stock_in': 0, 'total_stock_out': 0}
                )
                inventory.total_stock_out += item.quantity_ton
                inventory.current_stock_ton -= item.quantity_ton
                inventory.save()
                
        sale = super().update(instance, validated_data)
        
        try:
            from invoice_generator import generate_invoice_pdf
            pdf_path = generate_invoice_pdf(sale)
            if pdf_path:
                Sale.objects.filter(id=sale.id).update(invoice_pdf=f'invoices/{sale.invoice_number}.pdf')
        except Exception as e:
            print("Error generating invoice:", str(e))
            
        return sale
