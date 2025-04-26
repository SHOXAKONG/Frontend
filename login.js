const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');
const submitBtn = document.getElementById('submit-btn');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        errorMessage.textContent = 'Please enter a valid email address.';
        errorMessage.classList.remove('hidden');
        return;
    }
    if (password.length <= 3) {
        errorMessage.textContent = 'Password must be at least 4 characters long.';
        errorMessage.classList.remove('hidden');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
        const response = await fetch('https://python3linux.pythonanywhere.com/auth/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('access', data.access);
            localStorage.setItem('refresh', data.refresh);
            window.location.href = '/dashboard.html';
        } else {
            errorMessage.textContent = data.error || data.detail || 'Login failed';
            errorMessage.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error:', error);
        errorMessage.textContent = 'Something went wrong. Please try again later.';
        errorMessage.classList.remove('hidden');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
    }
});

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}