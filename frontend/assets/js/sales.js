// Sales JS
let allCustomers = [];

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('sDate').valueAsDate = new Date();
  
  loadCustomersDropdown();
  loadSales();

  document.getElementById('salesForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
    btn.disabled = true;

    const items = [];
    document.querySelectorAll('.item-row').forEach(row => {
      items.push({
        product: row.querySelector('.item-product').value,
        quantity_ton: parseFloat(row.querySelector('.item-qty').value) || 0,
        rate: parseFloat(row.querySelector('.item-rate').value) || 0
      });
    });

    const payload = {
      invoice_number: document.getElementById('sInvoiceNum').value,
      customer: parseInt(document.getElementById('sCustomer').value),
      date: document.getElementById('sDate').value,
      po_number: document.getElementById('sPoNumber').value,
      vehicle_number: "",
      driver_name: "",
      delivery_location: "",
      paid_amount: parseFloat(document.getElementById('sPaid').value) || 0,
      items: items
    };

    const editId = document.getElementById('editId').value;
    const url = editId ? `/sales/${editId}/` : '/sales/';
    const method = editId ? 'PUT' : 'POST';

    try {
      await apiFetch(url, {
        method: method,
        body: JSON.stringify(payload)
      });
      
      showAlert('Sale Saved!', 'Sales order and invoice generated successfully.', 'success');
      this.reset();
      document.getElementById('editId').value = '';
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Generate Sale & Invoice';
      document.getElementById('sDate').valueAsDate = new Date();
      document.getElementById('sTotal').innerText = `${window.getCurrencySymbol()}0.00`;
      document.getElementById('sPending').value = '0';
      
      const container = document.getElementById('itemsContainer');
      container.innerHTML = '';
      addItemRow();

      loadSales(); // reload table
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
    allCustomers = res.results || res;
    const select = document.getElementById('sCustomer');
    select.innerHTML = '<option value="">Select Customer...</option>';
    allCustomers.forEach(c => {
      if(!c.is_deleted) {
        select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      }
    });
    if ($.fn.select2) {
      $('#sCustomer').select2({ placeholder: "Select Customer...", width: '100%' });
    }
  } catch(e) {
    console.error("Could not load customers for dropdown", e);
  }
}

function calcSales() {
  let total = 0;
  document.querySelectorAll('.item-row').forEach(row => {
    const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
    const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
    total += qty * rate;
  });
  
  const paid = parseFloat(document.getElementById('sPaid').value) || 0;
  
  let pending = total - paid;
  if (pending < 0) pending = 0;

  document.getElementById('sTotal').innerText = `${window.getCurrencySymbol()}${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  document.getElementById('sPending').value = pending.toFixed(2);
}

function addItemRow() {
  const container = document.getElementById('itemsContainer');
  const row = document.createElement('div');
  row.className = 'form-row item-row';
  row.innerHTML = `
    <div class="form-group" style="flex: 2;">
      <label>Product</label>
      <select class="form-control item-product" required>
        <option value="CHARCOAL">Charcoal</option>
        <option value="FIREWOOD">Firewood</option>
      </select>
    </div>
    <div class="form-group">
      <label>Quantity (<span class="dyn-wt-unit">${window.getWeightUnit()}</span>)</label>
      <input type="number" class="form-control item-qty" required min="1" step="0.01" oninput="calcSales()">
    </div>
    <div class="form-group">
      <label>Rate (<span class="dyn-curr-symbol">${window.getCurrencySymbol()}</span>)</label>
      <input type="number" class="form-control item-rate" required min="1" step="0.01" oninput="calcSales()">
    </div>
    <div class="form-group" style="flex: 0 0 50px; display:flex; align-items:flex-end;">
      <button type="button" class="btn-primary" style="background:var(--danger); width:100%; padding:10px;" onclick="removeItemRow(this)"><i class="fa-solid fa-trash"></i></button>
    </div>
  `;
  container.appendChild(row);
}

function removeItemRow(btn) {
  if (document.querySelectorAll('.item-row').length > 1) {
    btn.closest('.item-row').remove();
    calcSales();
  } else {
    showAlert('Warning', 'You must have at least one item.', 'warning');
  }
}

async function loadSales() {
  try {
    await window.ensureSettingsLoaded();
    const res = await apiFetch('/sales/');
    const sales = res.results || res;
    
    if ($.fn.DataTable.isDataTable('#salesTable')) {
        $('#salesTable').DataTable().destroy();
    }

    const tbody = document.querySelector('#salesTable tbody');
    tbody.innerHTML = '';
    
    sales.forEach(s => {
      let statusBadge = s.is_deleted ? 'badge-warning' : 'badge-success';
      let status = s.is_deleted ? 'Cancelled' : 'Delivered';

      let totalQty = 0;
      if (s.items && s.items.length > 0) {
        totalQty = s.items.reduce((sum, item) => sum + parseFloat(item.quantity_ton), 0);
      }
      
      tbody.innerHTML += `
        <tr>
          <td>${s.invoice_number}</td>
          <td>${window.formatDate(s.date)}</td>
          <td><strong>${s.customer_details ? s.customer_details.name : s.customer}</strong></td>
          <td>${totalQty} ${window.getWeightUnit()}</td>
          <td>${window.getCurrencySymbol()}${parseFloat(s.total_amount).toLocaleString()}</td>
          <td><span class="badge ${statusBadge}">${status}</span></td>
          <td>
            ${!s.is_deleted ? `<button class="btn-icon view" title="Edit" onclick="editSale(${s.id})"><i class="fa-solid fa-pen"></i></button>` : ''}
            ${!s.is_deleted ? `<button class="btn-icon delete" title="Delete" onclick="deleteSale(${s.id})"><i class="fa-solid fa-trash"></i></button>` : ''}
          </td>
        </tr>
      `;
    });

    $('#salesTable').DataTable({
      responsive: true,
      order: [[1, 'desc']],
      pageLength: 5
    });
  } catch (e) {
    console.error("Error loading sales", e);
  }
}

async function editSale(id) {
  try {
    const sale = await apiFetch(`/sales/${id}/`);
    
    // Populate form fields
    document.getElementById('editId').value = sale.id;
    document.getElementById('sInvoiceNum').value = sale.invoice_number;
    document.getElementById('sCustomer').value = sale.customer;
    document.getElementById('sDate').value = sale.date;
    document.getElementById('sPoNumber').value = sale.po_number || '';
    document.getElementById('sPaid').value = parseFloat(sale.paid_amount) || 0;
    
    // Clear items container
    const container = document.getElementById('itemsContainer');
    container.innerHTML = '';
    
    // Populate items
    if (sale.items && sale.items.length > 0) {
      sale.items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'form-row item-row';
        row.innerHTML = `
          <div class="form-group" style="flex: 2;">
            <label>Product</label>
            <select class="form-control item-product" required>
              <option value="CHARCOAL" ${item.product === 'CHARCOAL' ? 'selected' : ''}>Charcoal</option>
              <option value="FIREWOOD" ${item.product === 'FIREWOOD' ? 'selected' : ''}>Firewood</option>
            </select>
          </div>
          <div class="form-group">
            <label>Quantity (<span class="dyn-wt-unit">${window.getWeightUnit()}</span>)</label>
            <input type="number" class="form-control item-qty" required min="1" step="0.01" oninput="calcSales()" value="${item.quantity_ton}">
          </div>
          <div class="form-group">
            <label>Rate (<span class="dyn-curr-symbol">${window.getCurrencySymbol()}</span>)</label>
            <input type="number" class="form-control item-rate" required min="1" step="0.01" oninput="calcSales()" value="${item.rate}">
          </div>
          <div class="form-group" style="flex: 0 0 50px; display:flex; align-items:flex-end;">
            <button type="button" class="btn-primary" style="background:var(--danger); width:100%; padding:10px;" onclick="removeItemRow(this)"><i class="fa-solid fa-trash"></i></button>
          </div>
        `;
        container.appendChild(row);
      });
    } else {
      addItemRow();
    }
    
    calcSales();
    
    // Update submit button text
    const btn = document.querySelector('#salesForm button[type="submit"]');
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Update Sale & Invoice';
    
    // Scroll up to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
  } catch (e) {
    console.error("Error fetching sale for edit:", e);
    Swal.fire('Error', 'Could not load sale details.', 'error');
  }
}

function deleteSale(id) {
  showConfirm('Delete Sale?', 'Are you sure you want to delete this sale record?', async () => {
    try {
      await apiFetch(`/sales/${id}/`, { method: 'DELETE' });
      showAlert('Deleted!', 'Sale has been deleted.', 'success');
      loadSales();
    } catch (e) {
      Swal.fire('Error', e.message, 'error');
    }
  });
}

function previewInvoice() {
  const customerId = document.getElementById('sCustomer').value;
  if (!customerId) {
    showAlert('Missing Info', 'Please select a customer first.', 'warning');
    return;
  }
  
  const customer = allCustomers.find(c => c.id.toString() === customerId);
  if (!customer) return;

  const invoiceNo = document.getElementById('sInvoiceNum').value || 'DRAFT';
  const date = document.getElementById('sDate').value;
  
  let totalAmount = 0;
  const tbody = document.getElementById('prevBody');
  tbody.innerHTML = '';
  
  document.querySelectorAll('.item-row').forEach(row => {
    const coalType = row.querySelector('.item-product').value;
    const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
    const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
    const amt = qty * rate;
    totalAmount += amt;
    
    tbody.innerHTML += `
      <tr>
        <td>${coalType}</td>
        <td>44020090</td>
        <td>${qty}</td>
        <td>${window.getCurrencySymbol()}${rate.toLocaleString()}</td>
        <td>${window.getCurrencySymbol()}${amt.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
      </tr>
    `;
  });
  
  const totalStr = `${window.getCurrencySymbol()}${totalAmount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`;
  
  document.getElementById('prevCustName').innerText = customer.name;
  document.getElementById('prevCustAddr').innerText = customer.address || '-';
  document.getElementById('prevCustGst').innerText = customer.gst_number || '-';
  document.getElementById('prevNumber').innerText = invoiceNo;
  document.getElementById('prevPoNumber').innerText = document.getElementById('sPoNumber').value || '-';
  document.getElementById('prevDate').innerText = window.formatDate(date);
  document.getElementById('prevVehicle').innerText = '-';
  
  document.getElementById('prevSubTotal').innerText = totalStr;
  document.getElementById('prevGrandTotal').innerText = totalStr;

  document.getElementById('previewModal').classList.add('active');
}

function downloadInvoicePDF() {
  const element = document.getElementById('printableInvoicePreview');
  const customerName = document.getElementById('prevCustName').innerText.replace(/\s+/g, '_');
  const invoiceNo = document.getElementById('prevNumber').innerText;
  const date = document.getElementById('prevDate').innerText;
  
  const filename = `${customerName}_${invoiceNo}_${date}.pdf`;
  
  // Temporarily remove constraints on the modal so html2canvas renders the full height
  const modalContent = element.closest('.modal-content');
  const originalMaxHeight = modalContent.style.maxHeight;
  const originalOverflowY = modalContent.style.overflowY;
  
  modalContent.style.maxHeight = 'none';
  modalContent.style.overflowY = 'visible';
  
  const opt = {
    margin:       0.5,
    filename:     filename,
    image:        { type: 'jpeg', quality: 1.0 },
    html2canvas:  { scale: 3, useCORS: true, letterRendering: true, scrollY: 0 },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  
  html2pdf().set(opt).from(element).save().then(() => {
    // Restore original styles
    modalContent.style.maxHeight = originalMaxHeight;
    modalContent.style.overflowY = originalOverflowY;
  });
}
