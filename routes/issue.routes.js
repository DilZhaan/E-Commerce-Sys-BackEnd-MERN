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
    removeTechnician,
    addImagesToIssue
} from '../controllers/issue.controller.js';
import authToken from '../middleware/AuthToken.middleware.js';
import adminAuth from '../middleware/AdminAuth.middleware.js';

const router = express.Router();

// Public route - allow anonymous issue reporting
router.post('/', upload, createIssue);

// Add route for uploading images to an existing issue
router.post('/:id/images', upload, addImagesToIssue);

// Protected routes
router.use(authToken);

router.get('/', getAllIssues);
router.get('/user', getUserIssues);
router.get('/:id', getIssueById);
router.put('/:id/status', updateIssueStatus);
router.post('/:id/messages', addMessage);
router.put('/:id/messages/read', markMessagesAsRead);
router.delete('/:id', deleteIssue);
router.put('/:id', upload, editIssue);

// Admin only routes
router.use(adminAuth);
router.get('/download/csv', downloadIssuesCSV);
router.get('/download/all/csv', downloadAllIssuesCSV);
router.post('/:id/technician', assignTechnician);
router.delete('/:id/technician', removeTechnician);

export default router; 