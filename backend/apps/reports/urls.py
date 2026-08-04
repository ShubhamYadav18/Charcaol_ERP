from django.urls import path
from .views import DashboardStatsView, StatementReportView, CustomReportView

urlpatterns = [
    path('dashboard/', DashboardStatsView.as_view(), name='dashboard_stats'),
    path('statement/<int:customer_id>/', StatementReportView.as_view(), name='statement_report'),
    path('custom/', CustomReportView.as_view(), name='custom_report'),
]
