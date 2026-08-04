from django.db import models
from core.models import BaseModel

class Customer(BaseModel):
    company = models.ForeignKey('core.Company', on_delete=models.CASCADE, null=True, blank=True, related_name='customers')
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    address = models.TextField()
    gst_number = models.CharField(max_length=50, blank=True, null=True)
    pending_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00) # Legacy

    @property
    def calculated_pending_balance(self):
        from django.db.models import Sum
        
        # Total from Sales
        total_sales = self.sales.filter(is_deleted=False).aggregate(total=Sum('total_amount'))['total'] or 0
        total_paid_in_sales = self.sales.filter(is_deleted=False).aggregate(total=Sum('paid_amount'))['total'] or 0
        
        # Total from Payments
        total_payments = self.payments.filter(is_deleted=False).aggregate(total=Sum('amount'))['total'] or 0
        
        return total_sales - total_paid_in_sales - total_payments

    def __str__(self):
        return self.name
