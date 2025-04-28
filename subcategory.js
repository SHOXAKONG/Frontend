const API_BASE_URL = 'https://python3linux.pythonanywhere.com/';
let accessToken = localStorage.getItem('access');
const refreshToken = localStorage.getItem('refresh');
let isEditing = false;
let currentSubcategoryId = null;

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

// Kategoriyalarni dropdown'ga yuklash
async function populateCategoryDropdown() {
    const formError = document.getElementById('form-error');
    try {
        const response = await apiRequest(`${API_BASE_URL}category/categories/`);
        const categories = await response.json();
        console.log('Categories from API:', categories);
        const categorySelect = document.getElementById('category');
        categorySelect.innerHTML = '<option value="" disabled selected>Select Category</option>';
        (categories.results || categories).forEach(category => {
            categorySelect.innerHTML += `<option value="${category.id}">${category.name}</option>`;
        });
        if ((categories.results || categories).length === 0) {
            categorySelect.innerHTML += '<option value="" disabled>No categories available</option>';
            formError.textContent = 'No categories available. Please create a category first.';
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

// Subkategoriyalarni olish va ro'yxatni yangilash
async function fetchSubcategories() {
    const subcategoriesTableBody = document.getElementById('subcategories-table-body');
    const formError = document.getElementById('form-error');
    try {
        const response = await apiRequest(`${API_BASE_URL}category/subcategories/`);
        const subcategories = await response.json();
        subcategoriesTableBody.innerHTML = '';
        const subcategoryList = subcategories.results || subcategories;
        if (subcategoryList.length === 0) {
            subcategoriesTableBody.innerHTML = '<tr><td colspan="4" class="py-2 px-4 text-gray-500">No subcategories found.</td></tr>';
            return;
        }
        subcategoryList.forEach(subcategory => {
            subcategoriesTableBody.innerHTML += `
                <tr>
                    <td class="py-2 px-4 border-b">${subcategory.name}</td>
                    <td class="py-2 px-4 border-b">${subcategory.category.name}</td>
                    <td class="py-2 px-4 border-b">
                        <button onclick="editSubcategory(${subcategory.id}, '${subcategory.name}', ${subcategory.category.id})" class="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 mr-2">Edit</button>
                        <button onclick="deleteSubcategory(${subcategory.id})" class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error fetching subcategories:', error);
        formError.textContent = `Failed to load subcategories: ${error.message}`;
        formError.classList.remove('hidden');
        setTimeout(() => formError.classList.add('hidden'), 3000);
    }
}

// Subkategoriyani o'chirish
async function deleteSubcategory(id) {
    if (!confirm('Are you sure you want to delete this subcategory?')) return;
    const formError = document.getElementById('form-error');
    const formSuccess = document.getElementById('form-success');
    try {
        await apiRequest(`${API_BASE_URL}category/subcategories/${id}/`, {
            method: 'DELETE'
        });
        formSuccess.textContent = 'Subcategory deleted successfully!';
        formSuccess.classList.remove('hidden');
        formError.classList.add('hidden');
        await fetchSubcategories();
        setTimeout(() => formSuccess.classList.add('hidden'), 3000);
    } catch (error) {
        console.error('Error deleting subcategory:', error);
        formError.textContent = `Failed to delete subcategory: ${error.message}`;
        formError.classList.remove('hidden');
        formSuccess.classList.add('hidden');
        setTimeout(() => formError.classList.add('hidden'), 3000);
    }
}

// Subkategoriyani tahrirlash
function editSubcategory(id, name, categoryId) {
    isEditing = true;
    currentSubcategoryId = id;
    document.getElementById('name').value = name;
    document.getElementById('category').value = categoryId;
    document.getElementById('submit-btn').textContent = 'Update Subcategory';
    document.getElementById('form-success').classList.add('hidden');
    document.getElementById('form-error').classList.add('hidden');
}

// Forma yuborish (yaratish yoki yangilash)
document.getElementById('create-subcategory-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formError = document.getElementById('form-error');
    const formSuccess = document.getElementById('form-success');
    const submitBtn = document.getElementById('submit-btn');

    const name = document.getElementById('name').value;
    const categoryId = document.getElementById('category').value;

    console.log('Name:', name);
    console.log('Category ID:', categoryId);
    console.log('Parsed Category ID:', parseInt(categoryId));
    console.log('Request Body:', JSON.stringify({ name, category_id: parseInt(categoryId) }));

    if (!name || !categoryId || isNaN(parseInt(categoryId))) {
        formError.textContent = 'Please fill all required fields correctly.';
        formError.classList.remove('hidden');
        formSuccess.classList.add('hidden');
        setTimeout(() => formError.classList.add('hidden'), 3000);
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = isEditing ? 'Updating...' : 'Creating...';

    try {
        const url = isEditing ? `${API_BASE_URL}category/subcategories/${currentSubcategoryId}/` : `${API_BASE_URL}category/subcategories/`;
        const method = isEditing ? 'PUT' : 'POST';
        const response = await apiRequest(url, {
            method,
            body: JSON.stringify({ name, category_id: parseInt(categoryId) })
        });
        const data = await response.json();
        if (response.ok) {
            formSuccess.textContent = isEditing ? 'Subcategory updated successfully!' : 'Subcategory created successfully!';
            formSuccess.classList.remove('hidden');
            formError.classList.add('hidden');
            document.getElementById('create-subcategory-form').reset();
            document.getElementById('category').value = '';
            submitBtn.textContent = 'Create Subcategory';
            isEditing = false;
            currentSubcategoryId = null;
            await fetchSubcategories();
            setTimeout(() => formSuccess.classList.add('hidden'), 3000);
        } else {
            console.error(`Error ${isEditing ? 'updating' : 'creating'} subcategory:`, data);
            formError.textContent = data.detail || Object.entries(data).map(([key, errors]) => `${key}: ${errors.join(', ')}`).join('; ') || `Failed to ${isEditing ? 'update' : 'create'} subcategory`;
            formError.classList.remove('hidden');
            formSuccess.classList.add('hidden');
            setTimeout(() => formError.classList.add('hidden'), 3000);
        }
    } catch (error) {
        console.error(`Error ${isEditing ? 'updating' : 'creating'} subcategory:`, error);
        formError.textContent = `Failed to ${isEditing ? 'update' : 'create'} subcategory: ${error.message}`;
        formError.classList.remove('hidden');
        formSuccess.classList.add('hidden');
        setTimeout(() => formError.classList.add('hidden'), 3000);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = isEditing ? 'Update Subcategory' : 'Create Subcategory';
    }
});

// Sahifa yuklanganda
document.addEventListener('DOMContentLoaded', () => {
    populateCategoryDropdown();
    fetchSubcategories();
});