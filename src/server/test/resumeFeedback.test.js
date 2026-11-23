import { expect, jest, test } from '@jest/globals';
import User from '../models/user.js';

const pdf = Buffer.from('%PDF-test');
const readResumePdf = jest.fn(async () => pdf);
jest.unstable_mockModule('../serverUtils/fileStorage.js', () => ({ readResumePdf }));
const { reviewResume } = await import('../controllers/resumeFeedbackController.js');

function response() {
    const res = { set: jest.fn(), json: jest.fn(), status: jest.fn() };
    res.status.mockReturnValue(res);
    return res;
}

const session = { user: { id: 'test-seeker', role: 'job_seeker' } };
const req = { session, is: type => type === 'application/json', body: { action: 'review-with-claude' } };
const edit = { page: 1, original: 'Built a demo.', reason: 'Missing outcome',
    replacement: '', question: 'Who used it?' };
const ready = { page: 1, original: 'Used React to build 6 dashboards.', reason: 'Lead with the contribution',
    replacement: 'Built 6 dashboards using React.', question: 'Who used the dashboards?' };
const fabricated = { ...ready, original: 'Added tests.', replacement: 'Cut incidents by 15%.' };
const anotherQuestion = { ...edit, original: 'Helped with work.', question: 'What did you build?' };

test('requires a job seeker, explicit review action, and configured key', async () => {
    const env = jest.replaceProperty(process, 'env', {});
    const fetch = jest.spyOn(globalThis, 'fetch');
    try {
        const res = response();
        await reviewResume({}, res);
        expect(res.status).toHaveBeenLastCalledWith(401);
        await reviewResume({ session: { user: { role: 'recruiter' } } }, res);
        expect(res.status).toHaveBeenLastCalledWith(403);
        await reviewResume({ ...req, body: {} }, res);
        expect(res.status).toHaveBeenLastCalledWith(400);
        await reviewResume(req, res);
        expect(res.status).toHaveBeenLastCalledWith(503);
        expect(fetch).not.toHaveBeenCalled();
    } finally {
        env.restore();
    }
});

test('sends the signed-in seeker’s saved PDF and handles missing resumes and provider failures', async () => {
    const env = jest.replaceProperty(process, 'env', { ANTHROPIC_API_KEY: 'test-key' });
    const fetch = jest.spyOn(globalThis, 'fetch');
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({
        content: [{ type: 'text', text: JSON.stringify({ edits: [edit, fabricated, anotherQuestion, ready] }) }]
    }) });
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({
        content: [{ type: 'text', text: JSON.stringify({ replacement: 'Built a demo that reduced load time by 15%.' }) }]
    }) });
    fetch.mockRejectedValue(new Error('provider unavailable'));
    try {
        const findUser = jest.spyOn(User, 'findById');
        const lookup = user => ({ select: () => ({ lean: async () => user }) });
        findUser.mockReturnValueOnce(lookup({})).mockReturnValue(lookup({ resumeFileId: 'saved-pdf' }));
        const missing = response();
        await reviewResume({ ...req, session: { user: { id: 'no-resume', role: 'job_seeker' } } }, missing);
        expect(missing.status).toHaveBeenCalledWith(404);
        expect(fetch).not.toHaveBeenCalled();
        const res = response();
        await reviewResume(req, res);
        expect(findUser).toHaveBeenLastCalledWith(session.user.id);
        expect(readResumePdf).toHaveBeenLastCalledWith('saved-pdf');
        expect(res.json).toHaveBeenCalledWith({ edits: [ready, edit] });
        const [url, options] = fetch.mock.calls[0];
        expect(url).toBe('https://api.anthropic.com/v1/messages');
        expect(JSON.parse(options.body).model).toBe('claude-haiku-5-5');
        expect(JSON.parse(options.body).thinking).toEqual({ type: 'disabled' });
        expect(JSON.parse(options.body).messages[0].content[0]).toEqual({
            type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf.toString('base64') }
        });
        await reviewResume({ ...req, body: {
            action: 'rewrite-with-claude', original: edit.original, question: 'How much faster did it load?',
            answer: '15%'
        } }, res);
        expect(res.json).toHaveBeenLastCalledWith({ replacement: 'Built a demo that reduced load time by 15%.' });
        await reviewResume(req, res);
        expect(res.status).toHaveBeenLastCalledWith(502);
        await reviewResume(req, res);
        await reviewResume(req, res);
        await reviewResume(req, res);
        expect(res.status).toHaveBeenLastCalledWith(429);
        expect(fetch).toHaveBeenCalledTimes(5);
    } finally {
        env.restore();
    }
});
