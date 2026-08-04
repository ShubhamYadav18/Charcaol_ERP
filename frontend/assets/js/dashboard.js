// Dashboard JS
let revenueChartInstance;
let stockChartInstance;

document.addEventListener('DOMContentLoaded', () => {
  initCharts();
  loadRecentTransactions();
});

function initCharts() {
  const ctxRev = document.getElementById('revenueChart').getContext('2d');
  const ctxStock = document.getElementById('stockChart').getContext('2d');
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#ffffff' : '#111111';
  const gridColor = isDark ? '#3A3A3A' : '#e0e0e0';

  revenueChartInstance = new Chart(ctxRev, {
    type: 'line',
    data: {
      labels: [], // Will be updated by API
      datasets: [
        {
          label: 'Revenue',
          data: [],
          borderColor: '#FF7A00',
          backgroundColor: 'rgba(255, 122, 0, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Expenses',
          data: [],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: textColor } } },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor } },
        y: { grid: { color: gridColor }, ticks: { color: textColor } }
      }
    }
  });

  stockChartInstance = new Chart(ctxStock, {
    type: 'doughnut',
    data: {
      labels: [], // Will be updated by API
      datasets: [{
        data: [],
        backgroundColor: ['#111111', '#FF7A00', '#555555', '#10b981', '#3b82f6'],
        borderColor: isDark ? '#1E1E1E' : '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { color: textColor } } }
    }
  });
}

function updateChartThemes(theme) {
  const isDark = theme === 'dark';
  const textColor = isDark ? '#ffffff' : '#111111';
  const gridColor = isDark ? '#3A3A3A' : '#e0e0e0';

  if (revenueChartInstance) {
    revenueChartInstance.options.plugins.legend.labels.color = textColor;
    revenueChartInstance.options.scales.x.grid.color = gridColor;
    revenueChartInstance.options.scales.x.ticks.color = textColor;
    revenueChartInstance.options.scales.y.grid.color = gridColor;
    revenueChartInstance.options.scales.y.ticks.color = textColor;
    revenueChartInstance.update();
  }

  if (stockChartInstance) {
    stockChartInstance.options.plugins.legend.labels.color = textColor;
    stockChartInstance.data.datasets[0].borderColor = isDark ? '#1E1E1E' : '#ffffff';
    stockChartInstance.update();
  }
}

async function loadRecentTransactions() {
  try {
    await window.ensureSettingsLoaded();
    
    // 1. Fetch Dashboard Stats
    const dashboardStats = await apiFetch('/reports/dashboard/');
    if (dashboardStats) {
      const pTags = document.querySelectorAll('.stat-info p');
      if (pTags.length >= 4) {
        // Stock
        let totalStock = 0;
        if(dashboardStats.inventory) {
          totalStock = Object.values(dashboardStats.inventory).reduce((a,b) => a+b, 0);
        }
        pTags[0].innerText = `${totalStock.toLocaleString()} ${window.getWeightUnit()}`;
        
        // Sales Qty
        pTags[1].innerText = `${(dashboardStats.monthly_sales_qty || 0).toLocaleString()} ${window.getWeightUnit()}`;
        
        // Revenue
        pTags[2].innerText = `${window.getCurrencySymbol()}${(dashboardStats.monthly_revenue || 0).toLocaleString()}`;
        
        // Pending
        pTags[3].innerText = `${window.getCurrencySymbol()}${(dashboardStats.total_pending_payments || 0).toLocaleString()}`;
      }

      // Update Charts
      if (revenueChartInstance && dashboardStats.six_month_labels) {
        revenueChartInstance.data.labels = dashboardStats.six_month_labels;
        revenueChartInstance.data.datasets[0].data = dashboardStats.six_month_revenue;
        revenueChartInstance.data.datasets[1].data = dashboardStats.six_month_expenses;
        revenueChartInstance.update();
      }

      if (stockChartInstance && dashboardStats.stock_distribution) {
        const labels = Object.keys(dashboardStats.stock_distribution);
        const values = Object.values(dashboardStats.stock_distribution);
        const total = values.reduce((a, b) => a + b, 0);

        if (total === 0) {
          // Display an empty placeholder circle if stock is exactly 0
          stockChartInstance.data.labels = ['Out of Stock'];
          stockChartInstance.data.datasets[0].data = [1];
          stockChartInstance.data.datasets[0].backgroundColor = ['#e0e0e0']; // Light grey
        } else {
          stockChartInstance.data.labels = labels;
          stockChartInstance.data.datasets[0].data = values;
          stockChartInstance.data.datasets[0].backgroundColor = ['#111111', '#FF7A00', '#555555', '#10b981', '#3b82f6'];
        }
        stockChartInstance.update();
      }
    }

    // 2. Fetch Sales and Purchases for Table
    const resSales = await apiFetch('/sales/');
    const resPurchases = await apiFetch('/purchases/');
    
    const sales = resSales.results || resSales || [];
    const purchases = resPurchases.results || resPurchases || [];

    const data = [];
    sales.forEach(s => data.push({
      id: s.invoice_number, 
      date: s.date, 
      type: 'Sale', 
      party: s.customer_details ? s.customer_details.name : s.customer, 
      amount: `${window.getCurrencySymbol()}${parseFloat(s.total_amount).toLocaleString()}`, 
      status: s.is_deleted ? 'Cancelled' : 'Delivered'
    }));
    
    purchases.forEach(p => data.push({
      id: p.id, 
      date: p.date, 
      type: 'Purchase', 
      party: p.supplier_details ? p.supplier_details.name : p.supplier, 
      amount: `${window.getCurrencySymbol()}${parseFloat(p.total_amount).toLocaleString()}`, 
      status: p.is_deleted ? 'Cancelled' : 'Completed'
    }));

    // Sort by date desc
    data.sort((a,b) => new Date(b.date) - new Date(a.date));

    if ($.fn.DataTable.isDataTable('#dashboardTable')) {
        $('#dashboardTable').DataTable().destroy();
    }

    const tbody = document.querySelector('#dashboardTable tbody');
    tbody.innerHTML = '';
    
    data.forEach(item => {
      let badgeClass = 'badge-success';
      if (item.status === 'Cancelled') badgeClass = 'badge-warning';
      
      tbody.innerHTML += `
        <tr>
          <td>${item.id}</td>
          <td>${window.formatDate(item.date)}</td>
          <td><strong>${item.type}</strong></td>
          <td>${item.party}</td>
          <td>${item.amount}</td>
          <td><span class="badge ${badgeClass}">${item.status}</span></td>
        </tr>
      `;
    });

    $('#dashboardTable').DataTable({
      pageLength: 5,
      lengthMenu: [5, 10, 25],
      responsive: true,
      order: [[1, 'desc']]
    });
  } catch(e) {
    console.error("Error loading dashboard data", e);
  }
}
