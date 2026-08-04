from django.db import models
from core.models import BaseModel
from apps.customers.models import Customer
import uuid

class Sale(BaseModel):
    company = models.ForeignKey('core.Company', on_delete=models.CASCADE, null=True, blank=True, related_name='sales')
    invoice_number = models.CharField(max_length=50)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='sales')
    date = models.DateField()
    # Deprecated fields removed
    
    po_number = models.CharField(max_length=100, blank=True, null=True)
    
    vehicle_number = models.CharField(max_length=50, blank=True, null=True)
    driver_name = models.CharField(max_length=100, blank=True, null=True)
    delivery_location = models.CharField(max_length=255, blank=True, null=True)
    
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, editable=False, default=0.00)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    pending_amount = models.DecimalField(max_digits=12, decimal_places=2, editable=False, default=0.00)
    payment_status = models.CharField(max_length=50, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    invoice_pdf = models.FileField(upload_to='invoices/', null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['invoice_number', 'company'],
                condition=models.Q(is_deleted=False),
                name='unique_active_invoice_per_company'
            )
        ]

    def save(self, *args, **kwargs):
        from decimal import Decimal
        self.subtotal = Decimal(str(self.subtotal))
        self.tax = Decimal(str(self.tax))
        self.paid_amount = Decimal(str(self.paid_amount))
        
        self.total_amount = self.subtotal + self.tax
        self.pending_amount = self.total_amount - self.paid_amount
        super().save(*args, **kwargs)

    @property
    def calculated_pending_amount(self):
        from django.db.models import Sum
        from apps.payments.models import Payment
        
        # Find all payments linked to this specific invoice
        payments = Payment.objects.filter(
            invoice_number=self.invoice_number, 
            is_deleted=False
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        return self.total_amount - self.paid_amount - payments

    def __str__(self):
        return f"{self.invoice_number} - {self.customer.name}"

class SaleItem(BaseModel):
    PRODUCT_CHOICES = [
        ('CHARCOAL', 'Charcoal'),
        ('FIREWOOD', 'Firewood'),
    ]
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    company = models.ForeignKey('core.Company', on_delete=models.CASCADE, null=True, blank=True, related_name='sale_items')
    product = models.CharField(max_length=100, choices=PRODUCT_CHOICES)
    quantity_ton = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=50, default='MT')
    rate = models.DecimalField(max_digits=10, decimal_places=2)
    amount = models.DecimalField(max_digits=12, decimal_places=2, editable=False)

    def save(self, *args, **kwargs):
        self.amount = self.quantity_ton * self.rate
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product} for {self.sale.invoice_number}"
