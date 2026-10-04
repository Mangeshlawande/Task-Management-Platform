import mongoose from 'mongoose';

import { Project } from '#models/project.models.js';
import { Task } from '#models/task.models.js';
import { ProjectMember } from '#models/projectmember.models.js';

import { ApiError } from '#utils/ApiError.js';
import { ApiResponse } from '#utils/ApiResponse.js';
import { asyncHandler } from '#utils/asyncHandler.js';

/**
 * GET /api/v1/projects/:projectId/dashboard
 *
 * Returns task stats, member count, recent activity for a project.
 */
const getProjectDashboard = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, 'Invalid project id');
  }

  const project = await Project.findById(projectId).select('name description createdBy');

  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  // Task stats
  const taskStats = await Task.aggregate([
    { $match: { project: new mongoose.Types.ObjectId(projectId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const stats = { todo: 0, in_progress: 0, done: 0, total: 0 };
  taskStats.forEach(({ _id, count }) => {
    if (_id in stats) stats[_id] = count;
    stats.total += count;
  });

  // Member count
  const memberCount = await ProjectMember.countDocuments({ project: projectId });

  // Recent tasks (last 5 updated)
  const recentTasks = await Task.find({ project: projectId })
    .populate('assignedTo', 'username fullName avatar')
    .sort({ updatedAt: -1 })
    .limit(5)
    .lean();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        project,
        stats,
        memberCount,
        recentTasks,
      },
      'Dashboard data fetched successfully',
    ),
  );
});

export { getProjectDashboard };
