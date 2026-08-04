class CompanyMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        company_id = request.headers.get('X-Company-ID')
        if company_id:
            request.company_id = company_id
        else:
            request.company_id = None
        
        response = self.get_response(request)
        return response
