import os
from io import BytesIO
from django.template.loader import get_template
from django.conf import settings
from xhtml2pdf import pisa
import base64

def generate_invoice_pdf(sale_instance):
    """
    Generates a PDF invoice from a Sale instance and saves it to media/invoices/
    """
    template_path = 'invoice_template.html' # We will assume this exists in backend/templates
    
    company_logo_data = ''
    if sale_instance.company and sale_instance.company.logo:
        try:
            with open(sale_instance.company.logo.path, "rb") as image_file:
                encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                # Determine extension to set the correct mime type
                ext = sale_instance.company.logo.path.split('.')[-1].lower()
                mime = 'image/jpeg' if ext in ['jpg', 'jpeg'] else 'image/png'
                company_logo_data = f"data:{mime};base64,{encoded_string}"
        except Exception:
            pass

    doc_title = "Bill of Supply" if "itc" in sale_instance.customer.name.lower() else "Invoice"

    context = {
        'company_name': sale_instance.company.name if sale_instance.company else 'Charcoal ERP Inc.',
        'company_address': sale_instance.company.address if sale_instance.company else '',
        'company_phone': sale_instance.company.phone if sale_instance.company else '',
        'company_email': sale_instance.company.email if sale_instance.company else '',
        'company_gst': sale_instance.company.gst_number if sale_instance.company else '',
        'company_logo': company_logo_data,
        'doc_title': doc_title,
        'invoice_number': sale_instance.invoice_number,
        'date': sale_instance.date,
        'customer_name': sale_instance.customer.name,
        'customer_address': sale_instance.customer.address,
        'customer_gst': sale_instance.customer.gst_number,
        'vehicle': sale_instance.vehicle_number,
        'driver': sale_instance.driver_name,
        'items': sale_instance.items.filter(is_deleted=False),
        'subtotal': sale_instance.subtotal,
        'tax': sale_instance.tax,
        'total': sale_instance.total_amount,
        'paid': sale_instance.paid_amount,
        'pending': sale_instance.pending_amount,
    }
    
    template = get_template(template_path)
    html = template.render(context)
    
    # Save path
    filename = f"{sale_instance.invoice_number}.pdf"
    filepath = os.path.join(settings.MEDIA_ROOT, 'invoices', filename)
    
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    with open(filepath, "w+b") as result_file:
        pisa_status = pisa.CreatePDF(html, dest=result_file)
        
    if pisa_status.err:
        return None
    return filepath
