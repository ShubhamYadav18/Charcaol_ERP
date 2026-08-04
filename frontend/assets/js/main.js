window.erpSettings = null;

// Format date from YYYY-MM-DD to DD-MM-YYYY
window.formatDate = function(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

window.getWeightUnit = function() {
  if (window.erpSettings && window.erpSettings.weight_unit) {
    return window.erpSettings.weight_unit.match(/\((.*)\)/)?.[1] || 'MT';
  }
  return 'MT';
};

window.getCurrencySymbol = function() {
  if (window.erpSettings && window.erpSettings.currency_symbol) {
    return window.erpSettings.currency_symbol.split(' ')[0] || '₹';
  }
  return '₹';
};

window.settingsPromise = null;
window.ensureSettingsLoaded = function() {
  if (window.erpSettings) return Promise.resolve(window.erpSettings);
  if (!window.settingsPromise) {
    window.settingsPromise = apiFetch('/settings/').then(settings => {
      window.erpSettings = settings;
      return settings;
    }).catch(() => null);
  }
  return window.settingsPromise;
};

// Main JavaScript - Handles Layouts, Themes, and Initialization

document.addEventListener('DOMContentLoaded', () => {
  // Check auth before rendering
  if (typeof checkAuthGuard === 'function') {
    checkAuthGuard();
  }

  // Setup Loader
  const loader = document.createElement('div');
  loader.className = 'loader-overlay';
  loader.innerHTML = '<div class="loader"></div>';
  document.body.appendChild(loader);

  // Load Components (Sidebar, Navbar)
  Promise.all([
    fetchComponent('components/sidebar.html', 'sidebar-container'),
    fetchComponent('components/navbar.html', 'navbar-container'),
    window.ensureSettingsLoaded()
  ]).then(async () => {
    initTheme();
    initSidebar();
    initActiveLinks();
    
    try {
      // Company Switcher Logic
      const companySelect = document.getElementById('active-company-select');
      if (companySelect) {
        const activeId = localStorage.getItem('active_company_id') || '1';
        companySelect.value = activeId;
        companySelect.addEventListener('change', (e) => {
          localStorage.setItem('active_company_id', e.target.value);
          window.location.reload();
        });
      }

      const settings = window.erpSettings;
      if (settings && settings.company_name) {
        const companyId = localStorage.getItem('active_company_id') || '1';
        const defaultLogo = companyId === '2' ? 'assets/images/sanjaylogisticlogo.png' : 'assets/images/logo.png';
        const logoSrc = settings.logo ? settings.logo : defaultLogo;
        const sidebarHeader = document.querySelector('.sidebar-header h2');
        if (sidebarHeader) {
          sidebarHeader.innerHTML = `<div style="display:flex; justify-content:center; padding: 10px 0;"><img src="${logoSrc}" style="height:80px; max-width:100%; object-fit:contain; border-radius:4px;" alt="Logo"></div>`;
        }
        document.querySelectorAll('.dyn-company-logo').forEach(el => el.src = logoSrc);
        
        // Dynamically update bank details based on active company
        const activeCompId = localStorage.getItem('active_company_id') || '1';
        if (activeCompId === '2') {
          document.querySelectorAll('.dyn-bank-name').forEach(el => el.innerText = 'Central Bank of India');
          document.querySelectorAll('.dyn-bank-ac').forEach(el => el.innerText = '3265849542');
          document.querySelectorAll('.dyn-bank-ifsc').forEach(el => el.innerText = 'CBIN0280628 (Prabhadevi)');
          document.querySelectorAll('.dyn-company-sign').forEach(el => el.src = 'assets/images/sanjaylogisticssign.png');
        } else {
          document.querySelectorAll('.dyn-bank-name').forEach(el => el.innerText = 'Central Bank of India');
          document.querySelectorAll('.dyn-bank-ac').forEach(el => el.innerText = '382010093');
          document.querySelectorAll('.dyn-bank-ifsc').forEach(el => el.innerText = 'CBIN0280628 (Prabhadevi)');
          document.querySelectorAll('.dyn-company-sign').forEach(el => el.src = 'assets/images/Sign.jpg');
        }
      }
      
      const wtUnit = window.getWeightUnit();
      const currSymbol = window.getCurrencySymbol();
      document.querySelectorAll('.dyn-wt-unit').forEach(el => el.innerText = wtUnit);
      document.querySelectorAll('.dyn-curr-symbol').forEach(el => el.innerText = currSymbol);
      
      if (settings) {
        document.querySelectorAll('.dyn-company-name').forEach(el => el.innerText = settings.company_name);
        document.querySelectorAll('.dyn-company-name-upper').forEach(el => el.innerText = (settings.company_name || '').toUpperCase());
        document.querySelectorAll('.dyn-company-address').forEach(el => el.innerText = settings.address);
        document.querySelectorAll('.dyn-company-contact').forEach(el => {
          el.innerText = `Phone: ${settings.phone_number} | Email: ${settings.email || ''} | GST: ${settings.tax_id}`;
          el.style.whiteSpace = 'nowrap';
          el.style.fontSize = '0.8rem';
        });
        document.querySelectorAll('.dyn-company-merged-address').forEach(el => {
          el.innerText = `${settings.address} | Contact: ${settings.phone_number} | ${settings.email || ''}`;
        });
      }
      
    } catch (e) {
      console.warn("Could not apply global settings", e);
    }

    // Hide Loader
    setTimeout(() => {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 300);
    }, 500); // Small delay to let styles apply
  });
});

async function fetchComponent(url, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    // Determine path relative to current page
    const basePath = window.location.pathname.includes('frontend/') && !window.location.pathname.endsWith('frontend/') && !window.location.pathname.endsWith('.html') ? '../' : './';
    const response = await fetch(basePath + url + '?v=2');
    const html = await response.text();
    container.innerHTML = html;
  } catch (error) {
    console.error(`Failed to load ${url}`, error);
  }
}

function initTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  const body = document.documentElement;
  
  // Check local storage
  const savedTheme = localStorage.getItem('erp_theme') || 'light';
  body.setAttribute('data-theme', savedTheme);
  
  if (themeToggle) {
    themeToggle.innerHTML = savedTheme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    
    themeToggle.addEventListener('click', () => {
      const currentTheme = body.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      body.setAttribute('data-theme', newTheme);
      localStorage.setItem('erp_theme', newTheme);
      
      themeToggle.innerHTML = newTheme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
      
      // Update charts if they exist
      if (typeof updateChartThemes === 'function') {
        updateChartThemes(newTheme);
      }
    });
  }
}

function initSidebar() {
  const sidebarBtn = document.getElementById('mobile-sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  
  if (sidebarBtn && sidebar) {
    sidebarBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
    });
  }
}

function initActiveLinks() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const links = document.querySelectorAll('.sidebar-menu a');
  
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === 'index.html' && href === 'login.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// Global SweetAlert Helpers
window.showAlert = function(title, text, icon = 'success') {
  Swal.fire({
    title,
    text,
    icon,
    background: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1E1E1E' : '#ffffff',
    color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#111111',
    confirmButtonColor: '#FF7A00'
  });
}

window.showConfirm = function(title, text, confirmCallback) {
  Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, delete it!',
    background: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1E1E1E' : '#ffffff',
    color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#111111',
  }).then((result) => {
    if (result.isConfirmed) {
      confirmCallback();
    }
  });
}
