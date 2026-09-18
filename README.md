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
2. Create feature branch to individually test your indivual work before merging to develop
3. implement and test feature locally using `npm start`
4. Open Pull Request
5. Peer Review
6. Merge into develop
7.Final step:Merge the final product to main branch

# Dev_SOEN341 Backend Setup Guide

This project uses a centralized database environment. Follow these steps to set up your local development environment and connect to the shared database.

---
# 🛠️ Backend Architecture & Setup Guide

This project uses a centralized database environment managed from a primary host. Follow these steps to set up your local development environment and connect your code to the shared infrastructure safely.

## 📋 Prerequisites

Before starting, ensure your machine has the proper tools installed depending on your team role:

### 👥 For All Team Members (Host & Remote Teammates)
* **[Node.js](https://nodejs.org)** (v16 or higher recommended)
* **[DBeaver Community Edition](https://dbeaver.io)** *(Highly Recommended: Use this tool to visually explore database tables, user profiles, and record data from your desktop).*

### 🏠 For the Database Host Only
* **[XAMPP](https://apachefriends.org) / [WAMP](https://wampserver.com)** *(Required to run the underlying MySQL server instance. Apache and MySQL modules must be running).*
* **[Ngrok Tunneling Client](https://ngrok.com)** *(Required to open an active internet gateway proxy for incoming database connections).*

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
To safely browse, alter, or check user registry indexes manually without manually generating dummy route scripts:

1. Run **DBeaver Community Edition** on your PC.
2. Click the **Plug Icon** (New Connection Wizard) and pick **MySQL** from the prompt selection.
3. Input the parameters matching your private local `.env` variables:
   * **Host:** Use your `.env` value (`127.0.0.1` or the ngrok server host address)
   * **Port:** Match your assigned environment database port
   * **Username / Password:** Provide your configured profile values
4. Select **Test Connection** (Accept any missing driver download requests) and click **Finish**.

---
