import Issue from '../models/Issue.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { sendSMS } from '../utils/smsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure storage for issue images
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/issues');
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'issue-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Create multer upload instance
export const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error("Only image files are allowed!"));
        }
    }
}).array('images', 5); // Allow up to 5 images

// Create a new issue
export const createIssue = async (req, res) => {
    try {
        // Process uploaded files
        const fileUrls = req.files?.map(file => `/uploads/issues/${file.filename}`) || [];
        
        // Create new issue with file URLs
        const issueData = {
            ...req.body,
            images: fileUrls,
        };
        
        // If user is logged in, associate the issue with their account
        if (req.user && req.user.id) {
            issueData.user = req.user.id;
        }
        
        const newIssue = await Issue.create(issueData);
        
        res.status(201).json({
            success: true,
            message: 'Issue reported successfully',
            issue: newIssue
        });
    } catch (error) {
        console.error('Error reporting issue:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to report issue',
            error: error.message
        });
    }
};

// Get all issues (admin only)
export const getAllIssues = async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        // Filtering options
        const filter = {};
        if (req.query.status) {
            filter.status = req.query.status;
        }
        
        // Count total documents for pagination
        const total = await Issue.countDocuments(filter);
        
        // Fetch issues with pagination
        const issues = await Issue.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('user', 'fName lName email');
        
        res.status(200).json({
            success: true,
            issues,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching issues:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch issues',
            error: error.message
        });
    }
};

// Get issues by user
export const getUserIssues = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        // Count total documents
        const total = await Issue.countDocuments({ user: userId });
        
        // Fetch user's issues
        const issues = await Issue.find({ user: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        
    console.log('Issues', issues);
        
        res.status(200).json({
            success: true,
            issues,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching user issues:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch issues',
            error: error.message
        });
    }
};

// Get issue by ID
export const getIssueById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const issue = await Issue.findById(id)
            .populate('user', 'fName lName email');
        
        if (!issue) {
            return res.status(404).json({
                success: false,
                message: 'Issue not found'
            });
        }
        
        // Check if the requesting user is allowed to view this issue
        // (either admin or the user who created it)
        if (req.user.role !== 'ADMIN' && 
            issue.user && issue.user._id.toString() !== req.user.id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to view this issue'
            });
        }
        
        res.status(200).json({
            success: true,
            issue
        });
    } catch (error) {
        console.error('Error fetching issue:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch issue',
            error: error.message
        });
    }
};

// Update issue status (admin only)
export const updateIssueStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        // Validate status
        const validStatuses = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }
        
        const updatedIssue = await Issue.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );
        
        if (!updatedIssue) {
            return res.status(404).json({
                success: false,
                message: 'Issue not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Issue status updated successfully',
            issue: updatedIssue
        });
    } catch (error) {
        console.error('Error updating issue status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update issue status',
            error: error.message
        });
    }
};

// Add message to an issue
export const addMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        
        if (!content || content.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Message content is required'
            });
        }
        
        const issue = await Issue.findById(id);
        
        if (!issue) {
            return res.status(404).json({
                success: false,
                message: 'Issue not found'
            });
        }
        
        // Determine sender type based on user role
        const sender = req.user.role === 'ADMIN' ? 'ADMIN' : 'USER';
        
        // Check if user is authorized to add message
        if (sender === 'USER' && 
            issue.user && issue.user.toString() !== req.user.id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to add messages to this issue'
            });
        }
        
        // Add message to issue
        const newMessage = {
            sender,
            content,
            timestamp: new Date(),
            readStatus: false
        };
        
        issue.messages.push(newMessage);
        await issue.save();
        
        res.status(201).json({
            success: true,
            message: 'Message added successfully',
            newMessage
        });
    } catch (error) {
        console.error('Error adding message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add message',
            error: error.message
        });
    }
};

// Mark messages as read
export const markMessagesAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const { messageIds } = req.body;
        
        if (!Array.isArray(messageIds) || messageIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Message IDs array is required'
            });
        }
        
        const issue = await Issue.findById(id);
        
        if (!issue) {
            return res.status(404).json({
                success: false,
                message: 'Issue not found'
            });
        }
        
        // Check if user is authorized
        if (req.user.role !== 'ADMIN' && 
            issue.user && issue.user.toString() !== req.user.id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to update this issue'
            });
        }
        
        // Update read status for specified messages
        let updatedCount = 0;
        messageIds.forEach(msgId => {
            const message = issue.messages.id(msgId);
            if (message) {
                message.readStatus = true;
                updatedCount++;
            }
        });
        
        if (updatedCount > 0) {
            await issue.save();
        }
        
        res.status(200).json({
            success: true,
            message: `${updatedCount} messages marked as read`,
            issue
        });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark messages as read',
            error: error.message
        });
    }
};

// Delete an issue
export const deleteIssue = async (req, res) => {
    try {
        const { id } = req.params;
        
        const issue = await Issue.findById(id);
        
        if (!issue) {
            return res.status(404).json({
                success: false,
                message: 'Issue not found'
            });
        }
        
        // Check if the requesting user is authorized to delete this issue
        // (either admin or the user who created it)
        if (req.user.role !== 'ADMIN' && 
            (!issue.user || issue.user.toString() !== req.user.id.toString())) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to delete this issue'
            });
        }
        
        // Delete any images associated with the issue
        if (issue.images && issue.images.length > 0) {
            issue.images.forEach(imageUrl => {
                try {
                    const imagePath = path.join(__dirname, '..', imageUrl);
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                    }
                } catch (err) {
                    console.error(`Failed to delete image: ${imageUrl}`, err);
                }
            });
        }
        
        // Delete the issue
        await Issue.findByIdAndDelete(id);
        
        res.status(200).json({
            success: true,
            message: 'Issue deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting issue:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete issue',
            error: error.message
        });
    }
};

// Edit an issue
export const editIssue = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, province, district, address, mobileNo, whatsappNo, description, imagesToDelete } = req.body;
        
        const issue = await Issue.findById(id);
        
        if (!issue) {
            return res.status(404).json({
                success: false,
                message: 'Issue not found'
            });
        }
        
        // Check if the requesting user is authorized to edit this issue
        // (either admin or the user who created it)
        if (req.user.role !== 'ADMIN' && 
            (!issue.user || issue.user.toString() !== req.user.id.toString())) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to edit this issue'
            });
        }
        
        // Update issue fields
        if (name) issue.name = name;
        if (province) issue.province = province;
        if (district) issue.district = district;
        if (address) issue.address = address;
        if (mobileNo) issue.mobileNo = mobileNo;
        if (whatsappNo) issue.whatsappNo = whatsappNo;
        if (description) issue.description = description;
        
        // Process uploaded files if any
        const fileUrls = req.files?.map(file => `/uploads/issues/${file.filename}`) || [];
        if (fileUrls.length > 0) {
            issue.images = [...issue.images, ...fileUrls];
        }
        
        // Remove specified images if needed
        if (imagesToDelete && Array.isArray(imagesToDelete) && imagesToDelete.length > 0) {
            // Filter out images that should be deleted
            const remainingImages = issue.images.filter(img => !imagesToDelete.includes(img));
            
            // Delete image files from the filesystem
            imagesToDelete.forEach(imageUrl => {
                try {
                    const imagePath = path.join(__dirname, '..', imageUrl);
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                    }
                } catch (err) {
                    console.error(`Failed to delete image: ${imageUrl}`, err);
                }
            });
            
            // Update issue with remaining images
            issue.images = remainingImages;
        }
        
        // Save updated issue
        await issue.save();
        
        res.status(200).json({
            success: true,
            message: 'Issue updated successfully',
            issue
        });
    } catch (error) {
        console.error('Error updating issue:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update issue',
            error: error.message
        });
    }
};

// Download issues as CSV
export const downloadIssuesCSV = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get all user's issues without pagination
        const issues = await Issue.find({ user: userId })
            .sort({ createdAt: -1 });
        
        // Create CSV header
        let csvData = "Issue ID,Name,Province,District,Address,Mobile No,WhatsApp No,Description,Status,Created At\n";
        
        // Add each issue as a row
        issues.forEach(issue => {
            // Replace commas in text fields to avoid CSV formatting issues
            const sanitizeField = (field) => {
                // Convert to string if not already, replace commas and quotes, and wrap in quotes
                return `"${String(field || '').replace(/"/g, '""')}"`;
            };
            
            const row = [
                issue._id,
                sanitizeField(issue.name),
                sanitizeField(issue.province),
                sanitizeField(issue.district),
                sanitizeField(issue.address),
                sanitizeField(issue.mobileNo),
                sanitizeField(issue.whatsappNo),
                sanitizeField(issue.description),
                issue.status,
                new Date(issue.createdAt).toISOString().split('T')[0]
            ].join(',');
            
            csvData += row + "\n";
        });
        
        // Set response headers
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=issue-report.csv');
        
        // Send CSV data
        res.status(200).send(csvData);
    } catch (error) {
        console.error('Error generating CSV:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate CSV',
            error: error.message
        });
    }
};

// Download all issues as CSV (admin only)
export const downloadAllIssuesCSV = async (req, res) => {
    try {
        // Get all issues without pagination
        const issues = await Issue.find()
            .sort({ createdAt: -1 })
            .populate('user', 'fName lName email');
        
        // Create CSV header
        let csvData = "Issue ID,Name,User,Email,Mobile No,WhatsApp No,Province,District,Address,Description,Status,Created At\n";
        
        // Add each issue as a row
        issues.forEach(issue => {
            // Replace commas in text fields to avoid CSV formatting issues
            const sanitizeField = (field) => {
                // Convert to string if not already, replace commas and quotes, and wrap in quotes
                return `"${String(field || '').replace(/"/g, '""')}"`;
            };
            
            // Format user info
            const userName = issue.user ? `${issue.user.fName || ''} ${issue.user.lName || ''}`.trim() : 'Anonymous';
            const userEmail = issue.user ? issue.user.email : 'N/A';
            
            const row = [
                issue._id,
                sanitizeField(issue.name),
                sanitizeField(userName),
                sanitizeField(userEmail),
                sanitizeField(issue.mobileNo),
                sanitizeField(issue.whatsappNo),
                sanitizeField(issue.province),
                sanitizeField(issue.district),
                sanitizeField(issue.address),
                sanitizeField(issue.description),
                issue.status,
                new Date(issue.createdAt).toISOString().split('T')[0]
            ].join(',');
            
            csvData += row + "\n";
        });
        
        // Set response headers
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=all-issues-report.csv');
        
        // Send CSV data
        res.status(200).send(csvData);
    } catch (error) {
        console.error('Error generating admin CSV:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate CSV report',
            error: error.message
        });
    }
};

// Assign technician to an issue
export const assignTechnician = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, message } = req.body;

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Technician name and phone number are required'
            });
        }

        const issue = await Issue.findById(id);
        
        if (!issue) {
            return res.status(404).json({
                success: false,
                message: 'Issue not found'
            });
        }

        // If there's already a technician assigned, mark them as removed
        if (issue.technician && issue.technician.name) {
            issue.technician.removedAt = new Date();
        }

        // Assign new technician
        issue.technician = {
            name,
            phone,
            assignedAt: new Date()
        };

        await issue.save();

        // Send SMS notification
        try {
            const smsMessage = message || `You have been assigned to issue: ${issue.name}. Please contact the customer at ${issue.mobileNo}.`;
            const smsResult = await sendSMS(phone, name, '', smsMessage);
            
            if (!smsResult.success) {
                console.warn('SMS notification failed:', smsResult.message);
                // Don't fail the request if SMS fails
            }
        } catch (smsError) {
            console.error('Error sending SMS:', smsError);
            // Don't fail the request if SMS fails
        }

        res.status(200).json({
            success: true,
            message: 'Technician assigned successfully',
            issue
        });
    } catch (error) {
        console.error('Error assigning technician:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign technician',
            error: error.message
        });
    }
};

// Remove technician from an issue
export const removeTechnician = async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;

        const issue = await Issue.findById(id);
        
        if (!issue) {
            return res.status(404).json({
                success: false,
                message: 'Issue not found'
            });
        }

        if (!issue.technician || !issue.technician.name) {
            return res.status(400).json({
                success: false,
                message: 'No technician assigned to this issue'
            });
        }

        // Send SMS notification before removing
        try {
            const smsMessage = message || `You have been removed from issue: ${issue.name}.`;
            const smsResult = await sendSMS(issue.technician.phone, issue.technician.name, '', smsMessage);
            
            if (!smsResult.success) {
                console.warn('SMS notification failed:', smsResult.message);
                // Don't fail the request if SMS fails
            }
        } catch (smsError) {
            console.error('Error sending SMS:', smsError);
            // Don't fail the request if SMS fails
        }

        // Clear technician data
        issue.technician = null;
        await issue.save();

        res.status(200).json({
            success: true,
            message: 'Technician removed successfully',
            issue
        });
    } catch (error) {
        console.error('Error removing technician:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove technician',
            error: error.message
        });
    }
}; 