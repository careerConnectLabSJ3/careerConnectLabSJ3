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
Use `src/server/.env` for local setup. The backend resolves this path from its entry point so it works from any launch directory. Existing environment variables take precedence, followed by `src/server/.env` and then the repository-root `.env` for older local setups.

### Resume Improver

- **Purpose.** Help job seekers make specific, factual improvements to resume bullets before applying.
- **Inputs.** A saved resume PDF up to 5 MB and, if requested, a short answer to a follow-up question.
- **Model and prompt.** Claude Haiku 5.5 by default. The prompt prioritizes the candidate's contribution and measurable results, preserves existing facts, and discourages invented numbers. It draws on [MIT's Project, Action, Result method](https://capd.mit.edu/resources/resumes-writing-about-your-skills/) and [Penn Engineering's advice on showing technical work](https://careerservices.upenn.edu/a-few-resume-application-tips-from-jamie-grant-senior-associate-director-for-seas/). `ANTHROPIC_MODEL` can select another model that supports PDFs and structured output.
- **Expected output.** Up to five inline edits, with ready-to-approve rewrites first. Go to **Profile → Improve resume with AI**, approve the edits you want, preview the PDF, then save it as your active resume. **Restore original** is available after saving.
- **Validation.** The server validates the structured response and rejects new numeric claims that are missing from the supplied text or answer. The browser highlights edits only when the source text matches uniquely. Jest tests mock Anthropic and storage. Vitest covers reviewing, previewing, and saving. Use a fictional PDF to check the live flow.
- **Limitations.** AI suggestions can be inaccurate. Scans without selectable text cannot be highlighted, and an edit cannot be saved if the revised text does not fit safely in the PDF. Requests are limited to five per user and 30 per server process per minute.
- **Privacy.** Checking sends the full saved PDF to Anthropic. Follow-up answers are also sent. Recruiters reviewing past applications see the active resume. See [Anthropic's data retention terms](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention).
- **Failure handling.** A missing key disables AI review and shows local setup instructions. Provider errors, timeouts, rate limits, and PDF export problems show a message by the action that failed. A failed preview or save leaves the active resume unchanged.

To enable live feedback, add this line to the existing local `src/server/.env` file and restart the backend:

```env
ANTHROPIC_API_KEY=your_key_here
```

For deployment, set the key as a backend runtime secret. Git ignores local `.env` files. The automated tests do not need a key. See [Anthropic's pricing](https://platform.claude.com/docs/en/about-claude/pricing) for API costs.

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

Use Node.js 22.13 or newer in the Node 22 release line for this test setup. CI uses Node 22. Install the locked dependencies from the repository root:

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
