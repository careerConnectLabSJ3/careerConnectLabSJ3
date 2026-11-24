import { Types } from 'mongoose';
import Job from '../models/job.js';
import User from '../models/user.js';
import JobApplication from '../models/jobApplication.js';
import { checkCorrectUser } from '../serverUtils/utils.js';
import { getJobLifecycleStatus } from './applicationController.js';

const searchableFields = ['title', 'requirements', 'description', 'department', 'company', 'location', 'jobType'];

function publishedJobs() {
    return { $or: [
        { publishDate: { $lte: new Date().toISOString().slice(0, 10) } },
        { publishDate: null }
    ] };
}

function keywordFilter(terms) {
    const pattern = terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    return { $or: searchableFields.map(field => ({ [field]: { $regex: pattern, $options: 'i' } })) };
}

function matchCount(job, terms) {
    return terms.filter(term => searchableFields.some(field =>
        job[field]?.toLowerCase().includes(term))).length;
}

function keywordsOf(query) {
    return [...new Set(query.toLowerCase().split(/\s+/).filter(Boolean))];
}

export async function searchJob(req, res) {
    if (!checkCorrectUser(req, res, 'job_seeker')) return;
    const { keywords = '', view = 'active' } = req.query;
    if (typeof keywords !== 'string' || keywords.length > 200 || !['active', 'past'].includes(view)) {
        return res.status(400).json({ error: 'Invalid search. Use up to 200 characters.' });
    }
    const terms = keywordsOf(keywords);
    const searchedAt = new Date();
    const filter = { ...publishedJobs(), status: view === 'past' ? { $in: ['Active', 'Closed'] } : 'Active' };
    if (terms.length) filter.$and = [keywordFilter(terms)];
    const jobs = await Job.find(filter).sort({ deadline: 1, _id: 1 }).lean();
    const status = view === 'past' ? 'Closed' : 'Active';
    const matches = jobs.filter(job => getJobLifecycleStatus(job) === status).
        map(job => ({ job: { ...job, status }, score: matchCount(job, terms) })).
        sort((a, b) => b.score - a.score);
    if (req.method === 'POST' && terms.length && view === 'active') {
        await User.updateOne({ _id: req.session.user.id }, {
            $push: { recentSearches: { $each: [{ keywords: keywords.trim(), searchedAt }], $slice: -20 } }
        });
    }
    return res.json(matches.map(match => match.job));
}

export function freshMatches(jobs, searches, since) {
    const history = searches.map(search => ({ ...search, terms: keywordsOf(search.keywords) }));
    const matches = [];
    for (const job of jobs) {
        if (getJobLifecycleStatus(job) !== 'Active') continue;
        const published = Math.max(Number(job.publishedAt || job._id.getTimestamp()),
            Date.parse(job.publishDate) || 0);
        if (published < since) continue;
        const search = history.find(entry => published > entry.searchedAt && matchCount(job, entry.terms));
        if (search) matches.push({ _id: job._id, title: job.title, company: job.company,
            location: job.location, jobType: job.jobType || 'Not specified', sourceSearch: search.keywords, published });
    }
    return matches.sort((a, b) => b.published - a.published).slice(0, 3);
}

export async function getRecommendations(req, res) {
    if (!checkCorrectUser(req, res, 'job_seeker')) return;
    res.set('Cache-Control', 'private, no-store');
    const userId = req.session.user.id;
    const user = await User.findById(userId).select('recentSearches').lean();
    const searches = (user?.recentSearches || []).slice().reverse();
    if (!searches.length) return res.json([]);
    const since = new Date(Date.now() - 7 * 86400000);
    const applied = await JobApplication.distinct('job', { applicant: userId });
    const terms = [...new Set(searches.flatMap(search => keywordsOf(search.keywords)))];
    const jobs = await Job.find({ ...publishedJobs(), status: 'Active', _id: { $nin: applied },
        $and: [keywordFilter(terms), { $or: [
            { publishedAt: { $gte: since } }, { publishDate: { $gte: since.toISOString().slice(0, 10) } },
            { _id: { $gte: Types.ObjectId.createFromTime(Math.floor(since.getTime() / 1000)) } }
        ] }]
    }).lean();
    return res.json(freshMatches(jobs, searches, since));
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
            ...publishedJobs(),
            status: 'Active'
        }).sort({ deadline: 1 });

        res.status(200).json(upcomingJobs.filter(job => getJobLifecycleStatus(job) === 'Active'));
    } catch (error) {
        console.error('Error fetching upcoming deadlines:', error);
        res.status(500).json({ error: 'Server error fetching deadlines' });
    }
}
