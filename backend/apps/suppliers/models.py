from django.db import models
from core.models import BaseModel

class Supplier(BaseModel):
    company = models.ForeignKey('core.Company', on_delete=models.CASCADE, null=True, blank=True, related_name='suppliers')
    supplier_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    address = models.TextField()
    coal_type = models.CharField(max_length=100) # Primary coal type supplied
    pending_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00) # Legacy

    @property
    def calculated_pending_balance(self):
        from django.db.models import Sum
        
        # Total from Purchases
        total_purchases = self.purchases.filter(is_deleted=False).aggregate(total=Sum('total_amount'))['total'] or 0
        
        # Total from Payments
        total_payments = self.payments.filter(is_deleted=False).aggregate(total=Sum('amount'))['total'] or 0
        
        return total_purchases - total_payments

    def __str__(self):
        return self.supplier_name
