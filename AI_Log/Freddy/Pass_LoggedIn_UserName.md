Here is the absolute simplest, cleanest way to pass the logged-in user's name to your HTML frontend without over-engineering your server.

We will create a quick **API endpoint** in your backend, and use a **three-line JavaScript function** on your HTML pages to pull that name and display it.

## ---

**Step 1: Add the Data Endpoint to server.js**

Paste this simple route anywhere near your other app.get routes. This endpoint safely checks who is logged in and sends back their profile info as a small JSON text bundle.

*`// A simple API route to share the session user's data with the frontend`*  
`app.get('/api/current-user', (req, res) => {`  
    `if (req.session.user) {`  
        `// Send back just the name and role of the logged-in user`  
        `res.json({`   
            `name: req.session.user.name,`  
            `role: req.session.user.role`   
        `});`  
    `} else {`  
        `res.status(401).json({ error: "Not logged in" });`  
    `}`  
`});`

## ---

**Step 2: Add the Script to Your Dashboards**

Open **both** your jobSeeker\_dashboard.html and recruiter\_dashboard.html files. Scroll down to the bottom of the files, find the \<script\> tag, and update it to look exactly like this:

`<script>`  
    `// As soon as the page loads, fetch the user data from the server`  
    `fetch('/api/current-user')`  
        `.then(response => response.json())`  
        `.then(user => {`  
            `if (user.name) {`  
                `// Find the welcome element and inject the user's real name!`  
                ``document.getElementById('welcome-message').innerText = `Welcome back, ${user.name}!`;``  
            `}`  
        `})`  
        `.catch(err => console.error("Could not fetch user session:", err));`  
`</script>`

## ---

**Step 3: Ensure your HTML Header matches**

Just make sure the main header inside both dashboard HTML files uses the matching **id="welcome-message"** so the script knows where to inject the text:

`<h2 id="welcome-message">Welcome to your Dashboard</h2>`

## **😴 What Happens Now:**

When you log in, your server saves your profile information to the session. When the dashboard page boots up in your browser, the script runs behind the scenes, asks the server for the name, and seamlessly updates the text from *"Welcome to your Dashboard"* to **"Welcome back, Freddy\!"** in less than a millisecond.

Your project architecture is now in incredible shape for your team. Save your files, shut down your terminal, and have a great night's sleep\!

Whenever you log back on, let me know if you want to start building:

> * The backend logic and file systems for **Resume Upload and management**  
> * The database schemas for **Job Postings** so recruiters can start adding rows
