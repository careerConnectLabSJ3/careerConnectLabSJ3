import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['StatusUpdate', 'Deadline', 'Interview'], 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  job: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Job' 
  },
  isRead: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.model('Notification', notificationSchema);