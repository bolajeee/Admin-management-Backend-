import Role from '../models/role.model.js';

class RoleService {
  static async createRole(roleData) {
    const role = new Role(roleData);
    return await role.save();
  }

  static async getRoles() {
    return await Role.find();
  }

  static async getRoleById(roleId) {
    return await Role.findById(roleId);
  }

  static async updateRole(roleId, roleData) {
    return await Role.findByIdAndUpdate(roleId, roleData, { new: true });
  }

  static async deleteRole(roleId) {
    return await Role.findByIdAndDelete(roleId);
  }

  static async assignPermissionToRole(roleId, permission) {
    return await Role.findByIdAndUpdate(
      roleId,
      { $addToSet: { permissions: permission } },
      { new: true }
    );
  }

  static async removePermissionFromRole(roleId, permission) {
    return await Role.findByIdAndUpdate(
      roleId,
      { $pull: { permissions: permission } },
      { new: true }
    );
  }
}

export default RoleService;
