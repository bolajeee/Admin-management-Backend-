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
  getReportData
} from '../controllers/report.controller.js';
import { protectRoute, authorize } from '../middleware/auth.middleware.js';
import { sanitizeInput } from '../middleware/sanitization.middleware.js';

// Set up directory for uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads/reports');

// Ensure upload directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
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

// All routes require authentication
router.use(protectRoute);

// Admin-only routes
router.use(authorize(['admin']));

// File upload and management routes
router.post('/upload', sanitizeInput, handleUpload, uploadReportData);
router.get('/uploaded-reports', getUploadedReports);
router.get('/uploaded-reports/:reportId', sanitizeInput, getReportData);
router.get('/export', sanitizeInput, exportReport);



export default router;