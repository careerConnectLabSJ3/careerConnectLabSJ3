const registrationForm = document.getElementById('registration-form');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');
const termsInput = document.getElementById('terms');

confirmPasswordInput.addEventListener('input', () => {
    confirmPasswordInput.setCustomValidity('');
});

termsInput.addEventListener('change', () => {
    termsInput.setCustomValidity('');
});

registrationForm.addEventListener('submit', (event) => {
    nameInput.value = nameInput.value.trim();
    emailInput.value = emailInput.value.trim().toLowerCase();

    if (passwordInput.value !== confirmPasswordInput.value) {
        event.preventDefault();
        confirmPasswordInput.setCustomValidity('Passwords do not match.');
        confirmPasswordInput.reportValidity();
        return;
    }

    if (!termsInput.checked) {
        event.preventDefault();
        termsInput.setCustomValidity('You must accept the terms to register.');
        termsInput.reportValidity();
    }
});
