// server.js
// 1. CONFIGURATION & ENVIRONMENT SETUP
import dotenv from 'dotenv';
dotenv.config();
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import multer from 'multer';

const app = express();

const hostname = '0.0.0.0';
const port = 3000;

// Import Modules from validation.js to handle input validation
import {validateRegistration} from './serverUtils/validation.js';
import { getProfilePic, updateProfile, getResume, uploadResume, deleteResume, fetchUserProfile } from './controllers/profileController.js';
import { createJob, getRecruiterJobs } from './controllers/jobController.js';
import {
    getJobDetails,
    submitApplication,
    getJobApplications,
    getMyApplications,
    updateMyApplicationStatus,
    getJobLifecycleStatus
} from './controllers/applicationController.js';
import { addFavoriteJob, removeFavoriteJob, getFavoriteJob, getMyFavoriteJobs } from './controllers/favoriteJobsController.js';
import { checkEmail, checkSession, fetchCurrentUser, loginUser, logoutUser, registerUser } from './controllers/authController.js';
import { checkUpcomingDeadlines, searchJob } from './controllers/jobSeekerController.js';


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
app.get('/api/check-session', checkSession);

// API route to share the session user's data with the frontend
app.get('/api/current-user', fetchCurrentUser);

// API route for user profile information
app.get('/api/user-profile', fetchUserProfile);

// Check email availability before the registration form is submitted.
app.get('/api/check-email', checkEmail);

// Profile pic fetch
app.get('/api/profile/avatar', getProfilePic);

// Profile update
app.post('/api/profile', upload.single('pfpUpload'), updateProfile);

// Resume management
app.get('/api/profile/resume', getResume);
app.post('/api/profile/resume', resumeUpload.single('resumeUpload'), uploadResume);
app.delete('/api/profile/resume', deleteResume);


// 8. AUTHENTICATION LOGIC (POST REQUESTS)
app.post('/api/register', validateRegistration, registerUser);
app.post('/api/login', loginUser);
app.post('/api/logout', logoutUser);

// API route for upcoming deadlines
app.get('/api/jobs/upcoming-deadlines', checkUpcomingDeadlines);

// API route for Job Seekers to search and filter jobs
app.get('/api/jobs/search', searchJob);

// Real job posting replaces the temporary dummy-job insertion route.
app.post('/api/jobs', createJob);
app.get('/api/jobs/mine', getRecruiterJobs);


// Application Page
app.get('/api/applications', getMyApplications);
app.patch('/api/applications/:applicationId/status', updateMyApplicationStatus);

// Keep the named search/mine/deadline routes above the variable job ID route.
app.get('/api/jobs/:jobId/details', getJobDetails);
app.get('/api/jobs/:jobId', getJobDetails);
app.post('/api/jobs/:jobId/applications', submitApplication);
app.get('/api/jobs/:jobId/applications', getJobApplications);

// Job favoriting API
app.get('/api/jobs/:jobId/favorite', getFavoriteJob);
app.post('/api/jobs/:jobId/favorite', addFavoriteJob);
app.delete('/api/jobs/:jobId/favorite', removeFavoriteJob);

// Favorite Jobs Page
app.get('/api/favorite-jobs', getMyFavoriteJobs);


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
    console.error('Server error:', err);
    res.status(500).send({error: 'An unexpected error occurred.'});
});

app.get('/*splat', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

export default app;
