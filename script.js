const API_BASE_URL = 'http://127.0.0.1:8000/';
let accessToken = localStorage.getItem('access');
const refreshToken = localStorage.getItem('refresh');
let isEditing = false;
let currentCashflowId = null;

// Autentifikatsiya tekshiruvi
if (!accessToken || !refreshToken) {
    console.error('No access or refresh token found, redirecting to login');
    window.location.href = '/login.html';
}

// Token yangilash funksiyasi
async function refreshAccessToken() {
    if (!refreshToken) {
        console.error('No refresh token available');
        window.location.href = '/login.html';
        throw new Error('No refresh token');
    }
    try {
        const response = await fetch(`${API_BASE_URL}token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken })
        });
        const data = await response.json();
        if (response.ok) {
            accessToken = data.access;
            localStorage.setItem('access', accessToken);
            return accessToken;
        } else {
            console.error('Refresh token error:', data);
            localStorage.removeItem('access');
            localStorage.removeItem('refresh');
            window.location.href = '/login.html';
            throw new Error(data.detail || 'Failed to refresh token');
        }
    } catch (error) {
        console.error('Error refreshing token:', error);
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        window.location.href = '/login.html';
        throw error;
    }
}

// API so'rov funksiyasi
async function apiRequest(url, options = {}) {
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    };
    try {
        const response = await fetch(url, options);
        if (response.status === 401) {
            const newToken = await refreshAccessToken();
            options.headers['Authorization'] = `Bearer ${newToken}`;
            return await fetch(url, options);
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`API error: ${response.status} ${response.statusText}`, errorData);
            throw new Error(errorData.detail || Object.entries(errorData).map(([key, errors]) => `${key}: ${errors.join(', ')}`).join('; ') || response.statusText);
        }
        return response;
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

// Dropdown'larni to'ldirish
async function populateTypeDropdown() {
    const formError = document.getElementById('form-error');
    try {
        const response = await apiRequest(`${API_BASE_URL}category/types/`);
        const types = await response.json();
        console.log('Types from API:', types);
        const typeSelect = document.getElementById('type');
        typeSelect.innerHTML = '<option value="" disabled selected>Select Type</option>';
        (types.results || types).forEach(type => {
            typeSelect.innerHTML += `<option value="${type.id}">${type.name}</option>`;
        });
        if ((types.results || types).length === 0) {
            typeSelect.innerHTML += '<option value="" disabled>No types available</option>';
            formError.textContent = 'No types available. Please create a type first.';
            formError.classList.remove('hidden');
            setTimeout(() => formError.classList.add('hidden'), 3000);
        }
    } catch (error) {
        console.error('Error fetching types:', error);
        formError.textContent = `Failed to load types: ${error.message}`;
        formError.classList.remove('hidden');
        setTimeout(() => formError.classList.add('hidden'), 3000);
    }
}

async function populateCategoryDropdown(typeId = null) {
    const formError = document.getElementById('form-error');
    const categorySelect = document.getElementById('category');
    categorySelect.innerHTML = '<option value="" disabled selected>Select Category</option>';
    try {
        const url = typeId ? `${API_BASE_URL}category/categories/?type=${typeId}` : `${API_BASE_URL}category/categories/`;
        const response = await apiRequest(url);
        const categories = await response.json();
        console.log('Categories from API:', categories);
        (categories.results || categories).forEach(category => {
            categorySelect.innerHTML += `<option value="${category.id}">${category.name}</option>`;
        });
        if ((categories.results || categories).length === 0) {
            categorySelect.innerHTML += '<option value="" disabled>No categories available</option>';
            formError.textContent = 'No categories available for this type. Please create a category first.';
            formError.classList.remove('hidden');
            setTimeout(() => formError.classList.add('hidden'), 3000);
        }
    } catch (error) {
        console.error('Error fetching categories:', error);
        formError.textContent = `Failed to load categories: ${error.message}`;
        formError.classList.remove('hidden');
        setTimeout(() => formError.classList.add('hidden'), 3000);
    }
}

async function populateSubcategoryDropdown(categoryId = null) {
    const formError = document.getElementById('form-error');
    const subcategorySelect = document.getElementById('subcategory');
    subcategorySelect.innerHTML = '<option value="" disabled selected>Select Subcategory</option>';
    try {
        const url = categoryId ? `${API_BASE_URL}category/subcategories/?category=${categoryId}` : `${API_BASE_URL}category/subcategories/`;
        const response = await apiRequest(url);
        const subcategories = await response.json();
        console.log('Subcategories from API:', subcategories);
        (subcategories.results || subcategories).forEach(subcategory => {
            subcategorySelect.innerHTML += `<option value="${subcategory.id}">${subcategory.name}</option>`;
        });
        if ((subcategories.results || subcategories).length === 0) {
            subcategorySelect.innerHTML += `<option value="" disabled>No subcategories available</option>`;
            formError.textContent = 'No subcategories available for this category. Please create a subcategory first.';
            formError.classList.remove('hidden');
            setTimeout(() => formError.classList.add('hidden'), 3000);
        }
    } catch (error) {
        console.error('Error fetching subcategories:', error);
        formError.textContent = `Failed to load subcategories: ${error.message}`;
        formError.classList.remove('hidden');
        setTimeout(() => formError.classList.add('hidden'), 3000);
    }
}

async function populateStatusDropdown() {
    const formError = document.getElementById('form-error');
    try {
        const response = await apiRequest(`${API_BASE_URL}cash/status/`);
        const statuses = await response.json();
        console.log('Statuses from API:', statuses);
        const statusSelect = document.getElementById('status');
        statusSelect.innerHTML = '<option value="" disabled selected>Select Status</option>';
        (statuses.results || statuses).forEach(status => {
            statusSelect.innerHTML += `<option value="${status.id}">${status.name}</option>`;
        });
        if ((statuses.results || statuses).length === 0) {
            statusSelect.innerHTML += '<option value="" disabled>No statuses available</option>';
            formError.textContent = 'No statuses available. Please create a status first.';
            formError.classList.remove('hidden');
            setTimeout(() => formError.classList.add('hidden'), 3000);
        }
    } catch (error) {
        console.error('Error fetching statuses:', error);
        formError.textContent = `Failed to load statuses: ${error.message}`;
        formError.classList.remove('hidden');
        setTimeout(() => formError.classList.add('hidden'), 3000);
    }
}

// Dropdown bog'liqliklari
document.getElementById('type').addEventListener('change', (e) => {
    const typeId = e.target.value;
    populateCategoryDropdown(typeId);
    document.getElementById('category').value = '';
    populateSubcategoryDropdown(null);
    document.getElementById('subcategory').value = '';
});

document.getElementById('category').addEventListener('change', (e) => {
    const categoryId = e.target.value;
    populateSubcategoryDropdown(categoryId);
    document.getElementById('subcategory').value = '';
});

// Bugungi sanani formatlash (YYYY-MM-DD)
function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// CashFlow rekordlarini olish
async function fetchCashFlows() {
    const cashflowTableBody = document.getElementById('cashflow-table-body');
    const formError = document.getElementById('form-error');
    cashflowTableBody.innerHTML = '<tr><td colspan="9" class="py-2 px-4 text-gray-500">Loading...</td></tr>';
    try {
        const response = await apiRequest(`${API_BASE_URL}cash/cashflow/`);
        console.log('Raw API response status:', response.status, response.statusText);
        const cashflows = await response.json();
        console.log('CashFlow records from API:', cashflows);
        cashflowTableBody.innerHTML = '';
        const cashflowList = cashflows.results || cashflows;
        if (!Array.isArray(cashflowList)) {
            console.error('Invalid cashflow data format:', cashflowList);
            cashflowTableBody.innerHTML = '<tr><td colspan="9" class="py-2 px-4 text-gray-500">Invalid data format from server.</td></tr>';
            formError.textContent = 'Failed to load cash flows: Invalid data format.';
            formError.classList.remove('hidden');
            setTimeout(() => formError.classList.add('hidden'), 3000);
            return;
        }
        if (cashflowList.length === 0) {
            cashflowTableBody.innerHTML = '<tr><td colspan="9" class="py-2 px-4 text-gray-500">No cash flow records found. Create a new record to get started.</td></tr>';
            return;
        }
        cashflowList.forEach(cashflow => {
            try {
                const typeName = cashflow.type?.name || 'N/A';
                const categoryName = cashflow.category?.name || 'N/A';
                const subcategoryName = cashflow.subcategory?.name || 'N/A';
                const statusName = cashflow.status?.name || 'N/A';
                cashflowTableBody.innerHTML += `
                    <tr>
                        <td class="py-2 px-4 border-b">${cashflow.date || 'N/A'}</td>
                        <td class="py-2 px-4 border-b">${typeName}</td>
                        <td class="py-2 px-4 border-b">${categoryName}</td>
                        <td class="py-2 px-4 border-b">${subcategoryName}</td>
                        <td class="py-2 px-4 border-b">${statusName}</td>
                        <td class="py-2 px-4 border-b">${cashflow.amount || 'N/A'}</td>
                        <td class="py-2 px-4 border-b">${cashflow.comment || ''}</td>
                        <td class="py-2 px-4 border-b">
                            <button onclick="editCashFlow(${cashflow.id}, '${cashflow.date || ''}', ${cashflow.type?.id || null}, ${cashflow.category?.id || null}, ${cashflow.subcategory?.id || null}, ${cashflow.status?.id || null}, ${cashflow.amount || 0}, '${cashflow.comment || ''}')" class="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 mr-2">Edit</button>
                            <button onclick="deleteCashFlow(${cashflow.id})" class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">Delete</button>
                        </td>
                    </tr>
                `;
            } catch (itemError) {
                console.error('Error rendering cashflow item:', cashflow, itemError);
            }
        });
    } catch (error) {
        console.error('Error fetching cash flows:', error);
        console.log('Error details:', {
            message: error.message,
            stack: error.stack
        });
        cashflowTableBody.innerHTML = '<tr><td colspan="9" class="py-2 px-4 text-gray-500">Failed to load cash flow records. Please try again later.</td></tr>';
        formError.textContent = `Failed to load cash flows: ${error.message}`;
        formError.classList.remove('hidden');
        setTimeout(() => formError.classList.add('hidden'), 3000);
    }
}

// CashFlow rekordini o'chirish
async function deleteCashFlow(id) {
    if (!confirm('Are you sure you want to delete this cash flow record?')) return;
    const formError = document.getElementById('form-error');
    const formSuccess = document.getElementById('form-success');
    try {
        await apiRequest(`${API_BASE_URL}cash/cashflow/${id}/`, {
            method: 'DELETE'
        });
        formSuccess.textContent = 'Cash flow record deleted successfully!';
        formSuccess.classList.remove('hidden');
        formError.classList.add('hidden');
        await fetchCashFlows();
        setTimeout(() => formSuccess.classList.add('hidden'), 3000);
    } catch (error) {
        console.error('Error deleting cash flow:', error);
        formError.textContent = `Failed to delete cash flow: ${error.message}`;
        formError.classList.remove('hidden');
        formSuccess.classList.add('hidden');
        setTimeout(() => formError.classList.add('hidden'), 3000);
    }
}

// CashFlow rekordini tahrirlash
async function editCashFlow(id, date, typeId, categoryId, subcategoryId, statusId, amount, comment) {
    if (!id || isNaN(id)) {
        console.error('Invalid CashFlow ID:', id);
        const formError = document.getElementById('form-error');
        formError.textContent = 'Invalid record ID. Please try again.';
        formError.classList.remove('hidden');
        setTimeout(() => formError.classList.add('hidden'), 3000);
        return;
    }
    console.log('Editing CashFlow ID:', id);
    isEditing = true;
    currentCashflowId = id;
    document.getElementById('date').value = date || getTodayDate();
    document.getElementById('type').value = typeId || '';
    await populateCategoryDropdown(typeId);
    document.getElementById('category').value = categoryId || '';
    await populateSubcategoryDropdown(categoryId);
    document.getElementById('subcategory').value = subcategoryId || '';
    document.getElementById('status').value = statusId || '';
    document.getElementById('amount').value = amount || '';
    document.getElementById('comment').value = comment || '';
    document.getElementById('submit-btn').textContent = 'Update Record';
    document.getElementById('form-success').classList.add('hidden');
    document.getElementById('form-error').classList.add('hidden');
}

// Forma yuborish (yaratish yoki yangilash)
let isSubmitting = false;
document.getElementById('create-cashflow-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    isSubmitting = true;
    const formError = document.getElementById('form-error');
    const formSuccess = document.getElementById('form-success');
    const submitBtn = document.getElementById('submit-btn');

    const date = document.getElementById('date').value;
    const typeId = document.getElementById('type').value;
    const categoryId = document.getElementById('category').value;
    const subcategoryId = document.getElementById('subcategory').value;
    const statusId = document.getElementById('status').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const comment = document.getElementById('comment').value;

    // So‘rov body’sini tayyorlash
    const requestBody = {
        type_id: parseInt(typeId),
        category_id: parseInt(categoryId),
        subcategory_id: parseInt(subcategoryId),
        status_id: parseInt(statusId),
        amount,
        comment
    };
    if (date) {
        requestBody.date = date; // Faqat date bo‘lsa qo‘shiladi
    }

    console.log('Current CashFlow ID:', currentCashflowId);
    console.log('Date:', date || 'Not provided (using default)');
    console.log('Type ID:', typeId);
    console.log('Category ID:', categoryId);
    console.log('Subcategory ID:', subcategoryId);
    console.log('Status ID:', statusId);
    console.log('Amount:', amount);
    console.log('Comment:', comment);
    console.log('Request Body:', JSON.stringify(requestBody));

    // Validatsiya
    if (!typeId || !categoryId || !subcategoryId || !statusId || isNaN(amount) ||
        isNaN(parseInt(typeId)) || isNaN(parseInt(categoryId)) || isNaN(parseInt(subcategoryId)) || isNaN(parseInt(statusId))) {
        formError.textContent = 'Please fill all required fields correctly.';
        formError.classList.remove('hidden');
        formSuccess.classList.add('hidden');
        setTimeout(() => formError.classList.add('hidden'), 3000);
        isSubmitting = false;
        return;
    }

    if (isEditing && (!currentCashflowId || isNaN(currentCashflowId))) {
        formError.textContent = 'Invalid record ID for update. Please try again.';
        formError.classList.remove('hidden');
        formSuccess.classList.add('hidden');
        setTimeout(() => formError.classList.add('hidden'), 3000);
        isSubmitting = false;
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = isEditing ? 'Updating...' : 'Creating...';

    try {
        const url = isEditing ? `${API_BASE_URL}cash/cashflow/${currentCashflowId}/` : `${API_BASE_URL}cash/cashflow/`;
        const method = isEditing ? 'PUT' : 'POST';
        const response = await apiRequest(url, {
            method,
            body: JSON.stringify(requestBody)
        });
        const data = await response.json();
        if (response.ok) {
            formSuccess.textContent = isEditing ? 'Record updated successfully!' : 'Record created successfully!';
            formSuccess.classList.remove('hidden');
            formError.classList.add('hidden');
            document.getElementById('create-cashflow-form').reset();
            document.getElementById('type').value = '';
            document.getElementById('category').value = '';
            document.getElementById('subcategory').value = '';
            document.getElementById('status').value = '';
            document.getElementById('date').value = getTodayDate();
            submitBtn.textContent = 'Create Record';
            isEditing = false;
            currentCashflowId = null;
            await populateCategoryDropdown(null);
            await populateSubcategoryDropdown(null);
            await fetchCashFlows();
            setTimeout(() => formSuccess.classList.add('hidden'), 3000);
        } else {
            console.error(`Error ${isEditing ? 'updating' : 'creating'} record:`, data);
            formError.textContent = data.detail || Object.entries(data).map(([key, errors]) => `${key}: ${errors.join(', ')}`).join('; ') || `Failed to ${isEditing ? 'update' : 'create'} record`;
            formError.classList.remove('hidden');
            formSuccess.classList.add('hidden');
            setTimeout(() => formError.classList.add('hidden'), 3000);
        }
    } catch (error) {
        console.error(`Error ${isEditing ? 'updating' : 'creating'} record:`, error);
        let errorMessage = `Failed to ${isEditing ? 'update' : 'create'} record: ${error.message}`;
        if (error.message.includes('Not Found')) {
            errorMessage = 'Record not found. It may have been deleted or you do not have access.';
        }
        formError.textContent = errorMessage;
        formError.classList.remove('hidden');
        formSuccess.classList.add('hidden');
        setTimeout(() => formError.classList.add('hidden'), 3000);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = isEditing ? 'Update Record' : 'Create Record';
        isSubmitting = false;
    }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    window.location.href = '/login.html';
});

// Sahifa yuklanganda
document.addEventListener('DOMContentLoaded', () => {
    populateTypeDropdown();
    populateCategoryDropdown();
    populateSubcategoryDropdown();
    populateStatusDropdown();
    fetchCashFlows();
    document.getElementById('date').value = getTodayDate();
});