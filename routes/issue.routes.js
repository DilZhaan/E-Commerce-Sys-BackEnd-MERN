import express from 'express';
import { 
    createIssue, 
    getAllIssues, 
    getUserIssues, 
    getIssueById, 
    updateIssueStatus, 
    addMessage, 
    markMessagesAsRead,
    deleteIssue,
    editIssue,
    upload,
    downloadIssuesCSV,
    downloadAllIssuesCSV,
    assignTechnician,
    removeTechnician
} from '../controllers/issue.controller.js';
import authToken from '../middleware/AuthToken.middleware.js';
import adminAuth from '../middleware/AdminAuth.middleware.js';
import Issue from '../models/Issue.js';

const router = express.Router();

// Public route - allow anonymous issue reporting
router.post('/', upload, createIssue);

// Add route for uploading images to an existing issue
router.post('/:id/images', upload, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Process uploaded files
        const fileUrls = req.files?.map(file => `/uploads/issues/${file.filename}`) || [];
        
        if (fileUrls.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No images uploaded'
            });
        }
        
        // Find the issue and add the images
        const issue = await Issue.findById(id);
        
        if (!issue) {
            return res.status(404).json({
                success: false,
                message: 'Issue not found'
            });
        }
        
        // Add new images to existing ones
        issue.images = [...issue.images, ...fileUrls];
        await issue.save();
        
        res.status(200).json({
            success: true,
            message: 'Images uploaded successfully',
            images: fileUrls
        });
    } catch (error) {
        console.error('Error uploading images:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload images',
            error: error.message
        });
    }
});

// Protected routes - require authentication
router.get('/user', authToken, getUserIssues);
router.get('/download-csv', authToken, downloadIssuesCSV);

// Admin-only routes
router.get('/', authToken, adminAuth, getAllIssues);
router.get('/admin-download-csv', authToken, adminAuth, downloadAllIssuesCSV);
router.patch('/:id/status', authToken, adminAuth, updateIssueStatus);

// Routes with path parameters must be after specific routes
router.get('/:id', authToken, getIssueById);
router.post('/:id/messages', authToken, addMessage);
router.patch('/:id/messages/read', authToken, markMessagesAsRead);
router.delete('/:id', authToken, deleteIssue);
router.put('/:id', authToken, upload, editIssue);

// Technician assignment routes
router.post('/:id/technician', authToken, adminAuth, assignTechnician);
router.delete('/:id/technician', authToken, adminAuth, removeTechnician);

export default router; 