# CareerConnect

## Project Description
CareerConnect is a web-based platform designed to help job seekers manage their job search activities. The system allows users to create profiles, upload and manage resumes, search for job opportunities, track submitted applications, and follow the progress of their application process. The platform aims to centralize job-search activities and help users stay organized throughout their career development journey. 

## Problem Being Solved

Job seekers often use multiple platforms, spreadsheets, and documents to manage their applications. This makes it difficult to stay organized and track progress. CareerConnect centralizes the entire job search process into one platform.

## Proposed Solution
CareerConnect provides a unified dashboard where users can:
- Create and manage profiles
- Upload and store resumes
- Search for job opportunities
- Apply for positions
- Track application progress
- Receive reminders and notifications

Recruiters can:
- Post jobs
- Manage applications
- Update candidate status

## Team Members
- Freddy Mvemba
- Member 2
- Member 3
- Member 4
- Member 5

## Technologies
### Frontend
 - React.js
 - HTML AND CSS
 - JavaScript
### Backend
 - Node.js
 - Express.js
### Database
 - MySQL

### Tools
 - GitHub
 - GitHub Projects
 - Visual Studio Code
 - LaTeX to create PDF files

## Planned Features
### Core Features
- User Registration, authentication, and profile management.
- Resume Upload and management.
- Job Search and filtering capabilities.
- Job application submission
- Application status tracking(Applied,Interview,Offered,Rejected)
- Application history dashboard.
- Notifications and reminders for application deadlines.
- Saved jobs and favourites. 

### AI Feature (Optional advanced feature)
- AI-powered Resume Feedback
- Job matching capability
- Analyze resumes
- Suggest improvements
- Identify missing skills

### Original Team Feature
- Application Deadline Reminder System
- Reminds users of upcoming deadlines
- Helps users stay organized

## Setup Instructions

### install node.js. visit nodejs.org/en/download
### verify that node.js is installed with command node -v at powershell
### install XAMPP by visiting https://www.apachefriends.org/download.html
### Start Apache and MySQL

### Clone Repository

```bash
git clone https://github.com/your-team/careerconnect.git
```
### Install Dependencies

```bash
npm install
npm install express mysql2
```
### Install Bycrypt Generator for password
```bash
npm install bcrypt
```
### Run Application
```bash
npm start
```
## GitHub Repository
GitHub Repository Link:
https://github.com/your-team/careerconnect

## Branching Strategy
- main: Stable production-ready code
- develop: Integration branch
- feature/*: Individual feature branches
  
## Team Workflow
1. Create GitHub Issue
2. Create feature branch
3. Implement feature
4. Open Pull Request
5. Peer Review
6. Merge into develop

# Dev_SOEN341 Backend Setup Guide

This project uses a centralized database environment. Follow these steps to set up your local development environment and connect to the shared database.

---

## 🛠️ Prerequisites

Before starting, ensure you have the following installed on your machine:
* [Node.js](https://nodejs.org) (v16 or higher recommended)
* [DBeaver Community Edition](https://dbeaver.io) *(Optional: Only if you want to visually browse database tables)*

---

## 🚀 Getting Started

### 1. Install Dependencies
Clone the repository, open your terminal in the project root directory (`Dev_SOEN341`), and install the required Node packages:
```bash
npm install
```

### 2. Configure Environment Variables (`.env`)
The `.env` file contains sensitive local connection configurations and is excluded from GitHub tracking via `.gitignore`. 

1. Locate the `.env.example` file in the project root.
2. Create a duplicate copy of `.env.example` in the same directory and rename it exactly to `.env`.
3. Open your new `.env` file and fill it out using the custom credentials provided below.

#### 👥 Teammate Configuration Template:
If you are connecting remotely to the hosted database, update your `.env` file to match this structure:

```env
PORT=3000
DB_HOST=4.tcp.ngrok.io
DB_USER=project_tam
DB_PASSWORD=YOUR_ASSIGNED_PASSWORD
DB_NAME=careerConnect_db
DB_PORT=24494
```
> ⚠️ **Note:** The `DB_PORT` and `DB_HOST` variables are tied to an active hosting session. Please double-check with the team host if these credentials expire or change.

---

## 🏃‍♂️ Running the Server

Once your `.env` file is fully configured, start the backend server by running:
```bash
node src/js/server.js
```
The console should output:
```text
Connected to database: careerConnect_db
Server running at http://localhost:3000/
```

---

## 📊 Viewing the Database Visually (DBeaver)
If you want to view or query tables without writing backend route logic:
1. Open **DBeaver** and create a new **MySQL** connection.
2. Use the exact `DB_HOST`, `DB_PORT`, `DB_USER`, and `DB_PASSWORD` parameters specified inside your private `.env` file.
3. Test connection and save.
