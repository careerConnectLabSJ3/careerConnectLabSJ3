const loginForm = document.querySelector('.auth-form');
const emailInput = document.getElementById('email');

loginForm.addEventListener('submit', () => {
    emailInput.value = emailInput.value.trim().toLowerCase();
});
