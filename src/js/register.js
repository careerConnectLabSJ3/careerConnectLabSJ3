const registerForm = document.querySelector('.auth-form');
const nameInput = document.getElementById('fullname');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');
const roleInput = document.getElementById('role');
const termsInput = document.getElementById('terms');

const namePattern = /^\p{L}+(?:\s+\p{L}+)*$/u;

function showValidationAlert(message, input) {
    window.alert(message);
    input.focus();
}

registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!name) {
        showValidationAlert('Please enter your full name.', nameInput);
        return;
    }

    if (!namePattern.test(name)) {
        showValidationAlert('Full name can contain letters and spaces only; symbols and numbers are not allowed.', nameInput);
        return;
    }

    if (name.replace(/\s/g, '').length > 30) {
        showValidationAlert('Full name must contain no more than 30 letters, excluding spaces.', nameInput);
        return;
    }

    if (!email) {
        showValidationAlert('Please enter an email address containing an @ symbol.', emailInput);
        return;
    }

    if (!email.includes('@')) {
        showValidationAlert('Email address must contain an @ symbol.', emailInput);
        return;
    }

    if (password.length < 8) {
        showValidationAlert('Password must be at least 8 characters long.', passwordInput);
        return;
    }

    if (password !== confirmPassword) {
        showValidationAlert('Password and confirmation password must be identical.', confirmPasswordInput);
        return;
    }

    if (!roleInput.value) {
        showValidationAlert('Please select either Job Seeker or Recruiter as your role.', roleInput);
        return;
    }

    if (!termsInput.checked) {
        showValidationAlert('You must agree to the Terms of Service and Privacy Policy.', termsInput);
        return;
    }

    try {
        const response = await fetch(`/api/check-email?email=${encodeURIComponent(email)}`);
        const result = await response.json();

        if (!response.ok) {
            throw new Error('Email availability check failed');
        }

        if (!result.available) {
            showValidationAlert('This email address is already registered. Please use a different email address.', emailInput);
            return;
        }

        emailInput.value = email;
        registerForm.submit();
    } catch (error) {
        showValidationAlert('We could not verify the email address right now. Please try again.', emailInput);
    }
});
