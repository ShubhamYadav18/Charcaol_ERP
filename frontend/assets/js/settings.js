// Settings JS

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  document.getElementById('profileForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = this.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    const payload = {
      company_name: document.getElementById('stCompanyName').value,
      address: document.getElementById('stAddress').value,
      phone_number: document.getElementById('stPhone').value,
      tax_id: document.getElementById('stTaxId').value,
      email: document.getElementById('stEmail').value
    };

    try {
      await apiFetch('/settings/', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      
      const sidebarHeader = document.querySelector('.sidebar-header h2');
      if (sidebarHeader) {
        sidebarHeader.innerHTML = `<i class="fa-solid fa-fire-flame-curved"></i> ${payload.company_name.toUpperCase()}`;
      }
      
      showAlert('Saved', 'Company details updated.', 'success');
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });

  document.getElementById('preferencesForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = this.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    const payload = {
      currency_symbol: document.getElementById('stCurrency').value,
      weight_unit: document.getElementById('stWeightUnit').value,
      enable_email_notifications: document.getElementById('stEmailNotif').checked
    };

    try {
      await apiFetch('/settings/', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showAlert('Saved', 'Preferences updated.', 'success');
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });
});

async function loadSettings() {
  try {
    const settings = await apiFetch('/settings/');
    
    // Profile
    document.getElementById('stCompanyName').value = settings.company_name || '';
    document.getElementById('stAddress').value = settings.address || '';
    document.getElementById('stPhone').value = settings.phone_number || '';
    document.getElementById('stTaxId').value = settings.tax_id || '';
    document.getElementById('stEmail').value = settings.email || '';
    
    // Preferences
    if (settings.currency_symbol) {
        document.getElementById('stCurrency').value = settings.currency_symbol;
    }
    if (settings.weight_unit) {
        document.getElementById('stWeightUnit').value = settings.weight_unit;
    }
    document.getElementById('stEmailNotif').checked = !!settings.enable_email_notifications;
    
  } catch (error) {
    console.error('Failed to load settings', error);
  }
}
