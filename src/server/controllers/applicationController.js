import mongoose from 'mongoose';
import Job from '../models/job.js';
import JobApplication from '../models/jobApplication.js';
import { sendResume } from '../serverUtils/fileStorage.js';
import { checkCorrectUser } from '../serverUtils/utils.js';

export const APPLICATION_STATUSES = ['Applied', 'Interview', 'Rejected', 'Offer'];
const APPLICANT_PROFILE_FIELDS = 'name email education experience skills';

export function checkAccess(req, res, role) {
  if(!checkCorrectUser(req, res, role)){
    return false;
  }

  if (!mongoose.isObjectIdOrHexString(req.params.jobId)) {
    res.status(400).json({ error: 'Invalid job ID.' });
    return false;
  }
  return true;
}

export function getJobLifecycleStatus(job) {
  if (String(job?.status || '').toLowerCase() !== 'active') return 'Closed';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(job?.deadline || '')) return 'Closed';

  const deadline = new Date(`${job.deadline}T00:00:00Z`);
  if (Number.isNaN(deadline.getTime()) || deadline.toISOString().slice(0, 10) !== job.deadline) {
    return 'Closed';
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return job.deadline < today ? 'Closed' : 'Active';
}

function isJobOpen(job) {
  if (job.status !== 'Active' || !/^\d{4}-\d{2}-\d{2}$/.test(job.deadline)) return false;
  const deadline = new Date(`${job.deadline}T00:00:00Z`);
  if (Number.isNaN(deadline.getTime()) || deadline.toISOString().slice(0, 10) !== job.deadline) return false;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return job.deadline >= today;
}

export async function getJobDetails(req, res) {
  if (!checkAccess(req, res, 'job_seeker')) return;
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    const hasApplied = Boolean(await JobApplication.exists({ job: job._id, applicant: req.session.user.id }));
    return res.json({ job, hasApplied, canApply: isJobOpen(job) });
  } catch (error) {
    console.error('Failed to load job details:', error);
    return res.status(500).json({ error: 'Unable to load this job. Please try again.' });
  }
}

export async function submitApplication(req, res) {
  if (!checkAccess(req, res, 'job_seeker')) return;
  if (req.body?.confirmed !== true) {
    return res.status(400).json({ error: 'Please confirm that you want to apply.' });
  }

  try {
    // Wait for the unique index before accepting submissions.
    await JobApplication.init();
    // Save the application and update its job count together, or neither is saved.
    const result = await mongoose.connection.transaction(async session => {
      const job = await Job.findById(req.params.jobId).session(session);
      if (!job) return { status: 404, error: 'Job not found.' };
      if (!isJobOpen(job)) return { status: 409, error: 'This job is no longer accepting applications.' };

      const [application] = await JobApplication.create([{
        job: job._id,
        applicant: req.session.user.id
      }], { session });
      await Job.updateOne({ _id: job._id }, { $inc: { applicationsCount: 1 } }, { session });
      return { application, applicationsCount: job.applicationsCount + 1 };
    });

    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.status(201).json({ message: 'Application submitted successfully.', ...result });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'You have already applied for this job.' });
    }
    console.error('Failed to submit application:', error);
    return res.status(500).json({ error: 'Unable to save your application. Please try again.' });
  }
}

async function findOwnedJob(req, res) {
  const job = await Job.findById(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found.' });
    return null;
  }
  if (String(job.recruiter) !== req.session.user.id) {
    res.status(403).json({ error: 'You can only view applications for your own jobs.' });
    return null;
  }
  return job;
}

function checkApplicationAccess(req, res) {
  if (!checkAccess(req, res, 'recruiter')) return false;
  if (!mongoose.isObjectIdOrHexString(req.params.applicationId)) {
    res.status(400).json({ error: 'Invalid application ID.' });
    return false;
  }
  return true;
}

async function findApplication(req, res, job, fields) {
  const application = await JobApplication.findOne({
    _id: req.params.applicationId,
    job: job._id
  }).populate('applicant', fields);
  if (!application) {
    res.status(404).json({ error: 'Application not found.' });
  }
  return application;
}

export async function getJobApplications(req, res) {
  if (!checkAccess(req, res, 'recruiter')) return;
  try {
    const job = await findOwnedJob(req, res);
    if (!job) return;
    const applications = await JobApplication.find({ job: job._id }).
      populate('applicant', APPLICANT_PROFILE_FIELDS).sort({ appliedAt: -1 });
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json(applications);
  } catch (error) {
    console.error('Failed to load applications:', error);
    return res.status(500).json({ error: 'Unable to load applications. Please try again.' });
  }
}

export async function getJobApplication(req, res) {
  if (!checkApplicationAccess(req, res)) return;
  try {
    const job = await findOwnedJob(req, res);
    if (!job) return;
    const application = await findApplication(req, res, job, `${APPLICANT_PROFILE_FIELDS} resumeFileId resumeFileName`);
    if (!application) return;

    const { applicant, appliedAt, status } = application;
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json({
      job: { title: job.title },
      appliedAt,
      status,
      applicant: applicant ? {
        name: applicant.name,
        email: applicant.email,
        education: applicant.education,
        experience: applicant.experience,
        skills: applicant.skills
      } : null,
      resume: applicant?.resumeFileId ? { fileName: applicant.resumeFileName || 'resume.pdf' } : null
    });
  } catch (error) {
    console.error('Failed to load application:', error);
    return res.status(500).json({ error: 'Unable to load this application. Please try again.' });
  }
}

export async function getJobApplicationResume(req, res) {
  if (!checkApplicationAccess(req, res)) return;
  try {
    const job = await findOwnedJob(req, res);
    if (!job) return;
    const application = await findApplication(req, res, job, 'resumeFileId resumeFileName');
    if (!application) return;
    return await sendResume(res, application.applicant);
  } catch (error) {
    console.error('Failed to load application resume:', error);
    return res.status(500).json({ error: 'Unable to retrieve resume.' });
  }
}

export async function getMyApplications(req, res) {
  if (!checkCorrectUser(req, res, 'job_seeker')) return;

  try {
    const applications = await JobApplication.find({ applicant: req.session.user.id }).populate('job', 
      'title company department location deadline status').sort({ appliedAt: -1 });

    return res.json(applications.map(application => {
      const item = typeof application.toObject === 'function' ? application.toObject() : application;
      return {
        ...item,
        jobStatus: getJobLifecycleStatus(item.job)
      };
    }));
  } catch (error) {
    console.error('Failed to load my applications:', error);
    return res.status(500).json({ error: 'Unable to load your applications. Please try again.' });
  }
}

// Temporary job-seeker debug route for exercising the application tracker
// before recruiter-managed status updates are implemented.
export async function updateMyApplicationStatus(req, res) {
  if (!checkCorrectUser(req, res, 'job_seeker')) return;
  if (!mongoose.isObjectIdOrHexString(req.params.applicationId)) {
    return res.status(400).json({ error: 'Invalid application ID.' });
  }

  const { status } = req.body || {};
  if (!APPLICATION_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Please choose a valid application status.' });
  }

  try {
    const application = await JobApplication.findOneAndUpdate(
      { _id: req.params.applicationId, applicant: req.session.user.id },
      { $set: { status } },
      { returnDocument: 'after', runValidators: true }
    );

    if (!application) return res.status(404).json({ error: 'Application not found.' });
    return res.json({ message: 'Application status updated.', application });
  } catch (error) {
    console.error('Failed to update application status:', error);
    return res.status(500).json({ error: 'Unable to update the application status.' });
  }
}
