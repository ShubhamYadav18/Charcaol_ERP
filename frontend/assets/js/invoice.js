// Invoice JS

let allSales = [];

document.addEventListener('DOMContentLoaded', () => {
  loadCustomersDropdown();
  loadSalesDropdown();
});

async function loadCustomersDropdown() {
  try {
    const res = await apiFetch('/customers/');
    const allCustomers = res.results || res;
    const select = document.getElementById('invCustomer');
    select.innerHTML = '<option value="">Select Customer...</option>';
    allCustomers.forEach(c => {
      if(!c.is_deleted) {
        select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      }
    });
    if ($.fn.select2) {
      $('#invCustomer').select2({ placeholder: "Select Customer...", width: '100%' });
    }
  } catch(e) {
    console.error("Could not load customers for dropdown", e);
  }
}

async function loadSalesDropdown() {
  try {
    const custId = document.getElementById('invCustomer') ? document.getElementById('invCustomer').value : '';
    const start = document.getElementById('invStart') ? document.getElementById('invStart').value : '';
    const end = document.getElementById('invEnd') ? document.getElementById('invEnd').value : '';
    
    let url = '/sales/';
    let params = [];
    if(custId) params.push(`customer=${custId}`);
    if(start) params.push(`date__gte=${start}`);
    if(end) params.push(`date__lte=${end}`);
    if(params.length > 0) url += '?' + params.join('&');

    const res = await apiFetch(url);
    allSales = res.results || res;
    const select = document.getElementById('invSaleRef');
    select.innerHTML = '<option value="">Select Invoice #...</option>';
    allSales.forEach(s => {
      if(!s.is_deleted) {
        const customerName = s.customer_details ? s.customer_details.name : `Customer ID ${s.customer}`;
        select.innerHTML += `<option value="${s.id}">${s.invoice_number} - ${customerName}</option>`;
      }
    });
    if ($.fn.select2) {
      $('#invSaleRef').select2({ placeholder: "Select Invoice #...", width: '100%' });
    }
  } catch(e) {
    console.error("Could not load sales for dropdown", e);
  }
}

function loadInvoiceData() {
  const saleId = document.getElementById('invSaleRef').value;
  if(!saleId) return;

  const data = allSales.find(s => s.id.toString() === saleId);
  if(!data) return;
  
  const customerName = data.customer_details ? data.customer_details.name : `Customer ID ${data.customer}`;
  
  if (customerName.toLowerCase().includes('itc')) {
    document.getElementById('invDocTitle').innerText = 'BILL OF SUPPLY';
  } else {
    document.getElementById('invDocTitle').innerText = 'INVOICE';
  }

  const customerAddr = data.customer_details ? (data.customer_details.address || '-') : '-';
  const customerGst = data.customer_details ? (data.customer_details.gst_number || '-') : '-';
  const poNumber = data.po_number || '-';

  document.getElementById('invNumber').innerText = data.invoice_number;
  document.getElementById('invPoNumber').innerText = poNumber;
  document.getElementById('invCustName').innerText = customerName;
  document.getElementById('invCustAddr').innerText = customerAddr;
  document.getElementById('invCustGst').innerText = customerGst;
  document.getElementById('invDate').innerText = window.formatDate(data.date);

  const tbody = document.getElementById('invBody');
  tbody.innerHTML = '';
  
  if (data.items && data.items.length > 0) {
    data.items.forEach(item => {
      tbody.innerHTML += `
        <tr>
          <td>${item.product}</td>
          <td>44020090</td>
          <td>${item.quantity_ton}</td>
          <td>${window.getCurrencySymbol()}${parseFloat(item.rate).toLocaleString()}</td>
          <td>${window.getCurrencySymbol()}${parseFloat(item.amount).toLocaleString()}</td>
        </tr>
      `;
    });
  }
  
  const subTotalStr = `${window.getCurrencySymbol()}${parseFloat(data.subtotal || data.total_amount).toLocaleString(undefined, {minimumFractionDigits:2})}`;
  const totalStr = `${window.getCurrencySymbol()}${parseFloat(data.total_amount).toLocaleString(undefined, {minimumFractionDigits:2})}`;
  document.getElementById('invSubTotal').innerText = subTotalStr;
  document.getElementById('invGrandTotal').innerText = totalStr;
}

function downloadInvoicePDF() {
  const element = document.getElementById('printableInvoice');
  const customerName = document.getElementById('invCustName').innerText.replace(/\s+/g, '_');
  const invoiceNo = document.getElementById('invNumber').innerText;
  
  // If no invoice is loaded
  if (invoiceNo === '-') {
    showAlert('Error', 'Please select an invoice first', 'warning');
    return;
  }

  const date = document.getElementById('invDate').innerText;
  const filename = `${customerName}_${invoiceNo}_${date}.pdf`;
  
  const opt = {
    margin:       0.3,
    filename:     filename,
    image:        { type: 'jpeg', quality: 1.0 },
    html2canvas:  { scale: 3, useCORS: true, letterRendering: true, scrollY: 0 },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  
  html2pdf().set(opt).from(element).save();
}
