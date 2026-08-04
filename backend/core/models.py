from django.db import models
from django.conf import settings

class BaseModel(models.Model):
    """
    Abstract base model providing audit fields and soft-delete functionality.
    """
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(app_label)s_%(class)s_created"
    )
    is_deleted = models.BooleanField(default=False)

    class Meta:
        abstract = True

    def delete(self, *args, **kwargs):
        """Soft delete logic"""
        self.is_deleted = True
        self.save()

    def hard_delete(self, *args, **kwargs):
        """Actual hard deletion from database"""
        super().delete(*args, **kwargs)

class Company(models.Model):
    name = models.CharField(max_length=255)
    logo = models.ImageField(upload_to='company_logos/', blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    gst_number = models.CharField(max_length=50, blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name

class SystemSettings(BaseModel):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    """Singleton model for application-wide settings"""
    company_name = models.CharField(max_length=255, default='Charcoal ERP Inc.')
    address = models.CharField(max_length=500, default='123 Industrial Park, Coal City, NY 10001')
    phone_number = models.CharField(max_length=50, default='+1 800-COAL-ERP')
    email = models.EmailField(max_length=255, blank=True, null=True, default='info@charcoalerp.com')
    tax_id = models.CharField(max_length=50, default='27AABCU9603R1ZX')
    
    currency_symbol = models.CharField(max_length=10, default='₹ (INR)')
    weight_unit = models.CharField(max_length=50, default='Metric Tonnes (MT)')
    enable_email_notifications = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "System Settings"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj
