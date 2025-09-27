// backend/src/controllers/report.controller.js
import Report from "../models/report.model.js";
import fs from 'fs/promises';
import path from 'path';
import exceljs from 'exceljs';
import csv from 'csv-parser';
import { createReadStream } from 'fs';
import { NotFoundError } from '../utils/errors.js';
import { successResponse } from '../utils/responseHandler.js';

/**
 * Upload and process report data
 */
export const uploadReportData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const fileType = path.extname(fileName).toLowerCase();
    const reportName = req.body.reportName || fileName.replace(/\.[^/.]+$/, "");
    const reportType = req.body.reportType || 'custom'; 
    
    let data = [];
    
    try {
      // Process file based on type
      if (fileType === '.csv') {
        data = await parseCSV(filePath);
      } else if (fileType === '.xlsx' || fileType === '.xls') {
        data = await parseExcel(filePath);
      } else {
        return res.status(400).json({ message: 'Unsupported file type' });
      }
    } catch (fileError) {
      console.error('Error processing file:', fileError);
      return res.status(400).json({
        message: 'Error processing file',
        error: fileError.message
      });
    }

    // Create new report record in database
    const report = new Report({
      name: reportName,
      type: reportType,
      filePath: filePath,
      fileType: fileType.substring(1), // remove the dot
      uploadedBy: req.user._id,
      data: data,
      columns: data.length > 0 ? Object.keys(data[0]) : [],
    });

    await report.save();

    res.status(201).json({
      message: 'Report data uploaded successfully',
      report: {
        id: report._id,
        name: report.name,
        type: report.type,
        columns: report.columns,
        rowCount: data.length,
      }
    });
    
  } catch (error) {
    console.error('Error uploading report data:', error);
    res.status(500).json({
      message: 'Failed to upload report data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Parse CSV file
 */
async function parseCSV(filePath) {
  const results = [];
  return new Promise((resolve, reject) => {
    createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

/**
 * Parse Excel file
 */
async function parseExcel(filePath) {
  const data = [];
  const workbook = new exceljs.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    throw new Error('No worksheet found in Excel file');
  }
  
  const headers = [];
  
  // Get headers from first row
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers.push(cell.value?.toString() || `Column${colNumber}`);
  });
  
  // Get data from subsequent rows
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    const rowData = {};
    
    row.eachCell((cell, colNumber) => {
      if (colNumber <= headers.length) {
        rowData[headers[colNumber - 1]] = cell.value;
      }
    });
    
    if (Object.keys(rowData).length > 0) {
      data.push(rowData);
    }
  }
  
  return data;
}

/**
 * Get list of uploaded reports
 */
export const getUploadedReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .select('name type createdAt columns rowCount')
      .populate('uploadedBy', 'name email')
      .sort('-createdAt');
    
    res.status(200).json(reports);
  } catch (error) {
    console.error('Error fetching uploaded reports:', error);
    res.status(500).json({ message: 'Failed to fetch reports' });
  }
};

/**
 * Get data from a specific report
 */
export const getReportData = async (req, res) => {
  try {
    const report = await Report.findById(req.params.reportId);
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    // Apply filtering, pagination if needed
    const { limit = 100, page = 1, sortBy, sortOrder = 'asc', ...filters } = req.query;
    
    let filteredData = report.data;
    
    // Apply filters if any
    if (Object.keys(filters).length > 0) {
      filteredData = filteredData.filter(item => {
        return Object.entries(filters).every(([key, value]) => {
          if (!item[key]) return false;
          return item[key].toString().toLowerCase().includes(value.toLowerCase());
        });
      });
    }
    
    // Apply sorting if specified
    if (sortBy && report.columns.includes(sortBy)) {
      filteredData.sort((a, b) => {
        if (sortOrder.toLowerCase() === 'desc') {
          return a[sortBy] > b[sortBy] ? -1 : 1;
        }
        return a[sortBy] > b[sortBy] ? 1 : -1;
      });
    }
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedData = filteredData.slice(startIndex, endIndex);
    
    res.status(200).json({
      report: {
        id: report._id,
        name: report.name,
        type: report.type,
        columns: report.columns,
        totalRows: report.data.length,
        filteredRows: filteredData.length
      },
      data: paginatedData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(filteredData.length / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching report data:', error);
    res.status(500).json({ message: 'Failed to fetch report data' });
  }
};

/**
 * Export report as CSV or Excel
 */
export const exportReport = async (req, res) => {
  try {
    const { reportId, format = 'csv' } = req.query;
    
    if (!reportId) {
      return res.status(400).json({ message: 'Report ID is required' });
    }
    
    const report = await Report.findById(reportId);
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    if (format === 'csv') {
      // Generate CSV
      const csvHeader = report.columns.join(',');
      const csvRows = report.data.map(row => 
        report.columns.map(col => {
          const val = row[col] !== undefined ? row[col] : '';
          return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
        }).join(',')
      );
      
      const csvContent = [csvHeader, ...csvRows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${report.name}-export.csv`);
      return res.send(csvContent);
    } else if (format === 'xlsx') {
      // Generate Excel
      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet('Report');
      
      // Add headers
      worksheet.addRow(report.columns);
      
      // Add data
      report.data.forEach(row => {
        const rowData = report.columns.map(col => row[col] !== undefined ? row[col] : '');
        worksheet.addRow(rowData);
      });
      
      // Format header row
      worksheet.getRow(1).font = { bold: true };
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${report.name}-export.xlsx`);
      
      await workbook.xlsx.write(res);
      return res.end();
    } else {
      return res.status(400).json({ message: 'Unsupported export format' });
    }
    
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({ message: 'Failed to export report' });
  }
};

/**
 * Delete an uploaded report
 */
export const deleteUploadedReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.reportId);
    if (!report) {
      throw new NotFoundError('Report not found');
    }

    // Remove file from filesystem
    if (report.filePath) {
      try {
        await fs.unlink(report.filePath);
      } catch (err) {
        // File may not exist, log but continue
        console.warn('File not found or already deleted:', report.filePath);
      }
    }
    // Remove from DB
    await Report.deleteOne({ _id: report._id });
    
    successResponse(res, null, 'Report deleted successfully');
  } catch (error) {
    next(error);
  }
};