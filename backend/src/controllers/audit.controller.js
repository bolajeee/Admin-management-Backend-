import AuditService from '../services/audit.service.js';
import { successResponse, errorResponse } from '../utils/responseHandler.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const { audits, pagination } = await AuditService.getAuditLogs(req.query);
    successResponse(res, audits, 'Audit logs retrieved successfully', 200, pagination);
  } catch (error) {
    next(error);
  }
};
