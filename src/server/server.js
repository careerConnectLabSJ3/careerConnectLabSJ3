// server.js
// 1. CONFIGURATION & ENVIRONMENT SETUP
require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const express = require("express");
const app = express();
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const multer = require('multer');

const hostname = '0.0.0.0';
const port = 3000;

// Import Modules from validation.js to handle input validation
const { validateRegistration, sendRegistrationError, sendLoginError } = require('../js/validation');
const { getProfilePic, updateProfile } = require('./profileController.js');
const { User } = require('./models/user');

// 2. MIDDLEWARE SETUP
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../..', 'src')));

app.use(session({
    secret: 'super_secret_key_for_soen341',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24
    }
}));

// Error handling using middleware
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).send('File size is too large. Maximum allowed size is 2MB.');
        }
    }
    // Handle other general errors
    console.error("Server error:", err);
    res.status(500).send('An unexpected error occurred.');
});

// 3. DATABASE CONNECTION
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB: careerConnect_db');
        // Initialize GridFS bucket
        gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: 'profileImages'
        });
        console.log('GridFS Bucket Initialized');
    })
    .catch(err => console.error('MongoDB connection failed:', err));



// Multer setup for temp file uploads in memory
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }
});

// 5. API ROUTES
// API route to share the session user's data with the frontend
app.get('/api/current-user', (req, res) => {
    if (req.session.user) {
        res.json({
            name: req.session.user.name,
            role: req.session.user.role
        });
    }
});

// API route for user profile information
app.get('/api/user-profile', async (req, res) => {
    const currUser=req.session.user;
    if (currUser) {

        res.json({
            name: currUser.name,
            education: currUser?.education,
            experience: currUser?.experience,
            skills: currUser?.skills
        });
    }
})

// Check email availability before the registration form is submitted.
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
    res.sendFile(path.join(__dirname, '..', 'Pages', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Pages', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Pages', 'register.html'));
});

// 7. PAGE ROUTING (PROTECTED BY ROLE)
app.get('/dashboard', (req, res) => {
    if (req.session.user && req.session.user.role === 'job_seeker') {
        // User is logged in! Serve the dashboard page
        res.sendFile(path.join(__dirname, '..', 'Pages', 'jobSeeker_dashboard.html'));
    }
    else if (req.session.user && req.session.user.role === 'recruiter') {
        // User is logged in! Serve the dashboard page
        res.sendFile(path.join(__dirname, '..', 'Pages', 'recruiter_dashboard.html'));
    }
    else {
        res.redirect('/login');
    }
});

// Route for profile page
app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Pages', 'profile.html'));
});

// Profile pic fetch
app.get('/profile/avatar', getProfilePic);

// Profile update
app.post('/profile', upload.single("pfpUpload"), updateProfile)


app.get('/jobSeeker_dashboard', (req, res) => {
    if (req.session.user && req.session.user.role === 'job_seeker') {
        return res.sendFile(path.join(__dirname, '..', 'Pages', 'jobSeeker_dashboard.html'));
    }
    res.redirect('/login');
});

app.get('/recruiter_dashboard', (req, res) => {
    if (req.session.user && req.session.user.role === 'recruiter') {
        return res.sendFile(path.join(__dirname, '..', 'Pages', 'recruiter_dashboard.html'));
    }
    res.redirect('/login');
});

// 8. AUTHENTICATION LOGIC (POST REQUESTS)
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
        if (error && error.code === 11000) {
            return sendRegistrationError(res, 409, 'This email address is already registered. Please use a different email address.');
        }
        res.status(500).send("Server error during registration");
    }
});

app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

        if (!normalizedEmail || typeof password !== 'string' || !password) {
            return res.status(400).send("Email and password are required.");
        }

        const user = await User.findOne({ email: normalizedEmail });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return sendLoginError(res, "Invalid email or password. Please try again.");
        }

        if (user.role !== 'job_seeker' && user.role !== 'recruiter') {
            return res.status(403).send("This account does not have a valid role.");
        }

        req.session.user = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            education: user.education,
            experience: user.experience,
            skills: user.skills
        };

        if (user.role === 'job_seeker') {
            return res.redirect('/jobSeeker_dashboard');
        }

        return res.redirect('/recruiter_dashboard');
    }
    catch (error) {
        console.error("Login failed:", error);
        return res.status(500).send("Server error during login.");
    }
});

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
