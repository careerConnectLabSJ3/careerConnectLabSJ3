const { Schema, model } = require('mongoose');

// 4. DATABASE SCHEMA & MODEL
const userSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['job_seeker', 'recruiter'], },
    education : { type: String, default: "None"},
    experience: { type: String, default: "None"},
    skills: { type: String, default: "None"},
    profileImageId: { type: Schema.Types.ObjectId, default: null }

});

const User = model('User', userSchema);
module.exports = {User};