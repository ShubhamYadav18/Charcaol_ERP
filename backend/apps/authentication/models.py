from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('STAFF', 'Staff'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='STAFF')

    def is_admin(self):
        return self.role == 'ADMIN'
