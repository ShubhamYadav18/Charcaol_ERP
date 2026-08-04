// Payments JS

document.addEventListener('DOMContentLoaded', () => {
  loadCustomersDropdown();
  loadPayments();

  document.getElementById('paymentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    const payload = {
      customer: parseInt(document.getElementById('customerSelect').value),
      invoice_number: document.getElementById('payInvoiceNum').value,
      date: document.getElementById('payDate').value,
      amount: parseFloat(document.getElementById('payAmount').value),
      method: document.getElementById('payMethod').value,
      reference_number: document.getElementById('payRef').value
    };

    try {
      await apiFetch('/payments/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      closePaymentModal();
      showAlert('Success!', 'Payment recorded successfully.', 'success');
      loadPayments();
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });
});

async function loadCustomersDropdown() {
  try {
    await window.ensureSettingsLoaded();
    const res = await apiFetch('/customers/');
    const customers = res.results || res;
    
    let totalPending = 0;
    
    const select = document.getElementById('customerSelect');
    select.innerHTML = '<option value="">Select Customer...</option>';
    customers.forEach(c => {
      if(!c.is_deleted) {
        select.innerHTML += `<option value="${c.id}">${c.name} (Pending: ${window.getCurrencySymbol()}${parseFloat(c.pending_balance).toLocaleString()})</option>`;
        totalPending += parseFloat(c.pending_balance);
      }
    });

    document.getElementById('totalPendingMarket').innerText = `${window.getCurrencySymbol()}${totalPending.toLocaleString()}`;
    if ($.fn.select2) {
      $('#customerSelect').select2({ placeholder: "Select Customer...", width: '100%', dropdownParent: $('#paymentModal') });
    }
  } catch(e) {
    console.error("Could not load customers for dropdown", e);
  }
}

async function loadPayments() {
  try {
    await window.ensureSettingsLoaded();
    const res = await apiFetch('/payments/');
    const payments = res.results || res;
    
    // Calculate total received this month
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    let totalMonth = 0;

    if ($.fn.DataTable.isDataTable('#paymentsTable')) {
        $('#paymentsTable').DataTable().destroy();
    }

    const tbody = document.querySelector('#paymentsTable tbody');
    tbody.innerHTML = '';

    payments.forEach(p => {
      if (!p.is_deleted) {
        const pDate = new Date(p.date);
        if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
          totalMonth += parseFloat(p.amount);
        }
      }

      let statusBadge = p.is_deleted ? 'badge-warning' : 'badge-success';
      let status = p.is_deleted ? 'Void' : 'Completed';

      tbody.innerHTML += `
        <tr>
          <td>REC-${p.id}</td>
          <td>${window.formatDate(p.date)}</td>
          <td><strong>${p.customer_details ? p.customer_details.name : p.customer}</strong></td>
          <td>${p.invoice_number || '-'}</td>
          <td>${window.getCurrencySymbol()}${parseFloat(p.amount).toLocaleString()}</td>
          <td>${p.method.replace('_', ' ')}</td>
          <td>${p.reference_number}</td>
          <td><span class="badge ${statusBadge}">${status}</span></td>
          <td>
            ${!p.is_deleted ? `<button class="btn-icon delete" title="Delete" onclick="deletePayment(${p.id})"><i class="fa-solid fa-trash"></i></button>` : ''}
          </td>
        </tr>
      `;
    });

    document.getElementById('totalReceivedMonth').innerText = `${window.getCurrencySymbol()}${totalMonth.toLocaleString()}`;

    $('#paymentsTable').DataTable({
      responsive: true,
      order: [[1, 'desc']],
      pageLength: 10
    });
  } catch (e) {
    console.error("Error loading payments", e);
  }
}

function deletePayment(id) {
  showConfirm('Delete Payment?', 'Are you sure you want to delete this payment record?', async () => {
    try {
      await apiFetch(`/payments/${id}/`, { method: 'DELETE' });
      showAlert('Deleted!', 'Payment has been deleted.', 'success');
      loadPayments();
      loadCustomersDropdown(); // Update pending balances
    } catch (e) {
      Swal.fire('Error', e.message, 'error');
    }
  });
}

function openPaymentModal() {
  document.getElementById('payDate').valueAsDate = new Date();
  document.getElementById('paymentModal').classList.add('active');
}

function closePaymentModal() {
  document.getElementById('paymentModal').classList.remove('active');
  document.getElementById('paymentForm').reset();
}
