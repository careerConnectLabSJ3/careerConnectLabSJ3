import mongoose from 'mongoose';
import { convertToSafeFilename } from './utils.js';

export let gfsBucket;
export let resumeBucket;
export const MAX_RESUME_SIZE = 5 * 1024 * 1024;

export function initializeFileStorage(db) {
  gfsBucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'profileImages' });
  resumeBucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'resumes' });
}

export async function readResumePdf(fileId) {
  const chunks = [];
  let size = 0;
  const download = resumeBucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
  for await (const chunk of download) {
    size += chunk.length;
    if (size > MAX_RESUME_SIZE) {
      download.destroy();
      throw new Error('Resume exceeds the size limit.');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function sendResume(res, user) {
  if (!user?.resumeFileId) {
    return res.status(404).json({ error: 'No resume has been uploaded.' });
  }

  const fileId = new mongoose.Types.ObjectId(user.resumeFileId);
  const files = await resumeBucket.find({ _id: fileId }).toArray();
  if (!files.length) {
    return res.status(404).json({ error: 'Resume file could not be found.' });
  }

  const filename = convertToSafeFilename(user.resumeFileName).replace(/[^\x20-\x7e]/g, '_');
  const download = resumeBucket.openDownloadStream(fileId);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  download.on('error', error => {
    console.error('Resume download failed:', error);
    if (res.headersSent) {
      res.destroy(error);
      return;
    }
    res.removeHeader('Content-Disposition');
    res.removeHeader('Content-Type');
    res.status(500).json({ error: 'Unable to retrieve resume.' });
  });
  res.once('close', () => download.destroy());
  return download.pipe(res);
}
