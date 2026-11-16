import Job from '../models/job.js';
import { getJobLifecycleStatus } from './applicationController.js';

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
