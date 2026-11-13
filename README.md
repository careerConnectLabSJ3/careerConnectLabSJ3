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
- Bahaeddine Mahfoudh


## Tech Stack Used
- **React.js**: Frontend framework for building the interactive UI and managing application state.
- **Node.js**: Server runtime for executing JavaScript on the backend.
- **Express.js**: Backend framework for handling API requests and managing user authentication.
- **MongoDB**: NoSQL database to store user data and job information.

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
---

# General Setup Instructions
### Clone Repository
```bash
git clone https://github.com/careerConnectLabSJ3/careerConnectLabSJ3.git
```

### Install Dependencies
Ensure you have all the necessary packages by installing all the dependencies: 
```bash
npm run build
```

### Environment Variables (`.env`)
The `.env` file contains sensitive local connection configurations and is excluded from GitHub tracking via `.gitignore`. 
If you are connecting remotely to the hosted database, update your `.env` file to match this structure:

```env
PORT=3000
MONGODB_URI=mongodb+srv://SOEN341:<password>@cluster0.g11n5au.mongodb.net/careerConnect_db?appName=Cluster0
```
**Make sure the .env file is located in src/server**

## Run Application for **Production**
Make sure you are in the project **root directory**
```bash
npm start
```

## Run Application for **Development**
Open two terminals: one in **/client** and the other in **/server**
### Client
```
npm run dev
```
### Server
```
npm run start
```
## Run linter
Make sure all dependencies have been installed and in *root*, run:
```
npm run lint
```

## Run tests

Use Node.js 22.12 or newer in the Node 22 release line for this test setup. CI uses Node 22. Install the locked dependencies from the repository root:

```bash
npm ci
npm ci --prefix src/server
npm ci --prefix src/client
```

Run both suites from the repository root:

```bash
npm test
```

Run a suite separately:

```bash
npm run test:unit
npm run test:acceptance
```

Jest runs backend unit tests in `src/server/test/**/*.test.js` and frontend utility tests named `*.unit.test.js` in `src/client/tests`. Backend tests use Jest's `jest.spyOn` mocks and keep database calls mocked. New backend tests should import test helpers from `@jest/globals`, rather than `node:test`.

Vitest runs React acceptance tests named `*.acceptance.test.js` or `*.acceptance.test.jsx` in `src/client/tests`. Both CI commands run once and exit, without watch mode. For acceptance-test watch mode during development, run `npm --prefix src/client run test:watch`.

CI reports ESLint, Jest unit tests, and Vitest acceptance tests as separate jobs on PRs to `develop` or `main`, and pushes to `main`. A failing suite fails its job and the workflow. Mocked tests do not require an `.env` file or an Atlas connection. Jest uses Node's experimental VM-module flag because the project uses ES modules.

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
