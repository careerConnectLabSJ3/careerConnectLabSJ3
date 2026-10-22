# Issue 27 job posting acceptance tests

Acceptance tests for user story [#27](https://github.com/careerConnectLabSJ3/careerConnectLabSJ3/issues/27) are published as labeled GitHub issues: [#37, successful posting and discovery](https://github.com/careerConnectLabSJ3/careerConnectLabSJ3/issues/37) and [#38, authorization and validation](https://github.com/careerConnectLabSJ3/careerConnectLabSJ3/issues/38).

## AT27-1 recruiter posts a valid job

1. Log in as a recruiter and open Post a New Job Opportunity.
2. Fill in title, company, department, location, description, requirements, and today's date or a future deadline.
3. Select Post job.
4. Expect a success message and the new job in Your Job Postings with zero applications and Active status.
5. Refresh and expect the job to remain in the recruiter's list.
6. Log in as a job seeker and search for the title or department. Expect the posting in the results.

## AT27-2 unauthorized posting is rejected

1. With no login session, send POST /api/jobs with otherwise valid fields. Expect 401 and no job created.
2. Repeat while logged in as a job seeker. Expect 403 and no job created.
3. Confirm a job seeker does not see the recruiter posting form.
4. As a different recruiter, confirm GET /api/jobs/mine does not return the first recruiter's postings.

## AT27-3 invalid details are rejected

1. Leave each required field empty, then try text containing only spaces. Expect validation and no job created.
2. Choose yesterday as the deadline. Expect the browser to reject it.
3. Send a past or impossible deadline directly to POST /api/jobs. Expect 400 and no job created.
4. With a valid submission, expect the Post job button to be disabled while the request is pending.
5. If a save fails, expect an error message and the entered details to remain available for correction or retry.

## Automated checks

Run from the repository root:

```powershell
node --test src/server/test/jobPosting.test.js
```

The tests exercise the real posting controller and Mongoose model validation using mocked database calls. They do not connect to Atlas or start a server.

## Browser verification on October 15 2026

Tested in Brave with Yacine's recruiter session after an approved backend restart:

- A labeled test posting saved successfully, showed confirmation, and appeared with zero applications and Active status.
- The posting remained after a full page refresh.
- The search endpoint returned the posting when filtered by title and department. The job-seeker dashboard was not tested with a job-seeker login.
- Empty required fields, a spaces-only job title, and yesterday's deadline were rejected.
- Inputs and buttons were disabled during the save request.
- The logged-out recruiter-list request returned an authentication error after the restart cleared the old session.

Test record left for inspection: TEST ONLY - CareerConnect posting check 2026-10-15. Multi-account browser checks and direct invalid-request checks remain covered only by the automated tests where applicable.
