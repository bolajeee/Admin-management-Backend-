// backend/src/routes/report.route.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  exportReport,
  uploadReportData,
  getUploadedReports,
  getReportData,
  deleteUploadedReport
} from '../controllers/report.controller.js';
import { protectRoute, authorize } from '../middleware/auth.middleware.js';
import { sanitizeInput } from '../middleware/sanitization.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { validateObjectId, validatePagination } from '../middleware/validation.middleware.js';

// Set up directory for uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const uploadsDir = isServerless ? '/tmp/reports' : path.join(__dirname, '../../uploads/reports');

// Ensure upload directory exists (skip in serverless environments)
if (!isServerless && !fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (error) {
    console.warn('Could not create uploads directory:', error.message);
  }
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, `report-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// File filter for multer
const fileFilter = (req, file, cb) => {
  // Log file info for debugging
  console.log('File upload attempt:', file);

  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.xlsx', '.xls', '.csv'];

  if (!allowedExts.includes(ext)) {
    return cb(new Error('Only Excel and CSV files are allowed'));
  }

  // Check MIME type
  const validMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv',
    'application/csv',
    'text/plain', // Sometimes CSV files are sent as text/plain
    'application/octet-stream' // Sometimes Excel files are sent this way
  ];

  if (!validMimeTypes.includes(file.mimetype)) {
    console.log('Invalid mimetype:', file.mimetype);
    return cb(new Error(`Invalid file type. Allowed types: Excel, CSV`));
  }

  cb(null, true);
};

// Create multer upload handler with error handling
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Create an error-handling wrapper for multer
const handleUpload = (req, res, next) => {
  upload.single('reportFile')(req, res, (err) => {
    if (err) {
      console.error('File upload error:', err);
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Report management and data export endpoints
 */

// All routes require authentication
router.use(protectRoute);

// Admin-only routes
router.use(authorize(['admin']));

/**
 * @swagger
 * /reports/upload:
 *   post:
 *     summary: Upload a report file (CSV or Excel) (Admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - reportFile
 *             properties:
 *               reportFile:
 *                 type: string
 *                 format: binary
 *                 description: Report file (CSV or Excel, max 10MB)
 *               title:
 *                 type: string
 *                 example: "Monthly Sales Report"
 *               description:
 *                 type: string
 *                 example: "Sales data for January 2024"
 *     responses:
 *       201:
 *         description: Report uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         filename:
 *                           type: string
 *                         originalName:
 *                           type: string
 *                         title:
 *                           type: string
 *                         description:
 *                           type: string
 *                         uploadedBy:
 *                           $ref: '#/components/schemas/User'
 *                         uploadedAt:
 *                           type: string
 *                           format: date-time
 *                         rowCount:
 *                           type: integer
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/upload', sanitizeInput, handleUpload, asyncHandler(uploadReportData));

/**
 * @swagger
 * /reports/uploaded-reports:
 *   get:
 *     summary: Get list of all uploaded reports (Admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by title or filename
 *     responses:
 *       200:
 *         description: Uploaded reports retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           filename:
 *                             type: string
 *                           originalName:
 *                             type: string
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *                           uploadedBy:
 *                             $ref: '#/components/schemas/User'
 *                           uploadedAt:
 *                             type: string
 *                             format: date-time
 *                           rowCount:
 *                             type: integer
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/uploaded-reports', validatePagination, asyncHandler(getUploadedReports));

/**
 * @swagger
 * /reports/uploaded-reports/{reportId}:
 *   get:
 *     summary: Get data from a specific uploaded report (Admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *     responses:
 *       200:
 *         description: Report data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         report:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                             title:
 *                               type: string
 *                             filename:
 *                               type: string
 *                             uploadedAt:
 *                               type: string
 *                               format: date-time
 *                         rows:
 *                           type: array
 *                           items:
 *                             type: object
 *                             description: Dynamic object based on report structure
 *                         columns:
 *                           type: array
 *                           items:
 *                             type: string
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     summary: Delete an uploaded report (Admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Report deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/uploaded-reports/:reportId', sanitizeInput, validateObjectId('reportId'), validatePagination, asyncHandler(getReportData));
router.delete('/uploaded-reports/:reportId', sanitizeInput, validateObjectId('reportId'), asyncHandler(deleteUploadedReport));

/**
 * @swagger
 * /reports/export:
 *   get:
 *     summary: Export report data as CSV or Excel (Admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, excel]
 *           default: csv
 *       - in: query
 *         name: filename
 *         schema:
 *           type: string
 *         example: "monthly_report"
 *     responses:
 *       200:
 *         description: Report exported successfully
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Content-Disposition:
 *             description: Attachment filename
 *             schema:
 *               type: string
 *               example: 'attachment; filename="report.csv"'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/export', sanitizeInput, asyncHandler(exportReport));



export default router;