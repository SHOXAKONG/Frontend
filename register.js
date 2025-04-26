const registerForm = document.getElementById('register-form');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');
const submitBtn = document.getElementById('submit-btn');

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const confirmPassword = document.getElementById('confirm-password').value.trim();
    const firstName = document.getElementById('first-name').value.trim();
    const lastName = document.getElementById('last-name').value.trim();

    // Validatsiya
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        errorMessage.textContent = 'Please enter a valid email address.';
        errorMessage.classList.remove('hidden');
        successMessage.classList.add('hidden');
        return;
    }
    if (password.length < 6) {
        errorMessage.textContent = 'Password must be at least 6 characters long.';
        errorMessage.classList.remove('hidden');
        successMessage.classList.add('hidden');
        return;
    }
    if (password !== confirmPassword) {
        errorMessage.textContent = 'Passwords do not match.';
        errorMessage.classList.remove('hidden');
        successMessage.classList.add('hidden');
        return;
    }
    if (!firstName || !lastName) {
        errorMessage.textContent = 'First name and last name are required.';
        errorMessage.classList.remove('hidden');
        successMessage.classList.add('hidden');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Registering...';

    try {
        const response = await fetch('http://127.0.0.1:8000/auth/register/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Agar CSRF kerak bo'lsa: 'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                email,
                password,
                first_name: firstName,
                last_name: lastName,
                password_confirm: confirmPassword
            }),
        });

        const data = await response.json();
        if (response.ok) {
            // Tokenlarni saqlash
            localStorage.setItem('access', data.access);
            localStorage.setItem('refresh', data.refresh);
            successMessage.textContent = data.detail || 'Registration successful! Redirecting to dashboard...';
            successMessage.classList.remove('hidden');
            errorMessage.classList.add('hidden');
            registerForm.reset();
            setTimeout(() => window.location.href = '/dashboard.html', 2000);
        } else {
            errorMessage.textContent = data.error || data.detail || data.password || 'Registration failed';
            errorMessage.classList.remove('hidden');
            successMessage.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error:', error);
        errorMessage.textContent = 'Something went wrong. Please try again later.';
        errorMessage.classList.remove('hidden');
        successMessage.classList.add('hidden');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register';
    }
});

// Parol ko'rsatish/yashirish
document.getElementById('toggle-password').addEventListener('click', () => {
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.getElementById('toggle-password');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.textContent = 'Hide';
    } else {
        passwordInput.type = 'password';
        toggleBtn.textContent = 'Show';
    }
});

document.getElementById('toggle-confirm-password').addEventListener('click', () => {
    const confirmPasswordInput = document.getElementById('confirm-password');
    const toggleBtn = document.getElementById('toggle-confirm-password');
    if (confirmPasswordInput.type === 'password') {
        confirmPasswordInput.type = 'text';
        toggleBtn.textContent = 'Hide';
    } else {
        confirmPasswordInput.type = 'password';
        toggleBtn.textContent = 'Show';
    }
});

// CSRF token olish (agar kerak bo'lsa)
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