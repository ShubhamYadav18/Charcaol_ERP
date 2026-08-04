from django.db import models
from core.models import BaseModel
from apps.suppliers.models import Supplier

class Purchase(BaseModel):
    company = models.ForeignKey('core.Company', on_delete=models.CASCADE, null=True, blank=True, related_name='purchases')
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='purchases')
    date = models.DateField()
    coal_type = models.CharField(max_length=100)
    quantity_ton = models.DecimalField(max_digits=10, decimal_places=2)
    rate = models.DecimalField(max_digits=10, decimal_places=2)
    transport_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, editable=False)
    invoice_number = models.CharField(max_length=100, blank=True, null=True)

    def save(self, *args, **kwargs):
        # Auto calculate total amount
        from decimal import Decimal
        self.transport_cost = Decimal(str(self.transport_cost))
        self.total_amount = (self.quantity_ton * self.rate) + self.transport_cost
        super().save(*args, **kwargs)


    def __str__(self):
        return f"PO-{self.id} - {self.supplier.supplier_name}"
