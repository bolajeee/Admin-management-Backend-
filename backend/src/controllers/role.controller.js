import RoleService from '../services/role.service.js';
import { successResponse, errorResponse } from '../utils/responseHandler.js';

export const createRole = async (req, res, next) => {
  try {
    const role = await RoleService.createRole(req.body);
    successResponse(res, role, 'Role created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getRoles = async (req, res, next) => {
  try {
    const roles = await RoleService.getRoles();
    successResponse(res, roles, 'Roles retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getRoleById = async (req, res, next) => {
  try {
    const role = await RoleService.getRoleById(req.params.roleId);
    if (!role) {
      return errorResponse(res, null, 'Role not found', 404);
    }
    successResponse(res, role, 'Role retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const updateRole = async (req, res, next) => {
  try {
    const role = await RoleService.updateRole(req.params.roleId, req.body);
    if (!role) {
      return errorResponse(res, null, 'Role not found', 404);
    }
    successResponse(res, role, 'Role updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteRole = async (req, res, next) => {
  try {
    const role = await RoleService.deleteRole(req.params.roleId);
    if (!role) {
      return errorResponse(res, null, 'Role not found', 404);
    }
    successResponse(res, null, 'Role deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const assignPermissionToRole = async (req, res, next) => {
  try {
    const { permission } = req.body;
    const role = await RoleService.assignPermissionToRole(req.params.roleId, permission);
    if (!role) {
      return errorResponse(res, null, 'Role not found', 404);
    }
    successResponse(res, role, 'Permission assigned successfully');
  } catch (error) {
    next(error);
  }
};

export const removePermissionFromRole = async (req, res, next) => {
  try {
    const { permission } = req.body;
    const role = await RoleService.removePermissionFromRole(req.params.roleId, permission);
    if (!role) {
      return errorResponse(res, null, 'Role not found', 404);
    }
    successResponse(res, role, 'Permission removed successfully');
  } catch (error) {
    next(error);
  }
};
