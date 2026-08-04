from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, F
from datetime import datetime, timedelta
import calendar
from apps.sales.models import Sale
from apps.purchases.models import Purchase
from apps.payments.models import Payment
from apps.customers.models import Customer
from apps.inventory.models import Inventory

def get_month_range(date_obj, offset):
    m = date_obj.month - offset
    y = date_obj.year
    while m <= 0:
        m += 12
        y -= 1
    start_date = date_obj.replace(year=y, month=m, day=1)
    last_day = calendar.monthrange(y, m)[1]
    end_date = start_date.replace(day=last_day)
    return start_date, end_date

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = datetime.now().date()
        start_of_month = today.replace(day=1)
        
        company_id = getattr(request, 'company_id', None)
        
        sales_qs = Sale.objects.filter(is_deleted=False)
        customers_qs = Customer.objects.filter(is_deleted=False)
        purchases_qs = Purchase.objects.filter(is_deleted=False)
        inventory_qs = Inventory.objects.filter(is_deleted=False)
        
        if company_id:
            sales_qs = sales_qs.filter(company_id=company_id)
            customers_qs = customers_qs.filter(company_id=company_id)
            purchases_qs = purchases_qs.filter(company_id=company_id)
            inventory_qs = inventory_qs.filter(company_id=company_id)

        # Sales stats
        monthly_sales = sales_qs.filter(date__gte=start_of_month).aggregate(
            total_qty=Sum('items__quantity_ton'),
            total_revenue=Sum('total_amount')
        )

        # Pending payments from customers
        total_pending = sum(c.calculated_pending_balance for c in customers_qs)

        # Purchase stats
        monthly_purchases = purchases_qs.filter(date__gte=start_of_month).aggregate(
            total_cost=Sum('total_amount')
        )

        # Weekly sales trend (last 4 weeks) for reports
        weekly_sales = []
        for i in range(4):
            week_end = today - timedelta(days=7*i)
            week_start = week_end - timedelta(days=7)
            week_qty = sales_qs.filter(date__gt=week_start, date__lte=week_end).aggregate(total=Sum('items__quantity_ton'))['total'] or 0
            weekly_sales.append(float(week_qty))
        weekly_sales.reverse()

        # 6-Month Revenue vs Expenses Trend
        six_month_labels = []
        six_month_revenue = []
        six_month_expenses = []
        for i in range(5, -1, -1):
            start_m, end_m = get_month_range(today, i)
            six_month_labels.append(start_m.strftime("%b"))
            
            m_rev = sales_qs.filter(date__gte=start_m, date__lte=end_m).aggregate(total=Sum('total_amount'))['total'] or 0
            m_exp = purchases_qs.filter(date__gte=start_m, date__lte=end_m).aggregate(total=Sum('total_amount'))['total'] or 0
            six_month_revenue.append(float(m_rev))
            six_month_expenses.append(float(m_exp))

        # Stock distribution
        stock_distribution = {item.coal_type: float(item.current_stock_ton) for item in inventory_qs}

        return Response({
            'monthly_sales_qty': monthly_sales['total_qty'] or 0,
            'monthly_revenue': monthly_sales['total_revenue'] or 0,
            'monthly_expenses': monthly_purchases['total_cost'] or 0,
            'total_pending_payments': total_pending,
            'weekly_sales': weekly_sales,
            'six_month_labels': six_month_labels,
            'six_month_revenue': six_month_revenue,
            'six_month_expenses': six_month_expenses,
            'stock_distribution': stock_distribution,
            'inventory': stock_distribution # existing alias
        })

class StatementReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, customer_id):
        company_id = getattr(request, 'company_id', None)
        try:
            qs = Customer.objects.filter(id=customer_id, is_deleted=False)
            if company_id:
                qs = qs.filter(company_id=company_id)
            customer = qs.get()
        except Customer.DoesNotExist:
            return Response({"error": "Customer not found"}, status=404)
        
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')

        sales = Sale.objects.filter(customer=customer, is_deleted=False).order_by('date')
        payments = Payment.objects.filter(customer=customer, is_deleted=False).order_by('date')
        
        opening_balance = 0
        
        if start_date:
            past_sales = sales.filter(date__lt=start_date).aggregate(total=Sum('total_amount'))['total'] or 0
            past_payments = payments.filter(date__lt=start_date).aggregate(total=Sum('amount'))['total'] or 0
            opening_balance = float(past_sales - past_payments)
            
            sales = sales.filter(date__gte=start_date)
            payments = payments.filter(date__gte=start_date)
            
        if end_date:
            sales = sales.filter(date__lte=end_date)
            payments = payments.filter(date__lte=end_date)
        
        ledger = []
        for s in sales:
            ledger.append({
                'date': s.date,
                'type': 'SALE',
                'ref': s.invoice_number,
                'debit': s.total_amount,
                'credit': 0,
            })
            
        for p in payments:
            ledger.append({
                'date': p.date,
                'type': 'PAYMENT',
                'ref': p.reference_number,
                'debit': 0,
                'credit': p.amount,
            })
            
        # Sort by date
        ledger.sort(key=lambda x: x['date'])
        
        # Calculate closing balance for this period
        closing_balance = opening_balance
        for entry in ledger:
            closing_balance += float(entry['debit']) - float(entry['credit'])
        
        return Response({
            'customer': customer.name,
            'opening_balance': opening_balance,
            'closing_balance': closing_balance,
            'ledger': ledger
        })

class CustomReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        report_type = request.GET.get('type')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        party_id = request.GET.get('party_id')

        if not report_type:
            return Response({"error": "report_type is required"}, status=400)

        data = []
        if report_type == 'sales':
            qs = Sale.objects.filter(is_deleted=False).select_related('customer').annotate(total_quantity=Sum('items__quantity_ton'))
            company_id = getattr(request, 'company_id', None)
            if company_id:
                qs = qs.filter(company_id=company_id)
            
            if start_date:
                qs = qs.filter(date__gte=start_date)
            if end_date:
                qs = qs.filter(date__lte=end_date)
            if party_id:
                qs = qs.filter(customer_id=party_id)
            
            for s in qs:
                data.append({
                    'id': s.invoice_number,
                    'date': str(s.date),
                    'party': s.customer.name if s.customer else '',
                    'quantity': float(s.total_quantity or 0),
                    'rate': 0, # Rate is no longer a single value per sale
                    'amount': float(s.total_amount)
                })

        elif report_type == 'purchases':
            qs = Purchase.objects.filter(is_deleted=False).select_related('supplier')
            company_id = getattr(request, 'company_id', None)
            if company_id:
                qs = qs.filter(company_id=company_id)
                
            if start_date:
                qs = qs.filter(date__gte=start_date)
            if end_date:
                qs = qs.filter(date__lte=end_date)
            if party_id:
                qs = qs.filter(supplier_id=party_id)
            
            for p in qs:
                data.append({
                    'id': str(p.id),
                    'date': str(p.date),
                    'party': p.supplier.supplier_name if p.supplier else '',
                    'quantity': float(p.quantity_ton),
                    'rate': float(p.rate),
                    'amount': float(p.total_amount)
                })

        elif report_type == 'pending_payments':
            qs = Customer.objects.filter(is_deleted=False)
            company_id = getattr(request, 'company_id', None)
            if company_id:
                qs = qs.filter(company_id=company_id)
                
            if party_id:
                qs = qs.filter(id=party_id)
            for c in qs:
                bal = c.calculated_pending_balance
                if bal > 0:
                    data.append({
                        'party': c.name,
                        'contact': c.phone,
                        'balance': float(bal)
                    })

        elif report_type == 'profit_loss':
            # Simplified Profit/Loss based on sales vs purchases for the period
            sales_qs = Sale.objects.filter(is_deleted=False)
            purchases_qs = Purchase.objects.filter(is_deleted=False)
            
            company_id = getattr(request, 'company_id', None)
            if company_id:
                sales_qs = sales_qs.filter(company_id=company_id)
                purchases_qs = purchases_qs.filter(company_id=company_id)
                
            if start_date:
                sales_qs = sales_qs.filter(date__gte=start_date)
                purchases_qs = purchases_qs.filter(date__gte=start_date)
            if end_date:
                sales_qs = sales_qs.filter(date__lte=end_date)
                purchases_qs = purchases_qs.filter(date__lte=end_date)
            
            total_sales = sales_qs.aggregate(total=Sum('total_amount'))['total'] or 0
            total_purchases = purchases_qs.aggregate(total=Sum('total_amount'))['total'] or 0
            
            data.append({
                'category': 'Total Sales',
                'amount': float(total_sales)
            })
            data.append({
                'category': 'Total Purchases',
                'amount': float(total_purchases)
            })
            data.append({
                'category': 'Net Profit/Loss',
                'amount': float(total_sales - total_purchases)
            })

        return Response(data)
