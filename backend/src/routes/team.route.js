import express from 'express';
import { 
  createTeam, 
  getTeams, 
  getTeamById, 
  updateTeam, 
  deleteTeam, 
  addMemberToTeam, 
  removeMemberFromTeam, 
  assignLeaderToTeam 
} from '../controllers/team.controller.js';
import { protectRoute, authorize } from '../middleware/auth.middleware.js';
import { sanitizeInput } from '../middleware/sanitization.middleware.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(protectRoute, authorize(['admin']));

router.post('/', sanitizeInput, createTeam);
router.get('/', getTeams);
router.get('/:teamId', sanitizeInput, getTeamById);
router.put('/:teamId', sanitizeInput, updateTeam);
router.delete('/:teamId', sanitizeInput, deleteTeam);
router.post('/:teamId/members', sanitizeInput, addMemberToTeam);
router.delete('/:teamId/members', sanitizeInput, removeMemberFromTeam);
router.post('/:teamId/leader', sanitizeInput, assignLeaderToTeam);

export default router;
