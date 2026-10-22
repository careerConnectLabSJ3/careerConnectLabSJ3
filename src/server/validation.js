// validation.js
import User from './models/user.js';

// Helper function to send the specialized HTML alert window back on error
export function sendRegistrationError(res, statusCode, message) {
    res.status(statusCode).type('html').send(message);
}

export function sendLoginError(res, message) {
    res.status(401).type('html').send(message);
}

export async function validateRegistration(req, res, next) {
    try {
        const { name, email, password, role, confirmPassword, terms } = req.body;

        // Grab your existing Mongoose model dynamically from your active connection

        const normalizedName = String(name || '').trim();
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const namePattern = /^\p{L}+(?:\s+\p{L}+)*$/u;

        // 1. Structural Checks (Name, Email, Agreements)
        if (!normalizedName) {
            return sendRegistrationError(res, 400, 'Please enter your full name.');
        }
        if (!namePattern.test(normalizedName)) {
            return sendRegistrationError(res, 400, 'Full name can contain letters and spaces only; symbols and numbers are not allowed.');
        }
        if (normalizedName.replace(/\s/g, '').length > 30) {
            return sendRegistrationError(res, 400, 'Full name must contain no more than 30 letters, excluding spaces.');
        }
        if (!normalizedEmail.includes('@')) {
            return sendRegistrationError(res, 400, 'Email address must contain an @ symbol.');
        }

        // 2. Strict Password Character Profiling
        if (typeof password !== 'string' || password.length < 8) {
            return sendRegistrationError(res, 400, 'Password must be at least 8 characters long.');
        }
        if (!/[A-Z]/.test(password)) {
            return sendRegistrationError(res, 400, 'Password must contain at least one uppercase letter.');
        }
        if (!/[a-z]/.test(password)) {
            return sendRegistrationError(res, 400, 'Password must contain at least one lowercase letter.');
        }
        if (!/[0-9]/.test(password)) {
            return sendRegistrationError(res, 400, 'Password must contain at least one number.');
        }
        if (!/[^A-Za-z0-9]/.test(password)) {
            return sendRegistrationError(res, 400, 'Password must contain at least one special character.');
        }
        if (password !== confirmPassword) {
            return sendRegistrationError(res, 400, 'Password and confirmation password must be identical.');
        }

        // 3. Terms and Role Sanity Validations
        if (terms !== true) {
            return sendRegistrationError(res, 400, 'You must agree to the Terms of Service and Privacy Policy.');
        }
        if (!role || role !== 'job_seeker' && role !== 'recruiter') {
            return sendRegistrationError(res, 400, 'Please select either Job Seeker or Recruiter as your role.');
        }

        // 4. Asynchronous Database Availability Verification
        const existingUser = await User.exists({ email: normalizedEmail });
        if (existingUser) {
            return sendRegistrationError(res, 409, 'This email address is already registered. Please use a different email address.');
        }

        // Clean values pass onwards to your main route handler
        req.body.normalizedName = normalizedName;
        req.body.normalizedEmail = normalizedEmail;

        next();
    
    } catch (error) {
        console.error('Middleware validation failure:', error);
        if (error && error.code === 11000) {
            return sendRegistrationError(res, 409, 'This email address is already registered. Please use a different email address.');
        }
        res.status(500).send('Server error during validation registration.');
    }
}
