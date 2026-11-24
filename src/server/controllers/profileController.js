import User from '../models/user.js';
import {Types} from 'mongoose';
import {Readable} from 'stream';
import path from 'path';
import { fileURLToPath } from 'url';

import { gfsBucket, resumeBucket, sendResume, MAX_RESUME_SIZE } from '../serverUtils/fileStorage.js';
import { convertToSafeFilename, isPdf, checkCorrectUser } from '../serverUtils/utils.js';



function uploadToGridFS(file) {
    return new Promise((resolve, reject) => {
        if (!resumeBucket) {
            reject(new Error('Resume storage is not initialized.'));
            return;
        }

        const uploadStream = resumeBucket.openUploadStream(convertToSafeFilename(file.originalname), {
            contentType: file.mimetype,
            metadata: {
                type: 'resume'
            }
        });

        uploadStream.on('finish', () => resolve(uploadStream.id));
        uploadStream.on('error', reject);
        Readable.from(file.buffer).pipe(uploadStream);
    });
}

async function deleteFromGridFS(fileId) {
    if (!fileId || !resumeBucket) return;

    try {
        await resumeBucket.delete(new Types.ObjectId(fileId));
    } catch (error) {
        // The metadata can outlive a file if storage was manually cleaned up.
        console.warn('Resume file was not found while deleting it.');
    }
}

function resumeMetadata(user) {
    if (!user.resumeFileId) return null;
    return {
        fileName: user.resumeFileName,
        fileSize: user.resumeFileSize,
        uploadedAt: user.resumeUploadedAt,
        version: String(user.resumeFileId),
        hasOriginal: Boolean(user.originalResume?.fileId)
    };
}

function resumeFileError(file) {
    if (!file) return 'Please select a PDF resume to upload.';
    if (file.size > MAX_RESUME_SIZE) return 'Resume must be 5MB or smaller.';
    if (!isPdf(file)) return 'Only valid PDF files can be uploaded as resumes.';
    return '';
}

export async function fetchUserProfile(req, res){
    const currUser = req.session.user;
    if (!currUser) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findOne({ email: currUser.email });
    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({
        name: user.name,
        role: user.role,
        education: user.education,
        experience: user.experience,
        skills: user.skills,
        resume: resumeMetadata(user)
    });
}


export async function getProfilePic(req, res){
    try {
        if (!req.session.user) {
            return res.status(401).send('Unauthorized');
        }

        const user = await User.findOne({ email: req.session.user.email });
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        
        // If user has no custom profile picture, serve the default static image
        if (!user || !user.profileImageId) {
            return res.sendFile(path.join(__dirname, '../../client/public/img/default-pfp.png'));
        }

        // Creates an id for the picture in Mongo
        const fileId = new Types.ObjectId(user.profileImageId);
        const files = await gfsBucket.find({ _id: fileId }).toArray();

        // If no new img is found from form POST, display default pfp
        if (!files || files.length === 0) {
            return res.sendFile(path.join(__dirname,  '../client/public/img/default-pfp.png'));
        }

        // image is downloaded
        const contentType = files[0].contentType || 'image/jpeg';
        res.setHeader('ContentType', contentType);
        const downloadStream = gfsBucket.openDownloadStream(fileId);
        downloadStream.pipe(res);

    } catch (err) {
        console.error('Avatar route catch error:', err);
        res.status(500).send({error: 'Error retrieving image'});
    }
};


export async function updateProfile(req, res){
    try{
        const currUserInfo = req.session.user;
        if(!currUserInfo){
            return res.status(401).redirect('/login');
        }

        const { name, education, experience, skills } = req.body;

        // pattern allows [a-z] [A-Z] [0-9] space apostrophe hyphen and curly apostrophe
        const symbolPattern = /[^a-zA-Z0-9\s'\-\u2019]/;
        const fieldsToValidate = [name, education, experience, skills];

        for (const value of fieldsToValidate) {
            const normalized = String(value || '').trim();
            if (symbolPattern.test(normalized)) {
                return res.status(400).json({ 
                    error: 'Validation failed: Only letters, numbers, spaces, apostrophes, and dashes are allowed.' 
                });
            }
        }

        const user = await User.findOne({ email: currUserInfo.email });
        if(!user) return res.status(404).json({error: 'User not found'});
        let newPfpId = user.profileImageId;

        if (req.file) {

            const file = req.file;
            const maxSizeInBytes = 2 * 1024 * 1024;

            if (file.size > maxSizeInBytes) {
                return res.status(413).json({error: 'File size exceeds 2MB limit. Please choose a smaller image.'});
            }
        
            
            if (newPfpId) {
                try {
                    // deleted old pfp
                    await gfsBucket.delete(new Types.ObjectId(user.profileImageId));
                } catch (err) {
                    console.log('Old image not found or already deleted');
                }
            }
            // Stream buffer to GridFS
            const uploadPromise = new Promise((resolve, reject) => {
                const readableStream = new Readable();
                readableStream.push(req.file.buffer);
                readableStream.push(null);

                const uploadStream = gfsBucket.openUploadStream(req.file.originalname, {
                    contentType: req.file.mimetype
                });
                const generatedId = uploadStream.id;
                readableStream.pipe(uploadStream);

                uploadStream.on('finish', () => resolve(generatedId));
                uploadStream.on('error', (err) => reject(err));
            });

            newPfpId = await uploadPromise;
        }
        
        // updates with new data if new data found, otherwise same data 
        user.name = name || user.name;
        user.education = education || user.education;
        user.experience = experience || user.experience;
        user.skills = skills || user.skills;
        user.profileImageId = newPfpId;

        await user.save();

        // Update session data so it reflects immediately
        req.session.user = {
            ...currUserInfo,
            name: user.name,
            education: user.education,
            experience: user.experience,
            skills: user.skills
        };

        return res.status(200).json({
            message: 'Profile update success'
        });

    } catch(error){
        console.log(error);
        return res.status(500).json({error : error.message});
    }
}

export async function getResume(req, res) {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!checkCorrectUser(req, res, 'job_seeker')) {
            return res.status(403).json({ error: 'Only job seekers can manage resumes.' });
        }

        const user = await User.findOne({ email: req.session.user.email });
        return await sendResume(res, user);
    } catch (error) {
        console.error('Resume retrieval failed:', error);
        return res.status(500).json({ error: 'Unable to retrieve resume.' });
    }
}

async function saveResume(req, res, isRevision) {
    let newResumeId;

    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!checkCorrectUser(req, res, 'job_seeker')) {
            return res.status(403).json({ error: 'Only job seekers can manage resumes.' });
        }

        const error = resumeFileError(req.file);
        if (error) return res.status(req.file?.size > MAX_RESUME_SIZE ? 413 : 400).json({ error });

        const user = await User.findOne({ email: req.session.user.email });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const previousResumeId = user.resumeFileId;
        if (isRevision && (!previousResumeId || req.body?.version !== String(previousResumeId))) {
            return res.status(409).json({ error: 'Your resume changed. Reload before saving edits.' });
        }
        const previousOriginal = user.originalResume;
        const originalResume = isRevision ? previousOriginal || {
            fileId: previousResumeId, fileName: user.resumeFileName,
            fileSize: user.resumeFileSize, uploadedAt: user.resumeUploadedAt
        } : null;

        newResumeId = await uploadToGridFS(req.file);
        const updated = await User.findOneAndUpdate({ _id: user._id, resumeFileId: previousResumeId || null }, {
            $set: {
                resumeFileId: newResumeId,
                resumeFileName: convertToSafeFilename(req.file.originalname),
                resumeFileSize: req.file.size,
                resumeMimeType: 'application/pdf',
                resumeUploadedAt: new Date(),
                originalResume
            }
        }, { new: true });
        if (!updated) {
            await deleteFromGridFS(newResumeId);
            return res.status(409).json({ error: 'Your resume changed. Reload and try again.' });
        }
        newResumeId = null;
        if (!isRevision || String(previousResumeId) !== String(originalResume.fileId)) {
            await deleteFromGridFS(previousResumeId);
        }
        if (!isRevision) await deleteFromGridFS(previousOriginal?.fileId);

        return res.status(200).json({
            message: isRevision ? 'Updated resume saved.' : 'Resume uploaded successfully.',
            resume: resumeMetadata(updated)
        });
    } catch (error) {
        if (newResumeId) {
            await deleteFromGridFS(newResumeId);
        }
        console.error('Resume upload failed:', error);
        return res.status(500).json({ error: 'Unable to save the resume.' });
    }
}

export function uploadResume(req, res) {
    return saveResume(req, res, false);
}

export function saveResumeRevision(req, res) {
    return saveResume(req, res, true);
}

export async function restoreOriginalResume(req, res) {
    if (!checkCorrectUser(req, res, 'job_seeker')) return;
    try {
        const user = await User.findOne({ email: req.session.user.email });
        if (!user?.originalResume?.fileId) {
            return res.status(404).json({ error: 'No original resume is available to restore.' });
        }
        if (req.body?.version !== String(user.resumeFileId)) {
            return res.status(409).json({ error: 'Your resume changed. Reload and try again.' });
        }
        const original = user.originalResume;
        const updated = await User.findOneAndUpdate({ _id: user._id, resumeFileId: user.resumeFileId }, {
            $set: {
                resumeFileId: original.fileId, resumeFileName: original.fileName,
                resumeFileSize: original.fileSize, resumeMimeType: 'application/pdf',
                resumeUploadedAt: original.uploadedAt, originalResume: null
            }
        }, { new: true });
        if (!updated) return res.status(409).json({ error: 'Your resume changed. Reload and try again.' });
        await deleteFromGridFS(user.resumeFileId);
        return res.json({ message: 'Original resume restored.', resume: resumeMetadata(updated) });
    } catch {
        return res.status(500).json({ error: 'Unable to restore the original resume.' });
    }
}

export async function deleteResume(req, res) {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!checkCorrectUser(req, res, 'job_seeker')) {
            return res.status(403).json({ error: 'Only job seekers can manage resumes.' });
        }

        const user = await User.findOne({ email: req.session.user.email });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const updated = await User.findOneAndUpdate({ _id: user._id, resumeFileId: user.resumeFileId || null }, {
            $set: {
                resumeFileId: null, resumeFileName: null, resumeFileSize: null,
                resumeMimeType: null, resumeUploadedAt: null, originalResume: null
            }
        });
        if (!updated) return res.status(409).json({ error: 'Your resume changed. Reload and try again.' });
        await deleteFromGridFS(user.resumeFileId);
        await deleteFromGridFS(user.originalResume?.fileId);

        return res.status(200).json({ message: 'Resume deleted successfully.' });
    } catch (error) {
        console.error('Resume deletion failed:', error);
        return res.status(500).json({ error: 'Unable to delete the resume.' });
    }
}
