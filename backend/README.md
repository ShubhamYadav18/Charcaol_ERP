# Charcoal ERP Backend

This is the Django REST Framework backend for the Charcoal Business Management ERP.

## Prerequisites

- Python 3.10+
- PostgreSQL
- Node.js (for the frontend, optional if just running python server)

## Database Configuration

The backend is configured to use PostgreSQL via `python-dotenv`. Ensure your `.env` file matches your local setup:
- **Database Name**: `charcoal_erp`
- **User**: `postgres`
- **Password**: `postgres123`
- **Host**: `localhost`
- **Port**: `5433`

You must create the PostgreSQL database before running migrations:
```sql
CREATE DATABASE charcoal_erp;
```

## Setup Instructions

1. **Create Virtual Environment**:
```bash
python -m venv venv
venv\Scripts\activate
```

2. **Install Requirements**:
```bash
pip install -r requirements.txt
```

3. **Run Migrations**:
```bash
python manage.py makemigrations authentication customers suppliers inventory purchases sales payments
python manage.py migrate
```

4. **Create Admin User**:
```bash
python manage.py createsuperuser
```

5. **Run the Development Server**:
```bash
python manage.py runserver
```

## API Documentation

- Base URL: `http://localhost:8000/api/`
- All endpoints (except Login) require JWT Authentication. Pass the token as a header: `Authorization: Bearer <your_token>`

### Endpoints
- `POST /api/auth/login/` - Returns JWT Access & Refresh tokens.
- `GET/POST /api/customers/` - Customer CRUD.
- `GET/POST /api/suppliers/` - Supplier CRUD.
- `GET/POST /api/purchases/` - Purchase orders. Automatically updates Inventory & Supplier pending balance.
- `GET/POST /api/sales/` - Sales dispatch. Automatically deducts Inventory & increases Customer pending balance. Generates invoice PDFs.
- `GET/POST /api/payments/` - Payment tracking. Automatically deducts Customer pending balance.
- `GET /api/reports/dashboard/` - High-level analytics.
- `GET /api/reports/statement/<customer_id>/` - Generates a ledger statement for a customer.
