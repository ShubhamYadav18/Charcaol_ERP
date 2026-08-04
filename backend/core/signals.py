from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.purchases.models import Purchase
from apps.sales.models import Sale
from apps.payments.models import Payment, SupplierPayment
from apps.inventory.models import Inventory

@receiver(post_save, sender=Purchase)
def handle_purchase(sender, instance, created, **kwargs):
    if created and not instance.is_deleted:
        # Increase Inventory
        inventory, _ = Inventory.objects.get_or_create(coal_type=instance.coal_type)
        inventory.total_stock_in += instance.quantity_ton
        inventory.current_stock_ton += instance.quantity_ton
        inventory.save()

# handle_sale moved to SaleSerializer.create for transaction safety and item iteration

@receiver(post_save, sender=Payment)
def handle_payment(sender, instance, created, **kwargs):
    pass

@receiver(post_save, sender=SupplierPayment)
def handle_supplier_payment(sender, instance, created, **kwargs):
    pass
