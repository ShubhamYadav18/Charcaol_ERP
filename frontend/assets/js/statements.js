// Statements JS

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('stDate').innerText = new Date().toLocaleDateString();
  loadCustomersDropdown();
});

async function loadCustomersDropdown() {
  try {
    await window.ensureSettingsLoaded();
    const res = await apiFetch('/customers/');
    const customers = res.results || res;
    const select = document.getElementById('stParty');
    select.innerHTML = '<option value="">Select Customer...</option>';
    customers.forEach(c => {
      if(!c.is_deleted) {
        select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      }
    });
    if ($.fn.select2) {
      $('#stParty').select2({ placeholder: "Select Customer...", width: '100%' });
    }
  } catch(e) {
    console.error("Could not load customers for dropdown", e);
  }
}

async function loadStatement() {
  const partyId = document.getElementById('stParty').value;
  const startDate = document.getElementById('stStart').value;
  const endDate = document.getElementById('stEnd').value;
  
  if (!partyId) {
    showAlert('Error', 'Please select a customer first.', 'error');
    return;
  }
  
  try {
    let url = `/reports/statement/${partyId}/?`;
    if (startDate) url += `start_date=${startDate}&`;
    if (endDate) url += `end_date=${endDate}&`;
    
    const res = await apiFetch(url);
    document.getElementById('stName').innerText = res.customer;
    
    // Update Opening Balance
    const openEl = document.getElementById('stOpeningBalance');
    if(openEl) {
      openEl.innerText = `${window.getCurrencySymbol()}${parseFloat(res.opening_balance).toLocaleString()}`;
    }
    
    // Update closing balance
    const closingEl = document.getElementById('stClosingBalance');
    if(closingEl) {
      closingEl.innerText = `${window.getCurrencySymbol()}${parseFloat(res.closing_balance).toLocaleString()}`;
    }

    const tbody = document.getElementById('stBody');
    tbody.innerHTML = '';
    
    let runningBalance = parseFloat(res.opening_balance) || 0;

    res.ledger.forEach(entry => {
      const debit = parseFloat(entry.debit) || 0;
      const credit = parseFloat(entry.credit) || 0;
      runningBalance = runningBalance + debit - credit;

      tbody.innerHTML += `
        <tr style="border-bottom:1px solid #eee; color:#000;">
          <td style="padding:10px;">${window.formatDate(entry.date)}</td>
          <td style="padding:10px;">${entry.ref}</td>
          <td style="padding:10px; text-align:right;">${debit > 0 ? debit.toLocaleString() : '-'}</td>
          <td style="padding:10px; text-align:right;">${credit > 0 ? credit.toLocaleString() : '-'}</td>
          <td style="padding:10px; text-align:right;">${runningBalance.toLocaleString()}</td>
        </tr>
      `;
    });

    tbody.innerHTML += `
      <tr style="border-bottom:1px solid #eee; background:#fef2f2;">
        <td colspan="4" style="padding:10px; text-align:right; font-weight:bold;">Current Outstanding:</td>
        <td style="padding:10px; text-align:right; font-weight:bold; color:#ef4444;">${parseFloat(res.closing_balance).toLocaleString()}</td>
      </tr>
    `;

    tbody.style.opacity = 1;
  } catch (e) {
    console.error(e);
    showAlert('Error', 'Failed to load statement', 'error');
  }
}

function downloadStatementPDF() {
  const element = document.getElementById('printableStatement');
  const customerName = document.getElementById('stName').innerText.replace(/\s+/g, '_');
  const date = document.getElementById('stDate').innerText;
  
  if (customerName === 'Select_a_Customer') {
    showAlert('Error', 'Please generate a statement first.', 'warning');
    return;
  }

  const filename = `${customerName}_Statement_${date.replace(/\//g, '-')}.pdf`;
  
  const opt = {
    margin:       0.5,
    filename:     filename,
    image:        { type: 'jpeg', quality: 1.0 },
    html2canvas:  { scale: 3, useCORS: true, letterRendering: true, scrollY: 0 },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  
  html2pdf().set(opt).from(element).save();
}
