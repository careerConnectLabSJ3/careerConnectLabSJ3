import Job from './models/job.js';
import mongoose from 'mongoose';
import JobApplication from './models/jobApplication.js';

function checkRecruiter(req, res) {
  if (!req.session.user) {
    res.status(401).json({ error: 'Please log in to post jobs.' });
    return false;
  }
  if (req.session.user.role !== 'recruiter') {
    res.status(403).json({ error: 'Only recruiters can post jobs.' });
    return false;
  }
  return true;
}
async function findOwnedJob(req, res) {
  // 1. Calls checkRecruiter(req, res) and returns null if it fails.
  if (!checkRecruiter(req, res)) {
    return null;
  }

  // 2. Checks if the jobId is a valid MongoDB ObjectId
  if (!mongoose.isObjectIdOrHexString(req.params.jobId)) {
    res.status(400).json({ error: 'Invalid job ID format.' });
    return null;
  }

  // 3. Looks up the job by ID
  const job = await Job.findById(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found.' });
    return null;
  }

  // 4. Checks if the logged-in recruiter actually owns this job
  if (String(job.recruiter) !== req.session.user.id) {
    res.status(403).json({ error: 'You can only manage jobs that you have posted.' });
    return null;
  }
  return job;
}

export async function createJob(req, res) {
  if (!checkRecruiter(req, res)) return;

  // Copy only the fields a recruiter is allowed to submit.
  const jobData = {};
  const fields = ['title', 'company', 'department', 'location', 'description', 'requirements', 'deadline'];
  for (const field of fields) {
    const value = req.body?.[field];
    if (typeof value !== 'string' || !value.trim()) {
      return res.status(400).json({ error: 'Please fill in every field.' });
    }
    jobData[field] = value.trim();
  }

  // Reject impossible dates as well as deadlines before today's calendar date.
  const deadline = new Date(`${jobData.deadline}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jobData.deadline) ||
      Number.isNaN(deadline.getTime()) ||
      deadline.toISOString().slice(0, 10) !== jobData.deadline) {
    return res.status(400).json({ error: 'Please enter a valid application deadline.' });
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (jobData.deadline < today) {
    return res.status(400).json({ error: 'The application deadline must be today or a future date.' });
  }

  try {
    // Ownership comes from the login session, never from the form.
    jobData.recruiter = req.session.user.id;
    const job = await Job.create(jobData);
    return res.status(201).json({ message: 'Job posted successfully.', job });
  } catch (error) {
    console.error('Failed to post job:', error);
    return res.status(500).json({ error: 'Unable to save your job. Please try again.' });
  }
}

export async function getRecruiterJobs(req, res) {
  if (!checkRecruiter(req, res)) return;
  try {
    const jobs = await Job.find({ recruiter: req.session.user.id }).sort({ _id: -1 });
    return res.json(jobs);
  } catch (error) {
    console.error('Failed to load recruiter jobs:', error);
    return res.status(500).json({ error: 'Unable to load your job postings. Please try again.' });
  }
}
// 1. Function to Edit/Update a Job
export async function updateJob(req, res) {
  const job = await findOwnedJob(req, res);
  if (!job) return; 

  const fields = ['title', 'company', 'department', 'location', 'description', 'requirements', 'deadline'];
  const jobData = {};
  
  for (const field of fields) {
    const value = req.body?.[field];
    if (typeof value !== 'string' || !value.trim()) {
      return res.status(400).json({ error: 'Please fill in every field.' });
    }
    jobData[field] = value.trim();
  }

  const deadline = new Date(`${jobData.deadline}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jobData.deadline) ||
      Number.isNaN(deadline.getTime()) ||
      deadline.toISOString().slice(0, 10) !== jobData.deadline) {
    return res.status(400).json({ error: 'Please enter a valid application deadline.' });
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (jobData.deadline < today) {
    return res.status(400).json({ error: 'The application deadline must be today or a future date.' });
  }

  try {
    // Update the job with the new data
    const updatedJob = await Job.findByIdAndUpdate(job._id, jobData, { new: true, runValidators: true });
    return res.json({ message: 'Job updated successfully.', job: updatedJob });
  } catch (error) {
    console.error('Failed to update job:', error);
    return res.status(500).json({ error: 'Unable to update your job. Please try again.' });
  }
}

// 2. Function to Change Status (Publish/Close/Save Draft)
export async function updateJobStatus(req, res) {
  const job = await findOwnedJob(req, res);
  if (!job) return;

  const { status } = req.body;
  if (!['Active', 'Closed', 'Draft'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be Active, Closed, or Draft.' });
  }

  // Itrying to publish a draft, make sure the deadline isn't expired
  if (status === 'Active') {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (job.deadline < today) {
      return res.status(400).json({ error: 'Cannot publish a job with an expired deadline.' });
    }
  }

  try {
    job.status = status;
    await job.save();
    return res.json({ message: `Job status changed to ${status}.`, job });
  } catch (error) {
    console.error('Failed to change job status:', error);
    return res.status(500).json({ error: 'Unable to change job status. Please try again.' });
  }
}

// 3. Function to Delete a Job
export async function deleteJob(req, res) {
  const job = await findOwnedJob(req, res);
  if (!job) return;

  try {
    
    await JobApplication.deleteMany({ job: job._id });
    
    // Then delete the job itself
    await job.deleteOne();
    
    return res.json({ message: 'Job deleted successfully.' });
  } catch (error) {
    console.error('Failed to delete job:', error);
    return res.status(500).json({ error: 'Unable to delete the job. Please try again.' });
  }
}

// 4. Function to Duplicate a Job
export async function duplicateJob(req, res) {
  const job = await findOwnedJob(req, res);
  if (!job) return;

  try {
    const duplicatedJobData = {
      title: `${job.title || 'Untitled Job'} (Copy)`,
      company: job.company || 'Unknown Company',
      department: job.department || 'General',
      location: job.location || 'Not specified',
      description: job.description || '',
      requirements: job.requirements || '',
      deadline: job.deadline,
      recruiter: req.session.user.id,
      status: 'Draft',
      applicationsCount: 0
    };

    const newJob = await Job.create(duplicatedJobData);
    return res.status(201).json({ message: 'Job duplicated successfully.', job: newJob });
  } catch (error) {
    console.error('Failed to duplicate job:', error);
    // Send the actual error message back to the frontend so we can see it
    return res.status(500).json({ error: error.message || 'Unable to duplicate the job.' });
  }
}