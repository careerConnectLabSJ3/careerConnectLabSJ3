const loginForm = document.querySelector('.auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

function showValidationAlert(message, input) {
    window.alert(message);
    input.focus();
}

loginForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email) {
        showValidationAlert('Please enter your email address.', emailInput);
        return;
    }

    if (!email.includes('@')) {
        showValidationAlert('Email address must contain an @ symbol.', emailInput);
        return;
    }

    if (!password) {
        showValidationAlert('Please enter your password.', passwordInput);
        return;
    }

    if (password.length < 8) {
        showValidationAlert('Password must be at least 8 characters long.', passwordInput);
        return;
    }

    emailInput.value = email.toLowerCase();
    loginForm.submit();
});
