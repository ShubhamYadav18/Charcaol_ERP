// Suppliers JS

document.addEventListener('DOMContentLoaded', () => {
  loadSuppliers();

  document.getElementById('supplierForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    const name = document.getElementById('supName').value;
    const phone = document.getElementById('supPhone').value;
    const contact_person = document.getElementById('supContact').value;
    const coal_type = document.getElementById('supType').value;
    const address = document.getElementById('supAddress').value;

    const editId = document.getElementById('editId').value;
    const url = editId ? `/suppliers/${editId}/` : '/suppliers/';
    const method = editId ? 'PUT' : 'POST';

    const payload = {
      supplier_name: name,
      contact_person: contact_person,
      phone: phone,
      coal_type: coal_type,
      address: address
    };

    try {
      await apiFetch(url, {
        method: method,
        body: JSON.stringify(payload)
      });
      closeSupplierModal();
      showAlert('Success!', editId ? 'Supplier updated successfully.' : 'Supplier details saved successfully.', 'success');
      loadSuppliers();
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });
});

async function loadSuppliers() {
  try {
    const res = await apiFetch('/suppliers/');
    const suppliers = res.results || res;
    
    if ($.fn.DataTable.isDataTable('#suppliersTable')) {
        $('#suppliersTable').DataTable().destroy();
    }

    const tbody = document.querySelector('#suppliersTable tbody');
    tbody.innerHTML = '';

    suppliers.forEach(s => {
      let statusBadge = s.is_deleted ? 'badge-warning' : 'badge-success';
      let status = s.is_deleted ? 'Inactive' : 'Active';
      let balanceStr = `${window.getCurrencySymbol()}${parseFloat(s.pending_balance).toLocaleString()}`;
      if(parseFloat(s.pending_balance) > 0) {
        balanceStr = `<span style="color:var(--warning); font-weight:600;">${balanceStr}</span>`;
      } else {
        balanceStr = `<span style="color:var(--text-muted); font-weight:600;">${balanceStr}</span>`;
      }

      tbody.innerHTML += `
        <tr>
          <td>${s.id}</td>
          <td><strong>${s.supplier_name}</strong></td>
          <td>${s.phone}</td>
          <td>${s.address}</td>
          <td>${balanceStr}</td>
          <td><span class="badge ${statusBadge}">${status}</span></td>
          <td>
            <div class="action-btns">
              ${!s.is_deleted ? `<button class="btn-icon view" title="Edit" onclick="editSupplier(${s.id}, '${s.supplier_name}', '${s.phone}', '${s.coal_type}', '${s.address}')"><i class="fa-solid fa-pen"></i></button>` : ''}
              ${!s.is_deleted ? `<button class="btn-icon delete" title="Delete" onclick="deleteSupplier(${s.id})"><i class="fa-solid fa-trash"></i></button>` : ''}
            </div>
          </td>
        </tr>
      `;
    });

    $('#suppliersTable').DataTable({
      responsive: true,
      pageLength: 10
    });
  } catch (e) {
    console.error("Error loading suppliers", e);
  }
}

function openSupplierModal(title = 'Add New Supplier') {
  document.getElementById('modalTitle').innerText = title;
  document.getElementById('supplierModal').classList.add('active');
}

function closeSupplierModal() {
  document.getElementById('supplierModal').classList.remove('active');
  document.getElementById('supplierForm').reset();
  document.getElementById('editId').value = '';
}

function editSupplier(id, name, phone, coalType, address) {
  document.getElementById('editId').value = id;
  document.getElementById('supName').value = name;
  document.getElementById('supPhone').value = phone;
  document.getElementById('supType').value = coalType;
  document.getElementById('supAddress').value = address;
  openSupplierModal('Edit Supplier');
}

function deleteSupplier(id) {
  showConfirm('Delete Supplier?', 'Are you sure you want to delete this supplier?', async () => {
    try {
      await apiFetch(`/suppliers/${id}/`, { method: 'DELETE' });
      showAlert('Deleted!', 'Supplier has been deleted.', 'success');
      loadSuppliers();
    } catch (e) {
      Swal.fire('Error', e.message, 'error');
    }
  });
}
