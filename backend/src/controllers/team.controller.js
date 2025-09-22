import TeamService from '../services/team.service.js';
import { successResponse, errorResponse } from '../utils/responseHandler.js';

export const createTeam = async (req, res, next) => {
  try {
    const team = await TeamService.createTeam(req.body);
    successResponse(res, team, 'Team created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getTeams = async (req, res, next) => {
  try {
    const teams = await TeamService.getTeams();
    successResponse(res, teams, 'Teams retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getTeamById = async (req, res, next) => {
  try {
    const team = await TeamService.getTeamById(req.params.teamId);
    if (!team) {
      return errorResponse(res, null, 'Team not found', 404);
    }
    successResponse(res, team, 'Team retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const updateTeam = async (req, res, next) => {
  try {
    const team = await TeamService.updateTeam(req.params.teamId, req.body);
    if (!team) {
      return errorResponse(res, null, 'Team not found', 404);
    }
    successResponse(res, team, 'Team updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteTeam = async (req, res, next) => {
  try {
    const team = await TeamService.deleteTeam(req.params.teamId);
    if (!team) {
      return errorResponse(res, null, 'Team not found', 404);
    }
    successResponse(res, null, 'Team deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const addMemberToTeam = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const team = await TeamService.addMemberToTeam(req.params.teamId, userId);
    if (!team) {
      return errorResponse(res, null, 'Team not found', 404);
    }
    successResponse(res, team, 'Member added to team successfully');
  } catch (error) {
    next(error);
  }
};

export const removeMemberFromTeam = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const team = await TeamService.removeMemberFromTeam(req.params.teamId, userId);
    if (!team) {
      return errorResponse(res, null, 'Team not found', 404);
    }
    successResponse(res, team, 'Member removed from team successfully');
  } catch (error) {
    next(error);
  }
};

export const assignLeaderToTeam = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const team = await TeamService.assignLeaderToTeam(req.params.teamId, userId);
    if (!team) {
      return errorResponse(res, null, 'Team not found', 404);
    }
    successResponse(res, team, 'Leader assigned to team successfully');
  } catch (error) {
    next(error);
  }
};
