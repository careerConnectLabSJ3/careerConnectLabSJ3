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
const { Readable } = require('stream');

const hostname = '0.0.0.0'; 
const port = 3000;

// Import Modules from validation.js to handle input validation
const { validateRegistration, sendRegistrationError } = require('../js/validation');

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

// 4. DATABASE SCHEMA & MODEL
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['job_seeker', 'recruiter'], },
    education : { type: String, default: "None"},
    experience: { type: String, default: "None"},
    skills: { type: String, default: "None"},
    profileImageId: { type: mongoose.Schema.Types.ObjectId, default: null }

});
const User = mongoose.model('User', userSchema);

// Multer setup for temp file uploads in memory
const upload = multer({storage: multer.memoryStorage()});

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
app.get('/profile/avatar', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).send('Unauthorized');
        }

        const user = await User.findOne({ email: req.session.user.email });

        // If user has no custom profile picture, serve the default static image
        if (!user || !user.profileImageId) {
            return res.sendFile(path.join(__dirname, '..', 'css', 'img', 'default-pfp.png'));
        }

        const fileId = new mongoose.Types.ObjectId(user.profileImageId);
        const files = await gfsBucket.find({ _id: fileId }).toArray();

        if (!files || files.length === 0) {
            return res.sendFile(path.join(__dirname, '..', 'css', 'img', 'default-pfp.png'));
        }

        const contentType = files[0].contentType || 'image/jpeg';
        res.setHeader('ContentType', contentType);
        const downloadStream = gfsBucket.openDownloadStream(fileId);
        downloadStream.pipe(res);

    } catch (err) {
        console.error("Avatar route catch error:", err)
        res.status(500).send('Error retrieving image');
    }
});

app.post('/profile', upload.single("pfpUpload"), async (req, res) => {
    try{
        const currUserInfo = req.session.user;
        if(!currUserInfo){
            return res.status(401).redirect('/login');
        }

        const { name, education, workExp, skills } = req.body;
        const user = await User.findOne({ email: currUserInfo.email });
        let newPfpId = user.profileImageId;

        if (req.file) {
            if (user.profileImageId) {
                try {
                    await gfsBucket.delete(new mongoose.Types.ObjectId(user.profileImageId));
                } catch (err) {
                    console.log('Old image not found or already deleted');
                }
            }
            // Stream buffer to GridFS
            const uploadPromise = new Promise((resolve, reject) => {
                const readableStream = new Readable();
                readableStream.push(req.file.buffer);
                readableStream.push(null);

                const uploadStream = gfsBucket.openUploadStream(req.file.originalname, {
                    contentType: req.file.mimetype
                });
                const generatedId = uploadStream.id;
                readableStream.pipe(uploadStream);

                uploadStream.on('finish', () => resolve(generatedId));
                uploadStream.on('error', (err) => reject(err));
            });

            newPfpId = await uploadPromise;
        }
        
        user.name = name || user.name;
        user.education = education || user.education;
        user.experience = workExp || user.experience;
        user.skills = skills || user.skills;
        user.profileImageId = newPfpId;

        await user.save();

        // Update session data so it reflects immediately
        req.session.user = {
            ...currUserInfo,
            name: user.name,
            education: user.education,
            experience: user.experience,
            skills: user.skills
        };

        res.redirect('/profile');
        
    }
    catch(error){
        console.log(error);
        return res.status(500).json({error : error.message});
    }
})


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
    const { email, password } = req.body;
    const user = await User.findOne({ email: email });

    if (user) {
        if (password === user.password || await bcrypt.compare(password, user.password)) {
            req.session.user = {
                id: user._id, 
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
