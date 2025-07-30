// backend/src/routes/report.route.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directory exists
const uploadsDir = path.join(__dirname, '../../uploads/reports');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, `report-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// Updated file filter with better MIME type handling
const fileFilter = function (req, file, cb) {
  // Log the file info for debugging
  console.log('Uploaded file:', {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype
  });

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  const validExtensions = ['.xlsx', '.xls', '.csv'];
  
  // Check MIME type
  const validMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
    'application/csv',
    'text/plain' // Sometimes CSV files are sent as text/plain
  ];
  
  if (validExtensions.includes(ext) && validMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  }
  
  // Provide detailed error for debugging
  console.error('File validation failed:', {
    extension: ext,
    mimetype: file.mimetype,
    validExtensions,
    validMimeTypes
  });
  
  cb(new Error(`File type not allowed. Allowed extensions: ${validExtensions.join(', ')}`));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Wrap the multer middleware to handle errors properly
const uploadMiddleware = (req, res, next) => {
  upload.single('reportFile')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading
      console.error('Multer error:', err);
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      // An unknown error occurred when uploading
      console.error('Upload error:', err);
      return res.status(400).json({ message: err.message });
    }
    
    // Everything went fine
    next();
  });
};

// Other route imports and setup
import { 
  getMetrics, 
  getTeamPerformance, 
  getClientActivity, 
  getFinanceRevenue, 
  getFinanceCategories,
  exportReport,
  // Add these new controllers:
  uploadReportData,
  getUploadedReports,
  getReportData
} from '../controllers/report.controller.js';
import { protectRoute, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protectRoute);

// Most report routes should be admin-only
router.use(authorize(['admin']));

// Existing endpoints
router.get('/metrics', getMetrics);
router.get('/team-performance', getTeamPerformance);
router.get('/client-activity', getClientActivity);
router.get('/finance/revenue', getFinanceRevenue);
router.get('/finance/categories', getFinanceCategories);
router.get('/export', exportReport);

// Updated upload route with better error handling
router.post('/upload', uploadMiddleware, uploadReportData);
router.get('/uploaded-reports', getUploadedReports);
router.get('/uploaded-reports/:reportId', getReportData);

export default router;