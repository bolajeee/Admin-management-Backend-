import express from 'express';
import { 
  getMetrics, 
  getTeamPerformance, 
  getClientActivity, 
  getFinanceRevenue, 
  getFinanceCategories,
  saveReport,
  getSavedReports,
  deleteReport,
  exportReport
} from '../controllers/report.controller.js';
import { protectRoute, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protectRoute);

// Most report routes should be admin-only
router.use(authorize(['admin']));

// Get basic metrics for dashboard
router.get('/metrics', getMetrics);

// Team performance data
router.get('/team-performance', getTeamPerformance);

// Client activity data
router.get('/client-activity', getClientActivity);

// Financial reports
router.get('/finance/revenue', getFinanceRevenue);
router.get('/finance/categories', getFinanceCategories);

// Saved reports management
router.post('/save', saveReport);
router.get('/saved', getSavedReports);
router.delete('/saved/:reportId', deleteReport);

// Export reports
router.get('/export', exportReport);

// Activity-based reports
router.get('/activity/engagement', getActivityEngagementReport);
router.get('/activity/breakdown', getActionBreakdownReport);
router.get('/activity/user/:userId', getUserActivityReport);

export default router;