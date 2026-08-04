// Purchases JS

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('pDate').valueAsDate = new Date();
  
  loadSuppliersDropdown();
  loadPurchases();

  document.getElementById('purchaseForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    const payload = {
      supplier: parseInt(document.getElementById('pSupplier').value),
      date: document.getElementById('pDate').value,
      coal_type: document.getElementById('pType').value,
      quantity_ton: parseFloat(document.getElementById('pQty').value),
      rate: parseFloat(document.getElementById('pRate').value),
      transport_cost: parseFloat(document.getElementById('pTransport').value) || 0,
      invoice_number: document.getElementById('pInvoice').value
    };

    const editId = document.getElementById('editId').value;
    const url = editId ? `/purchases/${editId}/` : '/purchases/';
    const method = editId ? 'PUT' : 'POST';

    try {
      await apiFetch(url, {
        method: method,
        body: JSON.stringify(payload)
      });
      showAlert('Success!', 'Purchase record saved successfully.', 'success');
      this.reset();
      document.getElementById('editId').value = '';
      btn.innerHTML = '<i class="fa-solid fa-plus"></i> Save Purchase Record';
      document.getElementById('pDate').valueAsDate = new Date();
      document.getElementById('pTotalAmount').innerText = '$0.00';
      loadPurchases();
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });
});

async function loadSuppliersDropdown() {
  try {
    await window.ensureSettingsLoaded();
    const res = await apiFetch('/suppliers/');
    const suppliers = res.results || res;
    const select = document.getElementById('pSupplier');
    select.innerHTML = '<option value="">Select Supplier...</option>';
    suppliers.forEach(s => {
      if(!s.is_deleted) {
        select.innerHTML += `<option value="${s.id}">${s.supplier_name}</option>`;
      }
    });
    if ($.fn.select2) {
      $('#pSupplier').select2({ placeholder: "Select Supplier...", width: '100%' });
    }
  } catch(e) {
    console.error("Could not load suppliers for dropdown", e);
  }
}

function calcTotal() {
  const qty = parseFloat(document.getElementById('pQty').value) || 0;
  const rate = parseFloat(document.getElementById('pRate').value) || 0;
  const transport = parseFloat(document.getElementById('pTransport').value) || 0;
  
  const total = (qty * rate) + transport;
  document.getElementById('pTotalAmount').innerText = `${window.getCurrencySymbol()}${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

async function loadPurchases() {
  try {
    await window.ensureSettingsLoaded();
    const res = await apiFetch('/purchases/');
    const purchases = res.results || res;
    
    if ($.fn.DataTable.isDataTable('#purchasesTable')) {
        $('#purchasesTable').DataTable().destroy();
    }

    const tbody = document.querySelector('#purchasesTable tbody');
    tbody.innerHTML = '';
    
    purchases.forEach(p => {
      let statusBadge = p.is_deleted ? 'badge-warning' : 'badge-success';
      let status = p.is_deleted ? 'Cancelled' : 'Received';

      tbody.innerHTML += `
        <tr>
          <td>${p.invoice_number || p.id}</td>
          <td>${window.formatDate(p.date)}</td>
          <td><strong>${p.supplier_details ? p.supplier_details.name : p.supplier}</strong></td>
          <td>${p.coal_type}</td>
          <td>${p.quantity_ton} ${window.getWeightUnit()}</td>
          <td>${window.getCurrencySymbol()}${parseFloat(p.total_amount).toLocaleString()}</td>
          <td><span class="badge ${statusBadge}">${status}</span></td>
          <td>
            ${!p.is_deleted ? `<button class="btn-icon view" title="Edit" onclick="editPurchase(${p.id}, ${p.supplier}, '${p.date}', '${p.coal_type}', ${p.quantity_ton}, ${p.rate}, ${p.transport_cost || 0}, '${p.invoice_number || ''}')"><i class="fa-solid fa-pen"></i></button>` : ''}
            ${!p.is_deleted ? `<button class="btn-icon delete" title="Delete" onclick="deletePurchase(${p.id})"><i class="fa-solid fa-trash"></i></button>` : ''}
          </td>
        </tr>
      `;
    });

    $('#purchasesTable').DataTable({
      responsive: true,
      order: [[1, 'desc']],
      pageLength: 5
    });
  } catch (e) {
    console.error("Error loading purchases", e);
  }
}

function editPurchase(id, supplierId, date, coalType, qty, rate, transport, invoiceNo) {
  document.getElementById('editId').value = id;
  document.getElementById('pSupplier').value = supplierId;
  document.getElementById('pDate').value = date;
  document.getElementById('pType').value = coalType;
  document.getElementById('pQty').value = qty;
  document.getElementById('pRate').value = rate;
  document.getElementById('pTransport').value = transport;
  document.getElementById('pInvoice').value = invoiceNo;
  
  calcTotal();
  
  const btn = document.querySelector('#purchaseForm button[type="submit"]');
  btn.innerHTML = '<i class="fa-solid fa-pen"></i> Update Purchase Record';
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deletePurchase(id) {
  showConfirm('Delete Purchase?', 'Are you sure you want to delete this purchase record?', async () => {
    try {
      await apiFetch(`/purchases/${id}/`, { method: 'DELETE' });
      showAlert('Deleted!', 'Purchase has been deleted.', 'success');
      loadPurchases();
    } catch (e) {
      Swal.fire('Error', e.message, 'error');
    }
  });
}
