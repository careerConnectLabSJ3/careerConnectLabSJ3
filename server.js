// 1. CONFIGURATION & ENVIRONMENT SETUP
// Loads environment variables and forces Google DNS to fix MongoDB Atlas SRV connection issues on local networks
require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const express = require("express");
const app = express();
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');

const hostname = '0.0.0.0'; // Changed from '127.0.0.1' so your Node server accepts external team requests
const port = 3000;

// Import Modules from validation.js to handle input validation
const { validateRegistration, sendRegistrationError } = require('./src/js/validation');

// 2. MIDDLEWARE SETUP
// Parse incoming URL-encoded form data (from login/registration forms)
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets (HTML, CSS, JS) from the 'src' directory
app.use(express.static(path.join(__dirname, 'src')));

// Configure session middleware to track authenticated users across requests
app.use(session({
    secret: 'super_secret_key_for_soen341', // Key used to sign the session ID cookie
    resave: false,                           // Prevents saving unchanged sessions back to the store
    saveUninitialized: false,                // Don't generate cookies until login data is saved
    cookie: {
        secure: false,                       // Set to true only if using HTTPS in production
        maxAge: 1000 * 60 * 60 * 24          // Keep the login session alive for 24 hours
    }
}));

// 3. DATABASE CONNECTION
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB: careerConnect_db'))
    .catch(err => console.error('MongoDB connection failed:', err));

// 4. DATABASE SCHEMA & MODEL
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['job_seeker', 'recruiter'] }
});
const User = mongoose.model('User', userSchema);

// 5. API ROUTES
// Exposes the logged-in user's profile details to the frontend JavaScript
function sendRegistrationError(res, statusCode, message) {
    res.status(statusCode).type('html').send(`<!doctype html>
        <html lang="en"><head><meta charset="UTF-8"><title>Registration error</title></head>
        <body><script>
            alert(${JSON.stringify(message)});
            window.location.replace('/register');
        </script><p>${message}</p></body></html>`);
}


// API route to share the session user's dta with the frontend
app.get('/api/current-user', (req, res) => {
    if (req.session.user) {
        res.json({
            name: req.session.user.name,
            role: req.session.user.role
        });
    }
});

app.get('/api/check-email', async (req, res) => {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email.includes('@')) return res.json({ available: false });
    try {
        const existingUser = await User.exists({ email });
        return res.json({ available: !existingUser });
    } catch (error) {
        console.error('Email availability check failed:', error);
        return res.status(500).json({ available: false });
    }
});


// 6. PAGE ROUTING (PUBLIC)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'Pages', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'Pages', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'Pages', 'register.html'));
});



// 7. PAGE ROUTING (PROTECTED BY ROLE)
// Primary entry checkpoint that routes users to their specific dashboard role
// Check email availability before the registration form is submitted.
app.get('/api/check-email', async (req, res) => {
    const email = String(req.query.email || '').trim().toLowerCase();

    if (!email.includes('@')) {
        return res.json({ available: false });
    }

    try {
        const existingUser = await User.exists({ email });
        return res.json({ available: !existingUser });
    } catch (error) {
        console.error('Email availability check failed:', error);
        return res.status(500).json({ available: false });
    }
});

// Route for Dashboard page
app.get('/dashboard', (req, res) => {
    if (req.session.user && req.session.user.role === 'job_seeker') {
        res.sendFile(path.join(__dirname, 'src', 'Pages', 'jobSeeker_dashboard.html'));
    }
    else if (req.session.user && req.session.user.role === 'recruiter') {
        res.sendFile(path.join(__dirname, 'src', 'Pages', 'recruiter_dashboard.html'));
    }
    else {
        res.redirect('/login'); // Kick unauthorized guests out to the login page
    }
});

// Direct access route for the job seeker dashboard (Guarded by session checks)
app.get('/jobSeeker_dashboard', (req, res) => {
    if (req.session.user && req.session.user.role === 'job_seeker') {
        res.sendFile(path.join(__dirname, 'src', 'Pages', 'jobSeeker_dashboard.html'));
    }
    else {
        res.redirect('/login');
    }
});

// Direct access route for the recruiter dashboard (Guarded by session checks)
app.get('/recruiter_dashboard', (req, res) => {
    if (req.session.user && req.session.user.role === 'recruiter') {
        res.sendFile(path.join(__dirname, 'src', 'Pages', 'recruiter_dashboard.html'));
    }
    else {
        res.redirect('/login');
    }
});

// 8. AUTHENTICATION LOGIC (POST REQUESTS)
// Registers a new user, hashes their password, and saves them to MongoDB
app.post('/register', validateRegistration, async (req, res) => {
    try {
        const { normalizedName, normalizedEmail, password, role } = req.body;

        if (!role || (role !== 'job_seeker' && role !== 'recruiter')) {
            return sendRegistrationError(res, 400, 'Please select either Job Seeker or Recruiter as your role.');
        }

        const existingUser = await User.exists({ email: normalizedEmail });
        if (existingUser) {
            return sendRegistrationError(res, 409, 'This email address is already registered. Please use a different email address.');
        }

        // Encrypt the plain text password securely before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: normalizedName,
            email: normalizedEmail,
            password: hashedPassword,
            role
        });

        await newUser.save();
        res.redirect('/login');
    }
    catch (error) {
        console.error(error);
        // FIXED: Catch database level unique constraints safely using your shared helper
        if (error && error.code === 11000) {
            return sendRegistrationError(res, 409, 'This email address is already registered. Please use a different email address.');
        }
        res.status(500).send("Server error during registration");
    }
});

// Validates credentials, creates a login session, and redirects by user role
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email });

    if (user) {
        // Compare the plaintext login password against the stored database hash
        if (password === user.password || await bcrypt.compare(password, user.password)) {

            // Persist the user profile data inside the active session
            req.session.user = {
                id: user._id, 
                name: user.name,
                email: user.email,
                role: user.role
            };

            if (user.role === 'job_seeker') {
                return res.redirect('/jobSeeker_dashboard');
            }
            if (user.role === 'recruiter') {
                return res.redirect('/recruiter_dashboard');
            }
        }
        else {
            return res.send("Incorrect password!");
        }
    }
    else {
        return res.send("User not found!");
    }
});

// Destroys the login session cookie and signs the user out completely
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return console.log("Logout failed:", err);
        }
        res.redirect('/login');
    });
});

// 9. SERVER INITIALIZATION
app.listen(port, hostname, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
