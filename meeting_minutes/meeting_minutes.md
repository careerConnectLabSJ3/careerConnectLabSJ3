#  SOEN 341 - Sprint 1 Meeting Minutes
**Project:** CareerConnect - Job Search and Application Tracking Platform [1]  
**Team Members:** Freddy Mvemba Bosala, Yacine, Emmanuelle, Bahaeddine  

---

##  Meeting 1: Project Kickoff & Workspace Setup
* **Date:** September 15, 2026
* **Attendance:** Freddy, Yacine, Emmanuelle, Bahaeddine
* **Purpose:** Initialize project repository, select initial stack, and define baseline team workflows.
* **Discussion Points:**
  - Reviewed Sprint 1 project deliverables and rubric requirements.
  - Discussed repository structure and initialization procedures.
  - Set up a standard branching strategy targeting `develop` as the active integration stream.
* **Decisions Made:**
  - Initialized the base repository layout with dedicated folders (`AI_Log`, `deliverables`, `docs`, `meeting_minutes`).
  - Selected Express.js for the server backbone and initial local MySQL via XAMPP for database handling.
* **Action Items:**
  - **Freddy:** Build repository structure and establish the initial project tracking board.
  - **Yacine & Emmanuelle:** Draft initial User Stories on GitHub Issues.

---

##  Meeting 2: Backlog Refinement & UI Mapping
* **Date:** September 18, 2026
* **Attendance:** Freddy, Yacine, Emmanuelle, Bahaeddine
* **Purpose:** Finalize User Stories, breakdown architectural tasks, and begin coding registration views.
* **Discussion Points:**
  - Refined the required 15 user stories using appropriate labels on the project board.
  - Reviewed the visual hierarchy needed for `index.html` and authentication views.
  - Established the team's Definition of Ready (DoR) and Definition of Done (DoD).
* **Decisions Made:**
  - Assigned development of base backend endpoints to Freddy.
  - Assigned frontend landing page and dashboard views across the remaining team members to maintain parallel workflows.
* **Action Items:**
  - **Freddy:** Build out the `register.html` layout and verify local MySQL connection blocks.
  - **Bahaeddine:** Work on the core job seeker and recruiter dashboard navigation routes.

---


##  Meeting 4: Database Infrastructure Overhaul & Sprint Close
* **Date:** September 23, 2026 (Today)
* **Attendance:** Freddy, Yacine, Emmanuelle, Bahaeddine
* **Purpose:** Migrate architecture from local MySQL instances to a centralized cloud system and finalize final review packaging.
* **Discussion Points:**
  - Evaluated team difficulties in keeping isolated local database environments synced during parallel feature coding.
  - Explored MongoDB Atlas as a cloud alternative to allow decentralized read/write operations from anywhere.
  - Resolved local DNS SRV caching conflicts and whitelisted global network security groups (`0.0.0.0/0`).
  - Organized personal GenAI documentation reports inside the `AI_Log` directory.
* **Decisions Made:**
  - **Unanimous Decision:** Completely dropped the local MySQL driver infrastructure (`mysql2`) in favor of an online, shared **MongoDB Atlas Cloud Cluster** managed via `mongoose`.
  - Maintained the strict branching strategy, creating an isolated feature stream (`feature/Freddy-index-update`) to cleanly segment the front-end layout upgrades from backend migrations.
* **Action Items:**
  - **Freddy:** Submit and open independent clean Pull Requests targeting `develop` for the database conversion and landing page optimizations.
  - **All Members:** Run `npm install` locally to update system drivers to mongoose, configure shared `.env` files, and complete individual sprint submission records.
