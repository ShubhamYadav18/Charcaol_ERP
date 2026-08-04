class CompanyScopedMixin:
    """
    Mixin to filter querysets by the active company_id
    and auto-stamp newly created records with the active company_id.
    """
    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(self.request, 'company_id') and self.request.company_id:
            if hasattr(qs.model, 'company_id'):
                return qs.filter(company_id=self.request.company_id)
        return qs

    def perform_create(self, serializer, **kwargs):
        if hasattr(self.request, 'company_id') and self.request.company_id:
            kwargs['company_id'] = self.request.company_id
        serializer.save(**kwargs)
