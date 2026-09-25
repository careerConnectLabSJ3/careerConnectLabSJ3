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

// Parse form data
app.use(express.urlencoded({ extended: true }));

// static files
app.use(express.static(path.join(__dirname, 'src')));

// CONFIGURE SESSION MIDDLEWARE
app.use(session({
    secret: 'super_secret_key_for_soen341', // Used to sign the session ID cookie
    resave: false,                           // Don't save session if unmodified
    saveUninitialized: false,                // Don't create session until something is stored
    cookie: {
        secure: false,                       // Set to true only if using HTTPS
        maxAge: 1000 * 60 * 60 * 24          // Cookie expires in 24 hours
    }
}));


// CONNECT TO MONGO DB 
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB: careerConnect_db'))
    .catch(err => console.error('MongoDB connection failed:', err));

// 3. DEFINE THE USER SCHEMA AND MODEL
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['job_seeker', 'recruiter'], },
    education : { type: String, default: "None"},
    experience: { type: String, default: "None"}

});
const User = mongoose.model('User', userSchema);


// API route to share the session user's dta with the frontend
app.get('/api/current-user', (req, res) => {
    if (req.session.user) {
        // send back the name and role of logged -in user
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


// Page Routing
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'Pages', 'index.html'));
});
// Route for Login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'Pages', 'login.html'));
});

// Route for Register page
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'Pages', 'register.html'));
});

// Route for Dashboard page
app.get('/dashboard', (req, res) => {
    if (req.session.user && req.session.user.role === 'job_seeker') {
        // User is logged in! Serve the dashboard page
        res.sendFile(path.join(__dirname, 'src', 'Pages', 'jobSeeker_dashboard.html'));
    }
    else if (req.session.user && req.session.user.role === 'recruiter') {
        // User is logged in! Serve the dashboard page
        res.sendFile(path.join(__dirname, 'src', 'Pages', 'recruiter_dashboard.html'));
    }
    else {
        // User is NOT logged in. Redirect them back to the login screen
        res.redirect('/login');
    }
});

// Route for profile page
app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'Pages', 'profile.html'));
});

app.get('/profile-edit', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'Pages', 'profile_edit.html'))
})

app.post('/profile-edit', async (req, res) => {
    try{
        const { name, education, workExp, skills } = req.body;
        const currUserInfo = req.session.user;
        console.log("CURRENT: ", currUserInfo);
        console.log(req.body)

        if(name != currUserInfo.name || education != currUserInfo.education || workExp != currUserInfo.experience || skills != currUserInfo.skills){
            // update name
            const updatedProfile = {
                $set: {
                    name: name,
                    education: education,
                    experience: workExp,
                    skills: skills
                }
            }

            const id = await User.findOne({ email: email });
            console.log(id);
            // const result = await User.updateOne()

            console.log("updated name");
        }
    
    }
    catch(error){
        console.error(error);
    }
})


//Register route
app.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Simple validation check to ensure role is passed safely
        if (!role || (role !== 'job_seeker' && role !== 'recruiter')) {
            return res.status(400).send("Please select a valid account type.");
        }

        //  Hash the password (10 is the "salt rounds", standard for good security)
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new document using Mongoose Model
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role
        });

        await newUser.save();
        res.redirect('/login');
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Server error during registration");
    }
});

// Login Route
app.post("/login", async (req, res) => {

    const { email, password } = req.body;

    // Query documents using findOne 
    const user = await User.findOne({ email: email });
    if (user) {
        if (password === user.password || await bcrypt.compare(password, user.password)) {

            req.session.user = {
                id: user._id, // MongoDB creates auto id property as _id
                name: user.name,
                email: user.email,
                role: user.role,
                education: user.education,
                experience: user.experience
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

// Route for Dashboard page (PROTECTED BY SESSION)
app.get('/jobSeeker_dashboard', (req, res) => {
    // Confirm the user session exists and matches the job seeker role structure
    if (req.session.user && req.session.user.role === 'job_seeker') {
        // User is logged in! Serve the dashboard page
        res.sendFile(path.join(__dirname, 'src', 'Pages', 'jobSeeker_dashboard.html'));
    }
    else {
        // User is NOT logged in. Redirect them back to the login screen
        res.redirect('/login');
    }
});

// Recruiter Dashboard Route
app.get('/recruiter_dashboard', (req, res) => {
    // Confirm the user session exists and matches the recruiter role structure
    if (req.session.user && req.session.user.role === 'recruiter') {
        res.sendFile(path.join(__dirname, 'src', 'Pages', 'recruiter_dashboard.html'));
    }
    else {
        // Kick unauthenticated or improper user types back to login
        res.redirect('/login');
    }
});

// Route for Logging Out
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return console.log("Logout failed:", err);
        }
        res.redirect('/login'); // Redirect to login after destroying session
    });
});

//start the server and listen on the defined port
app.listen(port, hostname, () => {
    console.log(`Server running at http://localhost:${port}/`);
});