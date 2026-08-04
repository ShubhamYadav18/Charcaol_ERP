from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.permissions import IsAuthenticated
from .models import SystemSettings, Company
from .serializers import SystemSettingsSerializer

class SystemSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        settings = SystemSettings.load()
        serializer = SystemSettingsSerializer(settings)
        data = serializer.data
        
        company_id = getattr(request, 'company_id', None)
        if company_id:
            try:
                company = Company.objects.get(id=company_id)
                data['company_name'] = company.name
                data['address'] = company.address or data['address']
                data['phone_number'] = company.phone or data['phone_number']
                data['email'] = company.email or data['email']
                data['tax_id'] = company.gst_number or data['tax_id']
                if company.logo:
                    data['logo'] = request.build_absolute_uri(company.logo.url)
                else:
                    data['logo'] = None
            except Company.DoesNotExist:
                pass
                
        return Response(data)

    def put(self, request):
        settings = SystemSettings.load()
        serializer = SystemSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            
            company_id = getattr(request, 'company_id', None)
            if company_id:
                try:
                    company = Company.objects.get(id=company_id)
                    updated = False
                    if 'company_name' in request.data:
                        company.name = request.data['company_name']
                        updated = True
                    if 'address' in request.data:
                        company.address = request.data['address']
                        updated = True
                    if 'phone_number' in request.data:
                        company.phone = request.data['phone_number']
                        updated = True
                    if 'email' in request.data:
                        company.email = request.data['email']
                        updated = True
                    if 'tax_id' in request.data:
                        company.gst_number = request.data['tax_id']
                        updated = True
                    if updated:
                        company.save()
                except Company.DoesNotExist:
                    pass
                    
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
