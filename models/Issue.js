import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
    sender: {
        type: String,
        enum: ['USER', 'ADMIN'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    readStatus: {
        type: Boolean,
        default: false
    }
});

const issueSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    province: {
        type: String,
        required: true
    },
    district: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    mobileNo: {
        type: String,
        required: true
    },
    whatsappNo: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    images: [String],
    status: {
        type: String,
        enum: ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
        default: 'PENDING'
    },
    messages: [messageSchema],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Can be null for anonymous reports
    },
    technician: {
        name: String,
        phone: String,
        assignedAt: Date,
        removedAt: Date
    }
},
{
    timestamps: true
});

const issueModel = mongoose.models.Issue || mongoose.model('Issue', issueSchema);

export default issueModel; 