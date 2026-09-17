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

app.post("/register",(request,response)=>{

    const {name, email,password } = request.body;
   
    let sql = `INSERT INTO users(name,email,password) VALUES (?,?,?)`;

    db.query(sql,[ name, email,password],(err,result)=>{

        if(err)
            response.send("Could not insert new record!");
        else
            response.send("Record inserted with success");
    });    
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


//start the server and listen on the defined port
app.listen(port,hostname, ()=>{
    console.log(`Server running at http://${hostname}:${port}/`);
})