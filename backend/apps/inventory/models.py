from django.db import models
from core.models import BaseModel

class Inventory(BaseModel):
    company = models.ForeignKey('core.Company', on_delete=models.CASCADE, null=True, blank=True, related_name='inventory')
    coal_type = models.CharField(max_length=100, unique=True)
    current_stock_ton = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_stock_in = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_stock_out = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.coal_type} - {self.current_stock_ton} MT"
