
import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  company: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  requirements: { type: String, required: true, trim: true },
  deadline: { type: String, required: true },
  recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  applicationsCount: { type: Number, default: 0 },
  status: { type: String, default: 'Active' }
});

const Job = mongoose.model('Job', jobSchema);
export default Job;
