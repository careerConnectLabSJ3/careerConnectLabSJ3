import { User } from './models/user.js';
import { checkAccess } from './applicationController.js';

export async function addFavoriteJob(req, res) {
  if (!checkAccess(req, res, 'job_seeker')) return;
  try{
    const jobId = req.params.jobId;
    const user = await User.findById(req.session.user.id);
    if(!user.favoriteJobs.includes(jobId)){
      user.favoriteJobs.push(jobId);
      await user.save();
    }
  } catch(error){
    console.error('Failed to add favorite job:', error);
  }
}

export async function removeFavoriteJob(req, res) {
  if (!checkAccess(req, res, 'job_seeker')) return;
  try{
    const jobId = req.params.jobId;
    const user = await User.findById(req.session.user.id);
    user.favoriteJobs = user.favoriteJobs.filter(favJobId => favJobId.toString() !== jobId);
    await user.save();
  } catch(error){
    console.error('Failed to remove favorite job:', error);
  }
}

export async function getFavoriteJob(req, res) {
  if (!checkAccess(req, res, 'job_seeker')) return;
  try{
    const jobId = req.params.jobId;
    const user = await User.findById(req.session.user.id);
    const isFavorite = user.favoriteJobs.includes(jobId);
    return res.json({ isFavorite });
  } catch(error){
    console.error('Failed to get favorite job status:', error);
    return res.status(500).json({ error: 'Unable to retrieve favorite job status. Please try again.' });
  }
}


export async function getMyFavoriteJobs(req, res) {
  if (!checkAccess(req, res, 'job_seeker')) return;
  try{
    const user = await User.findById(req.session.user.id).populate('favoriteJobs');
    return res.json(user.favoriteJobs);
  } catch(error){
    console.error('Failed to get favorite jobs:', error);
    return res.status(500).json({ error: 'Unable to retrieve favorite jobs. Please try again.' });
  }
}