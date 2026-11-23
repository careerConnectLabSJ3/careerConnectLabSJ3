import Job from '../models/job.js';
import { checkCorrectUser } from '../serverUtils/utils.js';
import { getJobLifecycleStatus } from './applicationController.js';

const searchableFields = ['title', 'requirements', 'description', 'department', 'company', 'location', 'jobType'];

export function rankRecommendations(jobs, terms) {
    return jobs.filter(job => getJobLifecycleStatus(job) === 'Active').map(job => {
        const fields = searchableFields.map(field => (job[field] || '').toLowerCase());
        const matchedKeywords = terms.filter(term => fields.some(field => field.includes(term)));
        const { _id, title, company, location, jobType } = job;
        return { _id, title, company, location, jobType: jobType || 'Not specified', matchedKeywords };
    }).filter(job => job.matchedKeywords.length > 0).sort((a, b) =>
        b.matchedKeywords.length - a.matchedKeywords.length || a.title.localeCompare(b.title) ||
        String(a._id).localeCompare(String(b._id)));
}

export async function getRecommendations(req, res) {
    if (!checkCorrectUser(req, res, 'job_seeker')) return;
    const { keywords } = req.query;
    if (typeof keywords !== 'string' || !keywords.trim() || keywords.length > 200) {
        return res.status(400).json({ error: 'Enter keywords using 1 to 200 characters.' });
    }
    const terms = [...new Set(keywords.trim().toLowerCase().split(/\s+/))];
    const pattern = terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const today = new Date().toISOString().slice(0, 10);
    try {
        const jobs = await Job.find({
            status: 'Active',
            $and: [
                { $or: [{ publishDate: null }, { publishDate: { $lte: today } }] },
                { $or: searchableFields.map(field => ({ [field]: { $regex: pattern, $options: 'i' } })) }
            ]
        }, [...searchableFields, 'deadline', 'status'].join(' ')).lean();
        return res.json(rankRecommendations(jobs, terms));
    } catch (error) {
        console.error('Failed to load recommendations:', error);
        return res.status(500).json({ error: 'Unable to load recommended jobs. Please try again.' });
    }
}

export async function checkUpcomingDeadlines(req, res) {
    try {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        // Since your database stores dates as strings "YYYY-MM-DD", 
        // we need to format today and next week the same way to compare them.
        const formatDate = (date) => date.toISOString().split('T')[0];
        const todayString = formatDate(today);
        const nextWeekString = formatDate(nextWeek);

        const upcomingJobs = await Job.find({
            deadline: {
                $gte: todayString,
                $lte: nextWeekString
            },
            status: { $ne: 'Draft' }
        }).sort({ deadline: 1 });

        res.status(200).json(upcomingJobs);
    } catch (error) {
        console.error('Error fetching upcoming deadlines:', error);
        res.status(500).json({ error: 'Server error fetching deadlines' });
    }
}

export async function searchJob(req, res) {
    try {
        // Extract the search query parameters sent by the frontend
        const { title, department, location } = req.query;
        const jobFilters = {};

        if (title)
            jobFilters.title = { $regex: title, $options: 'i' };

        if (department)
            jobFilters.department = { $regex: department, $options: 'i' };

        if (location)
            jobFilters.location = { $regex: location, $options: 'i' };

        // Get today's date in YYYY-MM-DD format to filter scheduled jobs
        const today = new Date().toISOString().split('T')[0];

        // Retrieve active/closed jobs that are not drafts and are either 
        // published today/past, or have no publish date
        const jobs = await Job.find({
            ...jobFilters,
            status: { $ne: 'Draft' },
            $or: [
                { publishDate: { $lte: today } },
                { publishDate: { $exists: false } },
                { publishDate: null }
            ]
        }).sort({ deadline: 1 });

        // send response to the user as an json object
        return res.status(200).json(jobs.map(job => ({
            ...job.toObject(),
            status: getJobLifecycleStatus(job)
        })));

    } catch (error) {
        console.error('Failed to query jobs:', error);
        return res.status(500).send('Database search error: ' + error.message);
    }
}
