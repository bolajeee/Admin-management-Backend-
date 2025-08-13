import { DashboardService } from '../services/dashboard.service.js';
import { successResponse, errorResponse } from '../utils/responseHandler.js';

export const getDashboardStats = async (req, res) => {
    try {
        const stats = await DashboardService.getDashboardStats();
        return successResponse(res, stats, 'Dashboard statistics retrieved successfully');
    } catch (error) {
        return errorResponse(res, error, 'Failed to fetch dashboard statistics');
    }
};

export const getRecentActivity = async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        const activities = await DashboardService.getRecentActivity(Number(limit));
        return successResponse(res, activities, 'Recent activities retrieved successfully');
    } catch (error) {
        return errorResponse(res, error, 'Failed to fetch recent activities');
    }
};