// Customers JS

document.addEventListener('DOMContentLoaded', () => {
  loadCustomers();

  document.getElementById('customerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('custName').value;
    const phone = document.getElementById('custPhone').value;
    const gst_number = document.getElementById('custGst').value;
    const address = document.getElementById('custAddress').value;
    
    // We omit opening balance for now as pending_balance is read-only in the backend,
    // or we can allow setting it during creation if we change the DRF serializer.
    // For now we'll just submit the required fields.
    const editId = document.getElementById('editId').value;
    const url = editId ? `/customers/${editId}/` : '/customers/';
    const method = editId ? 'PUT' : 'POST';

    try {
      await apiFetch(url, {
        method: method,
        body: JSON.stringify({ name, phone, gst_number, address })
      });
      closeCustomerModal();
      showAlert('Success!', 'Customer details saved successfully.', 'success');
      loadCustomers(); // reload
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    }
  });
});

async function loadCustomers() {
  try {
    const res = await apiFetch('/customers/');
    // DRF paginated response returns data in res.results
    const customers = res.results || res;
    
    if ($.fn.DataTable.isDataTable('#customersTable')) {
        $('#customersTable').DataTable().destroy();
    }

    const tbody = document.querySelector('#customersTable tbody');
    tbody.innerHTML = '';
    
    customers.forEach(c => {
      let statusBadge = c.is_deleted ? 'badge-warning' : 'badge-success';
      let status = c.is_deleted ? 'Deleted' : 'Active';
      let balanceStr = `${window.getCurrencySymbol()}${parseFloat(c.pending_balance).toLocaleString()}`;
      if(parseFloat(c.pending_balance) > 0) {
        balanceStr = `<span style="color:var(--danger); font-weight:600;">${balanceStr}</span>`;
      } else {
        balanceStr = `<span style="color:var(--success); font-weight:600;">${balanceStr}</span>`;
      }

      tbody.innerHTML += `
        <tr>
          <td>${c.id}</td>
          <td><strong>${c.name}</strong></td>
          <td>${c.phone}</td>
          <td>${c.address}</td>
          <td>${c.gst_number || '-'}</td>
          <td>${balanceStr}</td>
          <td><span class="badge ${statusBadge}">${status}</span></td>
          <td>
            <div class="action-btns">
              <button class="btn-icon view" title="View"><i class="fa-solid fa-eye"></i></button>
              <button class="btn-icon view" title="Edit" onclick="editCustomer(${c.id}, '${c.name.replace(/'/g, "\\'")}', '${c.phone}', '${c.gst_number || ''}', '${c.address.replace(/'/g, "\\'")}')"><i class="fa-solid fa-pen"></i></button>
              <button class="btn-icon delete" title="Delete" onclick="deleteCustomer(${c.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    });

    $('#customersTable').DataTable({
      responsive: true,
      pageLength: 10
    });
  } catch (e) {
    console.error("Error loading customers", e);
  }
}

function openCustomerModal(title = 'Add New Customer') {
  document.getElementById('modalTitle').innerText = title;
  document.getElementById('customerModal').classList.add('active');
}

function editCustomer(id, name, phone, gst, address) {
  document.getElementById('editId').value = id;
  document.getElementById('custName').value = name;
  document.getElementById('custPhone').value = phone;
  document.getElementById('custGst').value = gst;
  document.getElementById('custAddress').value = address;
  
  openCustomerModal('Edit Customer');
}

function closeCustomerModal() {
  document.getElementById('customerModal').classList.remove('active');
  document.getElementById('customerForm').reset();
  document.getElementById('editId').value = '';
}

function deleteCustomer(id) {
  showConfirm('Delete Customer?', 'This action cannot be undone. All related records will be archived.', async () => {
    try {
      await apiFetch(`/customers/${id}/`, { method: 'DELETE' });
      showAlert('Deleted!', 'Customer has been deleted.', 'success');
      loadCustomers();
    } catch (e) {
      console.error(e);
      showAlert('Error', 'Failed to delete customer', 'error');
    }
  });
}
