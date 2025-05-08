import express from 'express';
import { getAdminStats, getUserStats } from '../controllers/dashboardController.js';
import authToken from '../middleware/AuthToken.middleware.js';
import { isAdmin } from '../middleware/auth.js';

const dashboardRouter = express.Router();

// Get user dashboard stats - requires auth
dashboardRouter.get('/user-stats', authToken, getUserStats);

// Get admin dashboard stats - requires admin role
dashboardRouter.get('/admin-stats', authToken, isAdmin, getAdminStats);

export default dashboardRouter; 