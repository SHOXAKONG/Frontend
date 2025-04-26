const API_BASE_URL = 'https://python3linux.pythonanywhere.com/';
let accessToken = localStorage.getItem('access');
const refreshToken = localStorage.getItem('refresh');
let isEditing = false;
let currentCategoryId = null;
if (!accessToken || !refreshToken) {
    console.error('No access or refresh token found, redirecting to login');
    window.location.href = '/login.html';
}

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
async function fetchCategories() {
    const categoriesTableBody = document.getElementById('categories-table-body');
    const formError = document.getElementById('form-error');
    try {
        const response = await apiRequest(`${API_BASE_URL}category/categories/`);
        const categories = await response.json();
        categoriesTableBody.innerHTML = '';
        const categoryList = categories.results || categories;
        if (categoryList.length === 0) {
            categoriesTableBody.innerHTML = '<tr><td colspan="4" class="py-2 px-4 text-gray-500">No categories found.</td></tr>';
            return;
        }
        categoryList.forEach(category => {
            categoriesTableBody.innerHTML += `
                <tr>
                    <td class="py-2 px-4 border-b">${category.name}</td>
                    <td class="py-2 px-4 border-b">${category.type.name}</td>
                    <td class="py-2 px-4 border-b">
                        <button onclick="editCategory(${category.id}, '${category.name}', ${category.type.id})" class="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 mr-2">Edit</button>
                        <button onclick="deleteCategory(${category.id})" class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        formError.textContent = `Failed to load categories: ${error.message}`;
        formError.classList.remove('hidden');
        setTimeout(() => formError.classList.add('hidden'), 3000);
    }
}
async function deleteCategory(id) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    const formError = document.getElementById('form-error');
    const formSuccess = document.getElementById('form-success');
    try {
        await apiRequest(`${API_BASE_URL}category/categories/${id}/`, {
            method: 'DELETE'
        });
        formSuccess.textContent = 'Category deleted successfully!';
        formSuccess.classList.remove('hidden');
        formError.classList.add('hidden');
        await fetchCategories();
        setTimeout(() => formSuccess.classList.add('hidden'), 3000);
    } catch (error) {
        console.error('Error deleting category:', error);
        formError.textContent = `Failed to delete category: ${error.message}`;
        formError.classList.remove('hidden');
        formSuccess.classList.add('hidden');
        setTimeout(() => formError.classList.add('hidden'), 3000);
    }
}

function editCategory(id, name, typeId) {
    isEditing = true;
    currentCategoryId = id;
    document.getElementById('name').value = name;
    document.getElementById('type').value = typeId;
    document.getElementById('submit-btn').textContent = 'Update Category';
    document.getElementById('form-success').classList.add('hidden');
    document.getElementById('form-error').classList.add('hidden');
}

document.getElementById('create-category-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formError = document.getElementById('form-error');
    const formSuccess = document.getElementById('form-success');
    const submitBtn = document.getElementById('submit-btn');

    const name = document.getElementById('name').value;
    const typeId = document.getElementById('type').value;

    console.log('Name:', name);
    console.log('Type ID:', typeId);
    console.log('Parsed Type ID:', parseInt(typeId));
    console.log('Request Body:', JSON.stringify({ name, type_id: parseInt(typeId) }));

    if (!name || !typeId || isNaN(parseInt(typeId))) {
        formError.textContent = 'Please fill all required fields correctly.';
        formError.classList.remove('hidden');
        formSuccess.classList.add('hidden');
        setTimeout(() => formError.classList.add('hidden'), 3000);
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = isEditing ? 'Updating...' : 'Creating...';

    try {
        const url = isEditing ? `${API_BASE_URL}category/categories/${currentCategoryId}/` : `${API_BASE_URL}category/categories/`;
        const method = isEditing ? 'PUT' : 'POST';
        const response = await apiRequest(url, {
            method,
            body: JSON.stringify({ name, type_id: parseInt(typeId) })
        });
        const data = await response.json();
        if (response.ok) {
            formSuccess.textContent = isEditing ? 'Category updated successfully!' : 'Category created successfully!';
            formSuccess.classList.remove('hidden');
            formError.classList.add('hidden');
            document.getElementById('create-category-form').reset();
            document.getElementById('type').value = '';
            submitBtn.textContent = 'Create Category';
            isEditing = false;
            currentCategoryId = null;
            await fetchCategories();
            setTimeout(() => formSuccess.classList.add('hidden'), 3000);
        } else {
            console.error(`Error ${isEditing ? 'updating' : 'creating'} category:`, data);
            formError.textContent = data.detail || Object.entries(data).map(([key, errors]) => `${key}: ${errors.join(', ')}`).join('; ') || `Failed to ${isEditing ? 'update' : 'create'} category`;
            formError.classList.remove('hidden');
            formSuccess.classList.add('hidden');
            setTimeout(() => formError.classList.add('hidden'), 3000);
        }
    } catch (error) {
        console.error(`Error ${isEditing ? 'updating' : 'creating'} category:`, error);
        formError.textContent = `Failed to ${isEditing ? 'update' : 'create'} category: ${error.message}`;
        formError.classList.remove('hidden');
        formSuccess.classList.add('hidden');
        setTimeout(() => formError.classList.add('hidden'), 3000);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = isEditing ? 'Update Category' : 'Create Category';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    populateTypeDropdown();
    fetchCategories();
});