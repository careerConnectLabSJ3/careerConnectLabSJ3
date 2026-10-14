import {Schema, model} from 'mongoose';

// 4. DATABASE SCHEMA & MODEL
const userSchema = new Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['job_seeker', 'recruiter'], },
    education : { type: String, default: "None"},
    experience: { type: String, default: "None"},
    skills: { type: String, default: "None"},
    profileImageId: { type: Schema.Types.ObjectId, default: null },
    resumeFileId: { type: Schema.Types.ObjectId, default: null },
    resumeFileName: { type: String, default: null },
    resumeFileSize: { type: Number, default: null },
    resumeMimeType: { type: String, default: null },
    resumeUploadedAt: { type: Date, default: null }

});

const User = model('User', userSchema);
export default User;
