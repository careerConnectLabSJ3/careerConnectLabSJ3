// Load environment variables at the very top of your file
require('dotenv').config();

const bcrypt = require('bcrypt');
const express = require("express");
const mysql = require("mysql2");
const path = require('path');
const app = express();
const session = require('express-session');

const hostname = '0.0.0.0'; // Changed from '127.0.0.1' so your Node server accepts external team requests
const port = process.env.PORT || 3000;

// Parse form data
app.use(express.urlencoded({extended:true}));

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

// Connect to DB (UPDATED TO USE ENVIRONMENT VARIABLES)
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306 // Uses the .env port, defaults to 3306 if missing
});

db.connect((err)=>{
    if(err){
        console.error("Database connection failed:", err);
    }
    else{
        console.log(`Connected to database: ${process.env.DB_NAME}`);
    }
});
// API route to share teh session user's dta with the frontend
app.get('/api/current-user', (req, res) => {
    if (req.session.user) {
        // send back the name and role of logged -in user
        res.json({
            name: req.session.user.name,
            role:req.session.user.role
        });
    }
});

// Page Routing
app.get('/',(req,res)=>{
    res.sendFile(path.join(__dirname,'src','Pages','index.html'));
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

//Register Route
app.post('/register', async (req, res) => {
    try {
        const { name, email, password,role } = req.body;

        // Simple validation check to ensure role is passed safely
        if (!role || (role !== 'job_seeker' && role !== 'recruiter')) {
            return res.status(400).send("Please select a valid account type.");
        }

        // 1. Hash the password (10 is the "salt rounds", standard for good security)
        const hashedPassword = await bcrypt.hash(password, 10);

        // 2. Insert into database using the 'hashedPassword' instead of plain text
        const sql = "INSERT INTO users (name, email, password,role) VALUES (?, ?, ?,?)";
        db.query(sql, [name, email, hashedPassword, role], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error saving user to database");
            }
            
            // 3. Automatically redirect them to login page!
            res.redirect('/login');
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Server error during registration");
    }
});

// Login Route
app.post("/login", (req, res) => {
    
    const { email, password } = req.body; 

    // Query to find the specific user trying to log in
    let sql = "SELECT * FROM users WHERE email =?";

    db.query(sql,[email], async (err, result) => {
        // If a user was found with that email
        if (result.length > 0) {
            const user = result[0];

            // TEMPORARY PASSWORD CHECK 
            if (password === user.password || await bcrypt.compare(password, user.password)) {
                
                // SAVING TO SESSION: Store user details so the server remembers them
                req.session.user = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role:user.role
                };

                if (req.session.user && req.session.user.role === 'job_seeker')
                    return res.redirect('/jobSeeker_dashboard');
                if (req.session.user && req.session.user.role === 'recruiter')
                    return res.redirect('/recruiter_dashboard');
            }
            else {
                return res.send("Incorrect password!");
            }
        }
        else {
            return res.send("User not found!");
        }
    });
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