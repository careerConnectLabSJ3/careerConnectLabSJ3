const loginForm = document.querySelector('.auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

// Helper function 
function showValidationAlert(message, input) {
    window.alert(message);
    input.focus();
}

loginForm.addEventListener('submit', (event) => {
    // 1. Prevent instant submission 
    event.preventDefault();

    // 2. Normalize inputs (Trimming trailing whitespace)
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // 3. Structural Field Validations
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

    // Send form to server
    loginForm.submit();
});
