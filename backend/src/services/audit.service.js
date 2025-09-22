import Audit from '../models/audit.model.js';

class AuditService {
  static async createAuditLog(auditData) {
    const audit = new Audit(auditData);
    return await audit.save();
  }

  static async getAuditLogs(queryParams) {
    const { user, action, page = 1, limit = 20, sortBy = 'timestamp', sortOrder = 'desc' } = queryParams;
    const query = {};

    if (user) {
      query.user = user;
    }

    if (action) {
      query.action = action;
    }

    const [audits, total] = await Promise.all([
      Audit.find(query)
        .populate('user', 'name email')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Audit.countDocuments(query),
    ]);

    return {
      audits,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export default AuditService;
