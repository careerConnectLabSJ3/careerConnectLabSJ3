# Issue 28 application submission

User story: [#28](https://github.com/careerConnectLabSJ3/careerConnectLabSJ3/issues/28). Published acceptance tests: [#48](https://github.com/careerConnectLabSJ3/careerConnectLabSJ3/issues/48) and [#49](https://github.com/careerConnectLabSJ3/careerConnectLabSJ3/issues/49).

## Scope

Job seekers open a job's details, select Apply, and confirm submission. The application links the job and signed-in applicant, with appliedAt and initial status Applied. No cover letter or separate resume upload is required by this confirmation flow. The recruiter can read the submitted application through an ownership-protected endpoint. Applicant-view screens and status tracking remain Emma's and Baha's work.

## API and shared model

- GET /api/jobs/:jobId returns job details, hasApplied for the signed-in seeker, and canApply.
- POST /api/jobs/:jobId/applications accepts { "confirmed": true }. Job and applicant identities, date, and initial status come from the server.
- GET /api/jobs/:jobId/applications allows only the recruiter who owns the job. Applicant fields are limited to name, email, education, experience, and skills. Password hashes are excluded.
- JobApplication fields: job (Job reference), applicant (User reference), appliedAt (Date), status (String, initially Applied).
- A unique compound index on job and applicant prevents duplicate submissions, including concurrent requests. Index initialization is awaited before submissions.
- Submission uses a MongoDB transaction to save the application and increment applicationsCount together. This needs Atlas or another transaction-capable replica set. Existing Atlas configuration is unchanged. Real transaction rollback and concurrent submission behavior still require integration testing.
- Deadline eligibility follows the server's local calendar date, matching posting validation. Today is allowed; past, missing, and impossible deadlines and non-Active jobs are rejected.

## AT28-1 successful application and recruiter access

1. Log in as a job seeker and find an Active job with today's or a future deadline.
2. Select View details. Check company, location, department, description, requirements, and deadline.
3. Select Apply. Cancel once and confirm no application is submitted.
4. Select Apply and Confirm application. Expect a success message, disabled controls while saving, and a candidate count increased by one.
5. Close and reopen the details, then refresh. Expect You have already applied for this job and no second Apply button.
6. As the recruiter who owns the job, request GET /api/jobs/:jobId/applications. Expect the saved application, applicant profile, Applied status, and application date. A frontend applicant list is outside this issue.

## AT28-2 duplicates, invalid requests, and permissions

1. Repeat a valid submission for the same job and applicant. Expect 409 and no additional application or count increase.
2. Send two simultaneous submissions for the same job and applicant. Expect exactly one saved application and one count increase.
3. Send a submission while logged out. Expect 401. Repeat as a recruiter and expect 403.
4. Omit confirmed or send a value other than boolean true. Expect 400 and no application.
5. Submit a malformed job ID, then a valid ID for a missing job. Expect 400 and 404 respectively.
6. Apply to a Closed or expired job, including a job closed after its details were opened. Expect 409 and no application.
7. Include a different applicant, job, status, or application date in the request body. Expect those values to be ignored and server-owned values used.
8. As another recruiter or a job seeker, request the recruiter applications endpoint. Expect 403 and no applicant information.
9. If saving fails, expect an error instead of success. A failure updating the job count must roll back the application through the transaction.

## Checks performed

The frontend production build and automated controller/model tests passed. Tests use mocked database operations and transactions, with real Mongoose model validation. They do not establish real MongoDB transaction rollback, index enforcement under concurrent writes, browser behavior, or multi-account integration. No servers were launched, dependencies installed, or shared database records changed during this implementation.

Run from the repository root:

```powershell
node --test src/server/test/jobApplication.test.js src/server/test/jobPosting.test.js
npm.cmd --prefix src/client run build
```
