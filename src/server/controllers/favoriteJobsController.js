import User  from '../models/user.js';
import { checkCorrectUser } from '../serverUtils/utils.js';

export async function addFavoriteJob(req, res) {
  if (!checkCorrectUser(req, res, 'job_seeker')) return;
  try{
    const jobId = req.params.jobId;
    const user = await User.findById(req.session.user.id);
    if(!user) return res.status(404).json({ message: 'User not found' });

    const isAlreadyFav = user.favoriteJobs.some((id) => id.toString() === jobId);

    if(!isAlreadyFav){
      user.favoriteJobs.push(jobId);
      await user.save();
      return res.status(200).json({ message: 'Saved job successfully' });
    }
    return res.status(200).json({ message: 'Job is already in favorites' });

  } catch(error){
    console.error('Failed to add favorite job:', error);
    return res.status(500).json({ message: 'Unable to add job to favorites. Please try again later' });
  }
}

export async function removeFavoriteJob(req, res) {
  if (!checkCorrectUser(req, res, 'job_seeker')) return;
  try{
    const jobId = req.params.jobId;
    const user = await User.findById(req.session.user.id);
    user.favoriteJobs = user.favoriteJobs.filter(favJobId => favJobId.toString() !== jobId);
    await user.save();
    return res.status(200).json({ message: 'Removed saved job successfully' });
  } catch(error){
    console.error('Failed to remove favorite job:', error);
    return res.status(500).json({ message: 'Unable to remove job from favorites. Please try again later' });
  }
}

export async function getFavoriteJob(req, res) {
  if (!checkCorrectUser(req, res, 'job_seeker')) return;
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
  if (!checkCorrectUser(req, res, 'job_seeker')) return;
  try{
    const userFavorites = await User.findById(req.session.user.id).populate('favoriteJobs');
    return res.json(userFavorites.favoriteJobs);
  } catch(error){
    console.error('Failed to get favorite jobs:', error);
    return res.status(500).json({ error: 'Unable to retrieve favorite jobs. Please try again.' });
  }
}