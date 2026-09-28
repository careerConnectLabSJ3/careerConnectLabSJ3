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
- Yacine Zribi
- Emmanuelle Lin
- Bahaeddine Mahgoudh


## Technologies
### Frontend
 - React.js
 - HTML AND CSS
 - JavaScript
### Backend
 - Node.js
 - Express.js
### Database
 - MongoDB (Managed via MongoDB Atlas Cloud Cluster)

### Tools
 - GitHub
 - GitHub Projects
 - Visual Studio Code
 

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


### Clone Repository
```bash
git clone https://github.com/careerConnectLabSJ3/careerConnectLabSJ3.git
```

### Install Dependencies
```bash
npm install
```

### Run Application
```bash
npm start
```
## CareerConnect Deployment Link
*insert here*
## GitHub Repository
GitHub Repository Link:
https://github.com/careerConnect/careerConnect

## Branching Strategy
- main: Stable production-ready code
- develop: Integration branch
- develop/*: Individual feature branches
  
## Team Workflow
1. Create GitHub Issue
2. Create child branch from develop
3. Implement and test feature locally using `npm start`
4. Open Pull Request
5. Peer Review with local testing
6. Merge into develop after approval
7. **Only done once per sprint**: Merge the final product to main branch

# Dev_SOEN341 Backend Setup Guide

This project uses a centralized database environment. Follow these steps to set up your local development environment and connect to the shared database.

---
# 🛠️ Backend Architecture & Setup Guide

This project uses a centralized database environment managed from a primary host. Follow these steps to set up your local development environment and connect your code to the shared infrastructure safely.

## 📋 Prerequisites

Before starting, ensure your machine has the proper tools installed depending on your team role:

### 👥 For All Team Members
* **[Node.js](https://nodejs.org)** (v16 or higher recommended)
* **[MongoDB Compass](https://mongodb.com)** *(Highly Recommended: Use this tool to visually explore database collections, document fields, and user records from your desktop).*


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
MONGO_URI=mongodb+srv://SOEN341:<password>@cluster0.g11n5au.mongodb.net/careerConnect_db?appName=Cluster0

---

## 🏃‍♂️ Running the Server

Open your root repository command terminal and run one of the execution profiles declared inside your `package.json` file:

### A. Development Mode (Recommended for Daily Work)
Launches the backend application with live-reloading features actively running. The application watches file changes and reloads instantly when edits are saved.
```bash
npm start
```
*Behind the scenes, this calls `nodemon server.js` to handle live monitoring.*

### B. Production Testing Mode
Launches a snapshot instance of the backend using regular node processing with no file-watching overhead.
```bash
npm run production
```
*Behind the scenes, this calls `node server.js` standard script runtime.*

On a successful boot sequence, your terminal pane will return:
```text
[nodemon] starting `node server.js`
Connected to database: careerConnect_db
Server running at http://localhost:3000/
```
---

## 📊 Viewing the Database Visually (DBeaver Setup)
To safely browse, alter, or check user registry entries manually:
1. Run **MongoDB Compass** on your PC.
2. Login with your credentials
3. Click **Connect**. You can now view collections and insert/delete documents directly.


---
