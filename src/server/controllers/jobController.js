import Job from '../models/job.js';

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