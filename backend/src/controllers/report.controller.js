import User from '../models/user.model.js';
import Task from '../models/task.model.js';
import Message from '../models/message.model.js';
import Memo from '../models/memo.model.js';
import ExcelJS from 'exceljs';

/**
 * Helper to generate dates within a range
 */
const generateDateRange = (startDate, endDate, count = 7) => {
    const range = [];
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // For specific number of points, calculate interval
    const interval = Math.floor((end - start) / (count - 1));

    for (let i = 0; i < count; i++) {
        const date = new Date(start.getTime() + interval * i);
        range.push(date.toISOString().split('T')[0]);
    }

    return range;
};

/**
 * Get overview metrics for the dashboard
 */
export const getMetrics = async (req, res) => {
    try {
        // In a real app, these would be calculated from your database
        const metrics = {
            productivity: 87.5,
            productivityTrend: 12.3,
            satisfaction: 92,
            satisfactionTrend: 4.7,
            revenue: 156800,
            revenueTrend: 8.2,
            costEfficiency: 78,
            costEfficiencyTrend: -2.5
        };

        res.status(200).json(metrics);
    } catch (error) {
        console.error('Error fetching metrics:', error);
        res.status(500).json({ message: 'Failed to fetch metrics data' });
    }
};

/**
 * Get team performance data
 */
export const getTeamPerformance = async (req, res) => {
    try {
        // Get real user names from database for the demo
        const users = await User.find({ role: 'employee' })
            .select('name')
            .limit(6);

        // Generate performance data based on real users
        const performance = users.map(user => ({
            name: user.name,
            value: Math.floor(Math.random() * 50) + 10 // Random tasks completed (10-60)
        }));

        res.status(200).json({ performance });
    } catch (error) {
        console.error('Error fetching team performance:', error);
        res.status(500).json({ message: 'Failed to fetch team performance data' });
    }
};

/**
 * Get client activity data
 */
export const getClientActivity = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const dates = generateDateRange(startDate, endDate);

        // Generate activity data for the date range
        const activity = dates.map(date => ({
            date,
            interactions: Math.floor(Math.random() * 30) + 5,
            responses: Math.floor(Math.random() * 25) + 3
        }));

        res.status(200).json({ activity });
    } catch (error) {
        console.error('Error fetching client activity:', error);
        res.status(500).json({ message: 'Failed to fetch client activity data' });
    }
};

/**
 * Get financial revenue data
 */
export const getFinanceRevenue = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const dates = generateDateRange(startDate, endDate);

        // Generate revenue data for the date range
        const data = dates.map(date => ({
            period: date,
            value: Math.floor(Math.random() * 50000) + 10000
        }));

        res.status(200).json({ data });
    } catch (error) {
        console.error('Error fetching finance revenue:', error);
        res.status(500).json({ message: 'Failed to fetch financial revenue data' });
    }
};

/**
 * Get financial categories data
 */
export const getFinanceCategories = async (req, res) => {
    try {
        // Mock expense categories
        const categories = [
            'Salaries',
            'Marketing',
            'Software',
            'Office Space',
            'Travel',
            'Equipment'
        ];

        // Generate data for each category
        const data = categories.map(category => ({
            category,
            value: Math.floor(Math.random() * 40000) + 5000
        }));

        res.status(200).json({ data });
    } catch (error) {
        console.error('Error fetching finance categories:', error);
        res.status(500).json({ message: 'Failed to fetch financial categories data' });
    }
};

/**
 * Export report as Excel file
 */
export const exportReport = async (req, res) => {
    try {
        const { type } = req.query;

        // Create a new Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(type.charAt(0).toUpperCase() + type.slice(1) + ' Report');

        // Add some data based on report type
        if (type === 'team') {
            // Get real user data
            const users = await User.find({ role: 'employee' }).select('name email');

            // Set up headers
            worksheet.columns = [
                { header: 'Employee Name', key: 'name', width: 30 },
                { header: 'Email', key: 'email', width: 30 },
                { header: 'Tasks Completed', key: 'tasks', width: 20 },
                { header: 'Performance Score', key: 'score', width: 20 }
            ];

            // Add rows with mock data
            for (const user of users) {
                worksheet.addRow({
                    name: user.name,
                    email: user.email,
                    tasks: Math.floor(Math.random() * 50) + 10,
                    score: Math.floor(Math.random() * 100)
                });
            }
        } else if (type === 'finance') {
            // Set up headers
            worksheet.columns = [
                { header: 'Month', key: 'month', width: 15 },
                { header: 'Revenue', key: 'revenue', width: 15 },
                { header: 'Expenses', key: 'expenses', width: 15 },
                { header: 'Profit', key: 'profit', width: 15 }
            ];

            // Add rows with mock data
            const months = ['January', 'February', 'March', 'April', 'May', 'June'];
            for (const month of months) {
                const revenue = Math.floor(Math.random() * 50000) + 20000;
                const expenses = Math.floor(Math.random() * 30000) + 10000;
                worksheet.addRow({
                    month,
                    revenue,
                    expenses,
                    profit: revenue - expenses
                });
            }
        } else if (type === 'clients') {
            // Set up headers
            worksheet.columns = [
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Interactions', key: 'interactions', width: 15 },
                { header: 'Responses', key: 'responses', width: 15 },
                { header: 'Response Rate', key: 'rate', width: 15 }
            ];

            // Add rows with mock data
            const dates = generateDateRange(null, null, 10);
            for (const date of dates) {
                const interactions = Math.floor(Math.random() * 30) + 5;
                const responses = Math.floor(Math.random() * interactions);
                const rate = ((responses / interactions) * 100).toFixed(1);

                worksheet.addRow({
                    date,
                    interactions,
                    responses,
                    rate: `${rate}%`
                });
            }
        } else {
            // Generic report
            worksheet.columns = [
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Metric', key: 'metric', width: 20 },
                { header: 'Value', key: 'value', width: 15 }
            ];

            // Add rows with mock data
            const dates = generateDateRange(null, null, 10);
            for (const date of dates) {
                worksheet.addRow({
                    date,
                    metric: 'User Activity',
                    value: Math.floor(Math.random() * 100)
                });
            }
        }

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${type}-report.xlsx`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error exporting report:', error);
        res.status(500).json({ message: 'Failed to export report' });
    }
};