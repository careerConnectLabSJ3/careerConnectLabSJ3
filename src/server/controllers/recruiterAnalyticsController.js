import Job from '../models/job.js';
import JobApplication from '../models/jobApplication.js';
import { checkCorrectUser } from '../serverUtils/utils.js';

export async function getRecruiterAnalytics(req, res) {
  if (!checkCorrectUser(req, res, 'recruiter')) return;
  const { since } = req.query;
  if (since !== undefined && (typeof since !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(since) || Number.isNaN(Date.parse(since)))) {
    return res.status(400).json({ error: 'Invalid analytics start date.' });
  }
  try {
    const jobs = await Job.find({ recruiter: req.session.user.id }).select('_id title').lean();
    const match = { job: { $in: jobs.map(job => job._id) } };
    if (since) match.appliedAt = { $gte: new Date(since) };
    const counts = jobs.length ? await JobApplication.aggregate([
      { $match: match },
      { $group: { _id: { job: '$job', status: '$status' }, count: { $sum: 1 } } }
    ]) : [];
    const results = new Map(jobs.map(job => [String(job._id), { ...job, total: 0, counts: {} }]));
    for (const entry of counts) {
      const job = results.get(String(entry._id.job));
      if (!job) continue;
      job.counts[entry._id.status] = entry.count;
      job.total += entry.count;
    }
    res.set('Cache-Control', 'private, no-store');
    return res.json([...results.values()]);
  } catch {
    return res.status(500).json({ error: 'Unable to load posting analytics.' });
  }
}
