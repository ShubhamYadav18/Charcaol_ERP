// Reports JS
let trendChart;
let reportDataTable;
let currentReportData = [];
let currentReportType = '';

document.addEventListener('DOMContentLoaded', async () => {
  await window.ensureSettingsLoaded();
  
  // Set default dates
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  document.getElementById('rStart').value = firstDay.toISOString().split('T')[0];
  document.getElementById('rEnd').value = today.toISOString().split('T')[0];

  // Setup Excel Export
  document.getElementById('btnExportExcel').addEventListener('click', exportToExcel);
  
  // Setup PDF Export
  document.getElementById('btnExportPDF').addEventListener('click', exportToPDF);
  
  // Setup dynamic dropdown
  document.getElementById('rType').addEventListener('change', updatePartyDropdown);
  updatePartyDropdown(); // initialize on load
});

async function updatePartyDropdown() {
  const type = document.getElementById('rType').value;
  const group = document.getElementById('rPartyGroup');
  const label = document.getElementById('rPartyLabel');
  const select = document.getElementById('rParty');
  
  if (type === 'sales' || type === 'pending_payments') {
    group.style.display = 'block';
    label.innerText = 'Customer';
    select.innerHTML = '<option value="">All Customers</option>';
    try {
      const res = await apiFetch('/customers/');
      const data = res.results || res;
      data.forEach(d => {
        if(!d.is_deleted) select.innerHTML += `<option value="${d.id}">${d.name}</option>`;
      });
      if ($.fn.select2) $('#rParty').select2({ placeholder: "All Customers", width: '100%' });
    } catch(e) { console.error(e); }
  } else if (type === 'purchases') {
    group.style.display = 'block';
    label.innerText = 'Supplier';
    select.innerHTML = '<option value="">All Suppliers</option>';
    try {
      const res = await apiFetch('/suppliers/');
      const data = res.results || res;
      data.forEach(d => {
        if(!d.is_deleted) select.innerHTML += `<option value="${d.id}">${d.supplier_name}</option>`;
      });
      if ($.fn.select2) $('#rParty').select2({ placeholder: "All Suppliers", width: '100%' });
    } catch(e) { console.error(e); }
  } else {
    group.style.display = 'none';
    select.value = '';
  }
}

async function generateReport() {
  const btn = event.currentTarget;
  const originalHtml = btn.innerHTML;
  
  const rType = document.getElementById('rType').value;
  const rStart = document.getElementById('rStart').value;
  const rEnd = document.getElementById('rEnd').value;
  const rParty = document.getElementById('rParty').value;
  
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
  btn.disabled = true;
  
  try {
    let url = `/reports/custom/?type=${rType}`;
    if (rStart) url += `&start_date=${rStart}`;
    if (rEnd) url += `&end_date=${rEnd}`;
    if (rParty) url += `&party_id=${rParty}`;
    
    const data = await apiFetch(url);
    currentReportData = data;
    currentReportType = rType;
    
    renderReportTable(rType, data);
    renderReportChart(rType, data);
    
    // Show trend chart
    document.getElementById('trendCard').style.display = 'block';
    
    // Set title
    const typeLabel = document.querySelector(`#rType option[value="${rType}"]`).innerText;
    document.getElementById('reportTitle').innerText = `${typeLabel} (${rStart || 'Any'} to ${rEnd || 'Any'})`;
    
    showAlert('Report Generated', `Loaded ${data.length} records.`, 'success');
  } catch (error) {
    Swal.fire('Error', error.message, 'error');
  } finally {
    btn.innerHTML = originalHtml;
    btn.disabled = false;
  }
}

function renderReportTable(type, data) {
  if ($.fn.DataTable.isDataTable('#reportTable')) {
    $('#reportTable').DataTable().destroy();
  }
  
  const table = document.getElementById('reportTable');
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  
  thead.innerHTML = '';
  tbody.innerHTML = '';
  
  const curr = window.getCurrencySymbol();
  const wt = window.getWeightUnit();
  
  let headers = [];
  
  if (type === 'sales' || type === 'purchases') {
    headers = ['ID', 'Date', 'Party', `Quantity (${wt})`, `Rate (${curr})`, `Amount (${curr})`];
    thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    
    data.forEach(row => {
      tbody.innerHTML += `<tr>
        <td>${row.id}</td>
        <td>${window.formatDate(row.date)}</td>
        <td>${row.party}</td>
        <td>${row.quantity}</td>
        <td>${curr}${row.rate.toLocaleString()}</td>
        <td>${curr}${row.amount.toLocaleString()}</td>
      </tr>`;
    });
  } else if (type === 'pending_payments') {
    headers = ['Party', 'Contact', `Balance (${curr})`];
    thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    
    data.forEach(row => {
      tbody.innerHTML += `<tr>
        <td>${row.party}</td>
        <td>${row.contact}</td>
        <td style="color:var(--danger); font-weight:bold;">${curr}${row.balance.toLocaleString()}</td>
      </tr>`;
    });
  } else if (type === 'profit_loss') {
    headers = ['Category', `Amount (${curr})`];
    thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    
    data.forEach(row => {
      let color = 'inherit';
      if (row.category === 'Net Profit/Loss') {
        color = row.amount >= 0 ? 'var(--success)' : 'var(--danger)';
      }
      tbody.innerHTML += `<tr>
        <td><strong>${row.category}</strong></td>
        <td style="color:${color}; font-weight:bold;">${curr}${row.amount.toLocaleString()}</td>
      </tr>`;
    });
  }

  reportDataTable = $('#reportTable').DataTable({
    pageLength: 25,
    responsive: true
  });
}

function renderReportChart(type, data) {
  const ctx = document.getElementById('salesTrendChart').getContext('2d');
  
  if (trendChart) {
    trendChart.destroy();
  }
  
  if (data.length === 0) {
    document.getElementById('trendCard').style.display = 'none';
    return;
  }
  
  let labels = [];
  let values = [];
  let labelName = 'Amount';
  let chartType = 'bar';
  let colors = [];
  
  if (type === 'sales' || type === 'purchases') {
    // Group by Date
    const grouped = {};
    data.forEach(d => {
      if(!grouped[d.date]) grouped[d.date] = 0;
      grouped[d.date] += d.amount;
    });
    
    // Sort by Date
    labels = Object.keys(grouped).sort();
    values = labels.map(l => grouped[l]);
    labelName = type === 'sales' ? 'Daily Sales Amount' : 'Daily Purchase Amount';
    chartType = 'line';
    colors = type === 'sales' ? '#10b981' : '#f59e0b';
    
    document.querySelector('#trendCard h3').innerText = type === 'sales' ? 'Sales Trend' : 'Purchases Trend';
  } else if (type === 'pending_payments') {
    // Top 10 by balance
    const sorted = [...data].sort((a,b) => b.balance - a.balance).slice(0, 10);
    labels = sorted.map(d => d.party);
    values = sorted.map(d => d.balance);
    labelName = 'Pending Balance';
    chartType = 'bar';
    colors = '#ef4444';
    
    document.querySelector('#trendCard h3').innerText = 'Top 10 Pending Balances';
  } else if (type === 'profit_loss') {
    labels = data.map(d => d.category);
    values = data.map(d => d.amount);
    labelName = 'Amount';
    chartType = 'bar';
    colors = data.map(d => d.amount >= 0 ? '#10b981' : '#ef4444');
    
    document.querySelector('#trendCard h3').innerText = 'Profit & Loss Breakdown';
  }

  trendChart = new Chart(ctx, {
    type: chartType,
    data: {
      labels: labels,
      datasets: [{
        label: labelName,
        data: values,
        backgroundColor: colors,
        borderColor: colors,
        borderWidth: 1,
        fill: chartType === 'line' ? true : false,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function exportToExcel() {
  if (currentReportData.length === 0) {
    showAlert('No Data', 'Please generate a report first.', 'warning');
    return;
  }
  
  const worksheet = XLSX.utils.json_to_sheet(currentReportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  XLSX.writeFile(workbook, `Report_${currentReportType}_${new Date().getTime()}.xlsx`);
}

function exportToPDF() {
  if (currentReportData.length === 0) {
    showAlert('No Data', 'Please generate a report first.', 'warning');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  const title = document.getElementById('reportTitle').innerText;
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
  
  doc.autoTable({
    html: '#reportTable',
    startY: 40,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [255, 122, 0] } // Charcoal ERP Orange
  });
  
  doc.save(`Report_${currentReportType}_${new Date().getTime()}.pdf`);
}
