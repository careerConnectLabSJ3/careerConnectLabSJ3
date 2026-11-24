import { expect, jest, test } from '@jest/globals';
import { Writable } from 'node:stream';
import { Types } from 'mongoose';
import User from '../models/user.js';

const original = new Types.ObjectId();
const revision = new Types.ObjectId();
const nextRevision = new Types.ObjectId();
const userId = new Types.ObjectId();
const uploaded = new Map();
const deleted = jest.fn(async id => uploaded.delete(String(id)));
let uploadId = revision;

jest.unstable_mockModule('../serverUtils/fileStorage.js', () => ({
    gfsBucket: null, sendResume: jest.fn(), MAX_RESUME_SIZE: 5 * 1024 * 1024,
    resumeBucket: {
        delete: deleted,
        openUploadStream() {
            const id = uploadId;
            const chunks = [];
            const stream = new Writable({
                write(chunk, encoding, callback) {
                    chunks.push(chunk);
                    callback();
                },
                final(callback) {
                    uploaded.set(String(id), Buffer.concat(chunks));
                    callback();
                }
            });
            stream.id = id;
            return stream;
        }
    }
}));

const { saveResumeRevision, restoreOriginalResume } = await import('../controllers/profileController.js');
const session = { user: { role: 'job_seeker', email: 'demo@example.test' } };
const sample = Buffer.from('%PDF-1.7\nUpdated bullet\n%%EOF');
const file = { buffer: sample, size: sample.length, mimetype: 'application/pdf', originalname: 'Resume.pdf' };

function response() {
    const res = { status: jest.fn(), json: jest.fn() };
    res.status.mockReturnValue(res);
    return res;
}

test('saves the revised bytes, preserves the first original across edits, and restores it', async () => {
    const originalDate = new Date('2026-11-23');
    let user = {
        _id: userId, resumeFileId: original, resumeUploadedAt: originalDate,
        resumeFileName: 'Resume.pdf', resumeFileSize: 250, originalResume: null
    };
    uploaded.set(String(original), Buffer.from('Original PDF bytes'));
    jest.spyOn(User, 'findOne').mockImplementation(async () => user);
    const update = jest.spyOn(User, 'findOneAndUpdate').mockImplementation(async (filter, changes) => {
        if (String(user.resumeFileId) !== String(filter.resumeFileId)) return null;
        user = { ...user, ...changes.$set };
        return user;
    });

    const unauthorized = response();
    await saveResumeRevision({ session: { user: { role: 'recruiter' } }, file }, unauthorized);
    expect(unauthorized.status).toHaveBeenCalledWith(403);
    const stale = response();
    await saveResumeRevision({ session, body: { version: 'old' }, file }, stale);
    expect(stale.status).toHaveBeenCalledWith(409);
    expect(update).not.toHaveBeenCalled();

    const firstSave = response();
    await saveResumeRevision({ session, body: { version: String(original) }, file }, firstSave);
    expect(firstSave.json).toHaveBeenCalledWith(expect.objectContaining({
        resume: expect.objectContaining({ version: String(revision), hasOriginal: true })
    }));
    expect(uploaded.get(String(revision))).toEqual(sample);
    expect(deleted).not.toHaveBeenCalled();

    uploadId = nextRevision;
    await saveResumeRevision({ session, body: { version: String(revision) }, file }, response());
    expect(deleted).toHaveBeenCalledWith(revision);
    expect(user.originalResume.fileId).toEqual(original);

    const restored = response();
    await restoreOriginalResume({ session, body: { version: String(nextRevision) } }, restored);
    expect(restored.json).toHaveBeenCalledWith(expect.objectContaining({
        resume: expect.objectContaining({ version: String(original), hasOriginal: false, uploadedAt: originalDate })
    }));
    expect(uploaded.get(String(original))).toEqual(Buffer.from('Original PDF bytes'));
    expect(uploaded.has(String(nextRevision))).toBe(false);
});
