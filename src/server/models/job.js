
import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  department: { type: String, required: true },
  applicationsCount: { type: Number, default: 0 },
  status: { type: String, default: 'Active' }
});

const Job = mongoose.model('Job', jobSchema);
export default Job;
