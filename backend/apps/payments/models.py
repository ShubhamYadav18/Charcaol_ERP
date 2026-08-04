from django.db import models
from core.models import BaseModel
from apps.customers.models import Customer
from apps.suppliers.models import Supplier

class Payment(BaseModel):
    PAYMENT_METHODS = (
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('CREDIT_CARD', 'Credit Card'),
        ('CASH', 'Cash'),
        ('CHEQUE', 'Cheque'),
    )

    company = models.ForeignKey('core.Company', on_delete=models.CASCADE, null=True, blank=True, related_name='payments')
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='payments')
    invoice_number = models.CharField(max_length=100, blank=True, null=True)
    date = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
    reference_number = models.CharField(max_length=100)

    def __str__(self):
        return f"PAY-{self.id} - {self.customer.name}"

class SupplierPayment(BaseModel):
    PAYMENT_METHODS = (
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('CREDIT_CARD', 'Credit Card'),
        ('CASH', 'Cash'),
        ('CHEQUE', 'Cheque'),
    )

    company = models.ForeignKey('core.Company', on_delete=models.CASCADE, null=True, blank=True, related_name='supplier_payments')
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='payments')
    date = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
    reference_number = models.CharField(max_length=100)

    def __str__(self):
        return f"SPAY-{self.id} - {self.supplier.supplier_name}"
