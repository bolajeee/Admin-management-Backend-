import express from 'express';
import { 
  getMetrics, 
  getTeamPerformance, 
  getClientActivity, 
  getFinanceRevenue, 
  getFinanceCategories,
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

// Export reports
router.get('/export', exportReport);

export default router;