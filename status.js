const API_BASE_URL = 'http://127.0.0.1:8000/';
let accessToken = localStorage.getItem('access');
const refreshToken = localStorage.getItem('refresh');
let isEditing = false;
let currentStatusId = null;

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
            throw new Error(errorData.detail || Object.values(errorData).flat().join(', ') || response.statusText);
        }
        return response;
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

// Statuslarni olish va ro'yxatni yangilash
async function fetchStatuses() {
    const statusesTableBody = document.getElementById('statuses-table-body');
    const formError = document.getElementById('form-error');
    try {
        const response = await apiRequest(`${API_BASE_URL}cash/status/`);
        const statuses = await response.json();
        statusesTableBody.innerHTML = '';
        const statusList = statuses.results || statuses;
        if (statusList.length === 0) {
            statusesTableBody.innerHTML = '<tr><td colspan="3" class="py-2 px-4 text-gray-500">No statuses found.</td></tr>';
            return;
        }
        statusList.forEach(status => {
            statusesTableBody.innerHTML += `
                <tr>
                    <td class="py-2 px-4 border-b">${status.name}</td>
                    <td class="py-2 px-4 border-b">
                        <button onclick="editStatus(${status.id}, '${status.name}')" class="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 mr-2">Edit</button>
                        <button onclick="deleteStatus(${status.id})" class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error fetching statuses:', error);
        formError.textContent = `Failed to load statuses: ${error.message}`;
        formError.classList.remove('hidden');
        setTimeout(() => formError.classList.add('hidden'), 3000);
    }
}

// Statusni o'chirish
async function deleteStatus(id) {
    if (!confirm('Are you sure you want to delete this status?')) return;
    const formError = document.getElementById('form-error');
    const formSuccess = document.getElementById('form-success');
    try {
        await apiRequest(`${API_BASE_URL}cash/status/${id}/`, {
            method: 'DELETE'
        });
        formSuccess.textContent = 'Status deleted successfully!';
        formSuccess.classList.remove('hidden');
        formError.classList.add('hidden');
        await fetchStatuses();
        setTimeout(() => formSuccess.classList.add('hidden'), 3000);
    } catch (error) {
        console.error('Error deleting status:', error);
        formError.textContent = `Failed to delete status: ${error.message}`;
        formError.classList.remove('hidden');
        formSuccess.classList.add('hidden');
        setTimeout(() => formError.classList.add('hidden'), 3000);
    }
}

// Statusni tahrirlash
function editStatus(id, name) {
    isEditing = true;
    currentStatusId = id;
    document.getElementById('name').value = name;
    document.getElementById('submit-btn').textContent = 'Update Status';
    document.getElementById('form-success').classList.add('hidden');
    document.getElementById('form-error').classList.add('hidden');
}

// Forma yuborish (yaratish yoki yangilash)
document.getElementById('create-status-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formError = document.getElementById('form-error');
    const formSuccess = document.getElementById('form-success');
    const submitBtn = document.getElementById('submit-btn');

    const name = document.getElementById('name').value;

    if (!name) {
        formError.textContent = 'Please enter a status name.';
        formError.classList.remove('hidden');
        formSuccess.classList.add('hidden');
        setTimeout(() => formError.classList.add('hidden'), 3000);
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = isEditing ? 'Updating...' : 'Creating...';

    try {
        const url = isEditing ? `${API_BASE_URL}cash/status/${currentStatusId}/` : `${API_BASE_URL}cash/status/`;
        const method = isEditing ? 'PUT' : 'POST';
        const response = await apiRequest(url, {
            method,
            body: JSON.stringify({ name })
        });
        const data = await response.json();
        if (response.ok) {
            formSuccess.textContent = isEditing ? 'Status updated successfully!' : 'Status created successfully!';
            formSuccess.classList.remove('hidden');
            formError.classList.add('hidden');
            document.getElementById('create-status-form').reset();
            submitBtn.textContent = 'Create Status';
            isEditing = false;
            currentStatusId = null;
            await fetchStatuses();
            setTimeout(() => formSuccess.classList.add('hidden'), 3000);
        } else {
            console.error(`Error ${isEditing ? 'updating' : 'creating'} status:`, data);
            formError.textContent = data.detail || Object.values(data).flat().join(', ') || `Failed to ${isEditing ? 'update' : 'create'} status`;
            formError.classList.remove('hidden');
            formSuccess.classList.add('hidden');
            setTimeout(() => formError.classList.add('hidden'), 3000);
        }
    } catch (error) {
        console.error(`Error ${isEditing ? 'updating' : 'creating'} status:`, error);
        formError.textContent = `Failed to ${isEditing ? 'update' : 'create'} status: ${error.message}`;
        formError.classList.remove('hidden');
        formSuccess.classList.add('hidden');
        setTimeout(() => formError.classList.add('hidden'), 3000);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = isEditing ? 'Update Status' : 'Create Status';
    }
});

// Sahifa yuklanganda
document.addEventListener('DOMContentLoaded', () => {
    fetchStatuses();
});