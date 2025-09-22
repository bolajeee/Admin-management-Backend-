import Team from '../models/team.model.js';

class TeamService {
  static async createTeam(teamData) {
    const team = new Team(teamData);
    return await team.save();
  }

  static async getTeams() {
    return await Team.find().populate('members', 'name email').populate('leader', 'name email');
  }

  static async getTeamById(teamId) {
    return await Team.findById(teamId).populate('members', 'name email').populate('leader', 'name email');
  }

  static async updateTeam(teamId, teamData) {
    return await Team.findByIdAndUpdate(teamId, teamData, { new: true });
  }

  static async deleteTeam(teamId) {
    return await Team.findByIdAndDelete(teamId);
  }

  static async addMemberToTeam(teamId, userId) {
    return await Team.findByIdAndUpdate(
      teamId,
      { $addToSet: { members: userId } },
      { new: true }
    );
  }

  static async removeMemberFromTeam(teamId, userId) {
    return await Team.findByIdAndUpdate(
      teamId,
      { $pull: { members: userId } },
      { new: true }
    );
  }

  static async assignLeaderToTeam(teamId, userId) {
    return await Team.findByIdAndUpdate(
      teamId,
      { leader: userId },
      { new: true }
    );
  }
}

export default TeamService;
