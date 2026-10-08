// server.js
// 1. CONFIGURATION & ENVIRONMENT SETUP
import dotenv from 'dotenv';
dotenv.config();
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import session from 'express-session';
import multer from 'multer';

const app = express();

const hostname = '0.0.0.0';
const port = 3000;

// Import Modules from validation.js to handle input validation
import {validateRegistration, sendRegistrationError, sendLoginError} from '../js/validation.js';
import { getProfilePic, updateProfile } from './profileController.js';
import User from './models/user.js';

// 2. MIDDLEWARE SETUP
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../client/dist')));
app.use(express.json());

app.use(session({
    secret: 'super_secret_key_for_soen341',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24
    }
}));


// Multer setup for temp file uploads in memory
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }
});

// 5. API ROUTES
// checks if user is already logged in, also handles refreshes
app.get('/api/check-session', (req, res) => {
    if(req.session.user){
        return res.json({
            loggedIn: true,
            user: req.session.user
        });
    }
    return res.json({
        loggedIn: false
    });
});

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

// Profile pic fetch
app.get('/api/profile/avatar', getProfilePic);

// Profile update
app.post('/api/profile', upload.single("pfpUpload"), updateProfile)


// 8. AUTHENTICATION LOGIC (POST REQUESTS)
app.post('/api/register', validateRegistration, async (req, res) => {
    try {
        const { normalizedName, normalizedEmail, password, role } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: normalizedName,
            email: normalizedEmail,
            password: hashedPassword,
            role
        });

        await newUser.save();
        return res.status(200).json({
            message: "Registration successful"
        })
    }
    catch (error) {
        console.error(error);
        if (error && error.code === 11000) {
            return sendRegistrationError(res, 409, 'This email address is already registered. Please use a different email address.');
        }
        return res.status(500).send("Server error during registration");
    }
});

app.post("/api/login", async (req, res) => {
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

        return res.status(200).json({
            message: "Login successful",
            role: user.role
        });
    }
    catch (error) {
        console.error("Login failed:", error);
        return res.status(500).send("Server error during login.");
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log("Logout failed:", err);
            return res.status(500).json({
                loggedIn: true,
                message: "Logout failed"
            });
        }
        res.clearCookie('connect.sid');
        return res.status(200).json({
            loggedIn: true,
            message: "Logout successful"
        })
    });
});

// Error handling using middleware
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).send({error: 'File size is too large. Maximum allowed size is 2MB.'});
        }
    }
    // Handle other general errors
    console.error("Server error:", err);
    res.status(500).send({error: 'An unexpected error occurred.'});
});

app.get('/*splat', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

export default app;