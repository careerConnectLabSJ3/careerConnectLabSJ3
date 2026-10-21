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
import { getProfilePic, updateProfile, getResume, uploadResume, deleteResume } from './profileController.js';
import User from './models/user.js';

// import schema for a job postings database
import Job from './models/job.js';


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

const resumeUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
        const isPdf = file.mimetype === 'application/pdf' &&
            file.originalname.toLowerCase().endsWith('.pdf');

        if (!isPdf) {
            const error = new Error('Only PDF files are allowed.');
            error.code = 'INVALID_RESUME_TYPE';
            return callback(error);
        }

        return callback(null, true);
    }
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
    if (!currUser) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findOne({ email: currUser.email });
    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({
        name: user.name,
        role: user.role,
        education: user.education,
        experience: user.experience,
        skills: user.skills,
        resume: user.resumeFileId ? {
            fileName: user.resumeFileName,
            fileSize: user.resumeFileSize,
            uploadedAt: user.resumeUploadedAt
        } : null
    });
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

// Resume management
app.get('/api/profile/resume', getResume);
app.post('/api/profile/resume', resumeUpload.single('resumeUpload'), uploadResume);
app.delete('/api/profile/resume', deleteResume);


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

// Route to Add Data for job postings
app.get('/api/post-jobs', async (req, res) => {
    try {
        // Create database for recruiter jobs
        const Job1 = new Job({
            title: "Junior Software Engineer",
            department: "Engineering",
            applicationsCount: 4
        })
        const Job2 = new Job({
            title: "Product Manager",
            department: "Product Team",
            applicationsCount: 2
        });

        // Save jobs to MongoDB
        await Job1.save();
        await Job2.save();

        res.send("Successfully inserted jobs into MongoDB!");
        
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error inserting jobs to database: " + error.message);
    }
});

// API route for Job Seekers to search and filter jobs
app.get('/api/jobs/search', async (req, res) => {
    try {
        // Extract the search query parameters sent by the frontend
        const { title, department,location } = req.query;

        // Filter active jobs
        let activeJobs = { status: 'Active' };

        if (title)
            activeJobs.title = { $regex: title,$options: 'i' };

        if (department)
            activeJobs.department = { $regex: department, $options: 'i' };

        if (location) // <-- Add this block
            activeJobs.location = { $regex: location, $options: 'i' };

        // Retrieve jobs from mongodb
        const jobs = await Job.find(activeJobs);

        // send response to the user as an json object
        return res.status(200).json(jobs);

    } catch (error) {
        console.error("Failed to query jobs:", error);
        return res.status(500).send("Database search error: " + error.message);
    }
    
});
// Error handling using middleware
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            if (req.path === '/api/profile/resume') {
                return res.status(413).json({error: 'Resume must be 5MB or smaller.'});
            }
            return res.status(400).send({error: 'File size is too large. Maximum allowed size is 2MB.'});
        }
    }
    if (err.code === 'INVALID_RESUME_TYPE') {
        return res.status(400).json({error: 'Only PDF files are allowed for resumes.'});
    }
    // Handle other general errors
    console.error("Server error:", err);
    res.status(500).send({error: 'An unexpected error occurred.'});
});

app.get('/*splat', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

export default app;
