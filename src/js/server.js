const bcrypt = require('bcrypt');

const express = require("express");
const mysql = require("mysql2");
const path = require('path');

const app = express();

const hostname = '127.0.0.1';
const port = 3000;

// Parse from data
app.use(express.urlencoded({extended:true}));

//static files
app.use(express.static(path.join(__dirname,'..','css')));

// Connect to DB
const db = mysql.createConnection({
    host:"127.0.0.1",
    user:"root",
    password:"",
    database:"careerConnect_db"
});

db.connect((err)=>{
    if(err){
        console.log(err);
    }
    else{
        console.log("Connected to careerConnect_db");
    }
});

app.get('/',(req,res)=>{
    res.sendFile(path.join(__dirname,'..','Pages','index.html'));
});
// Route for Login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Pages', 'login.html'));
});

// Route for Register page
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Pages', 'register.html'));
});

// Route for Dashboard page
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Pages', 'dashboard.html'));
});

//Register route
app.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // 1. Hash the password (10 is the "salt rounds", standard for good security)
        const hashedPassword = await bcrypt.hash(password, 10);

        // 2. Insert into database using the 'hashedPassword' instead of plain text
        const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
        db.query(sql, [name, email, hashedPassword], (err, result) => {
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

app.post("/login", (request, response) => {
    
    let sql = "SELECT * FROM users";

    db.query(sql, (err, result) => {

        if (err) {
            response.send("Could not retrieve user!");
        }
        else {
            response.redirect('/dashboard')
        }
    });
});


//start the server and listen on the defined port
app.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});