import express from 'express';
import { 
  createRole, 
  getRoles, 
  getRoleById, 
  updateRole, 
  deleteRole, 
  assignPermissionToRole, 
  removePermissionFromRole 
} from '../controllers/role.controller.js';
import { protectRoute, authorize } from '../middleware/auth.middleware.js';
import { sanitizeInput } from '../middleware/sanitization.middleware.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(protectRoute, authorize(['admin']));

router.post('/', sanitizeInput, createRole);
router.get('/', getRoles);
router.get('/:roleId', sanitizeInput, getRoleById);
router.put('/:roleId', sanitizeInput, updateRole);
router.delete('/:roleId', sanitizeInput, deleteRole);
router.post('/:roleId/permissions', sanitizeInput, assignPermissionToRole);
router.delete('/:roleId/permissions', sanitizeInput, removePermissionFromRole);

export default router;
