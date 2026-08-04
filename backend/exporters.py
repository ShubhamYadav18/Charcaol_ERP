import csv
from django.http import HttpResponse

def export_queryset_to_csv(queryset, filename, fields):
    """
    Generic function to export a Django queryset to CSV.
    fields is a dictionary mapping field names to headers: {'customer__name': 'Customer', 'total_amount': 'Total'}
    """
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{filename}.csv"'

    writer = csv.writer(response)
    # Write headers
    writer.writerow(fields.values())

    # Write data
    for obj in queryset:
        row = []
        for field in fields.keys():
            # Handle foreign key fields (e.g. customer__name)
            if '__' in field:
                parts = field.split('__')
                val = obj
                for part in parts:
                    val = getattr(val, part, '')
                row.append(val)
            else:
                row.append(getattr(obj, field, ''))
        writer.writerow(row)
        
    return response
