import mongoose from 'mongoose';

import { User } from '#models/user.models.js';
import { Project } from '#models/project.models.js';
import { ProjectMember } from '#models/projectmember.models.js';
import { Task } from '#models/task.models.js';
import { SubTask } from '#models/subtask.models.js';
import { ProjectNote } from '#models/note.models.js';

import { ApiResponse } from '#utils/ApiResponse.js';
import { ApiError } from '#utils/ApiError.js';
import { asyncHandler } from '#utils/asyncHandler.js';

import { UserRoleEnum } from '#utils/constants.js';

/* =========================================================
   HELPERS
========================================================= */

const validateObjectId = (id, field = 'Id') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${field}`);
  }
};

/* =========================================================
   GET ALL PROJECTS
========================================================= */

const getProjects = asyncHandler(async (req, res) => {
  const projects = await ProjectMember.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(req.user._id) } },
    {
      $lookup: {
        from: 'projects',
        localField: 'project',
        foreignField: '_id',
        as: 'project',
        pipeline: [
          {
            $lookup: {
              from: 'projectmembers',
              localField: '_id',
              foreignField: 'project',
              as: 'membersList',
            },
          },
          {
            $addFields: { members: { $size: '$membersList' } },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              description: 1,
              createdBy: 1,
              createdAt: 1,
              updatedAt: 1,
              members: 1,
            },
          },
        ],
      },
    },
    { $unwind: '$project' },
    { $project: { _id: 0, role: 1, project: 1 } },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, projects, 'Projects fetched successfully'));
});

/* =========================================================
   GET PROJECT BY ID
========================================================= */

const getProjectById = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  validateObjectId(projectId, 'projectId');

  const project = await Project.findById(projectId).select(
    'name description createdBy createdAt updatedAt'
  );

  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, project, 'Project fetched successfully'));
});

/* =========================================================
   CREATE PROJECT
========================================================= */

const createProject = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      throw new ApiError(400, 'Project name is required');
    }

    const existingProject = await Project.findOne({
      name: name.trim(),
      createdBy: req.user._id,
    });

    if (existingProject) {
      throw new ApiError(409, 'Project with this name already exists');
    }

    const project = await Project.create(
      [
        {
          name: name.trim(),
          description: description?.trim() || '',
          createdBy: req.user._id,
        },
      ],
      { session }
    );

    await ProjectMember.create(
      [
        {
          user: req.user._id,
          project: project[0]._id,
          role: UserRoleEnum.ADMIN,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res
      .status(201)
      .json(new ApiResponse(201, project[0], 'Project created successfully'));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    if (error.code === 11000) {
      throw new ApiError(409, 'Project already exists');
    }

    throw error;
  }
});

/* =========================================================
   UPDATE PROJECT
========================================================= */

const updateProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  validateObjectId(projectId, 'projectId');

  // Permission already checked by validateProjectPermission middleware
  const { name, description } = req.body;

  const updateData = {};

  if (name !== undefined && name.trim()) {
    updateData.name = name.trim();
  }

  if (description !== undefined) {
    updateData.description = description.trim();
  }

  try {
    const project = await Project.findByIdAndUpdate(projectId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!project) {
      throw new ApiError(404, 'Project not found');
    }

    return res
      .status(200)
      .json(new ApiResponse(200, project, 'Project updated successfully'));
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, 'Project name already exists');
    }

    throw error;
  }
});

/* =========================================================
   DELETE PROJECT — cascade deletes tasks, subtasks, notes, members
========================================================= */

const deleteProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  validateObjectId(projectId, 'projectId');

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const project = await Project.findById(projectId);

    if (!project) {
      throw new ApiError(404, 'Project not found');
    }

    // Cascade: get all task IDs to delete subtasks
    const tasks = await Task.find({ project: projectId }).select('_id');
    const taskIds = tasks.map((t) => t._id);

    await SubTask.deleteMany({ task: { $in: taskIds } }, { session });
    await Task.deleteMany({ project: projectId }, { session });
    await ProjectNote.deleteMany({ project: projectId }, { session });
    await ProjectMember.deleteMany({ project: projectId }, { session });
    await Project.findByIdAndDelete(projectId, { session });

    await session.commitTransaction();
    session.endSession();

    return res
      .status(200)
      .json(new ApiResponse(200, {}, 'Project deleted successfully'));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

/* =========================================================
   ADD MEMBER TO PROJECT
========================================================= */

const addMembersToProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { email, role } = req.body;

  validateObjectId(projectId, 'projectId');

  if (!email) {
    throw new ApiError(400, 'User email is required');
  }

  // Only allow project-level roles (not system admin role)
  const allowedProjectRoles = [UserRoleEnum.PROJECT_ADMIN, UserRoleEnum.MEMBER];
  if (!allowedProjectRoles.includes(role)) {
    throw new ApiError(400, 'Invalid role. Use \'project_admin\' or \'member\'');
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const projectExists = await Project.exists({ _id: projectId });

  if (!projectExists) {
    throw new ApiError(404, 'Project not found');
  }

  const projectMember = await ProjectMember.findOneAndUpdate(
    { user: user._id, project: projectId },
    { role },
    { new: true, upsert: true, runValidators: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, { projectMember }, 'Member added successfully'));
});

/* =========================================================
   GET PROJECT MEMBERS
========================================================= */

const getProjectMembers = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  validateObjectId(projectId, 'projectId');

  const members = await ProjectMember.aggregate([
    { $match: { project: new mongoose.Types.ObjectId(projectId) } },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
        pipeline: [
          {
            $project: { _id: 1, username: 1, fullName: 1, avatar: 1, email: 1 },
          },
        ],
      },
    },
    {
      $addFields: { user: { $arrayElemAt: ['$user', 0] } },
    },
    {
      $project: { _id: 1, role: 1, user: 1, createdAt: 1 },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, members, 'Project members fetched successfully')
    );
});

/* =========================================================
   UPDATE MEMBER ROLE
========================================================= */

const updateMemberRole = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;
  const { role } = req.body;

  validateObjectId(projectId, 'projectId');
  validateObjectId(userId, 'userId');

  const allowedProjectRoles = [UserRoleEnum.ADMIN, UserRoleEnum.PROJECT_ADMIN, UserRoleEnum.MEMBER];
  if (!allowedProjectRoles.includes(role)) {
    throw new ApiError(400, 'Invalid role');
  }

  if (req.user._id.toString() === userId && role !== UserRoleEnum.ADMIN) {
    throw new ApiError(400, 'Admin cannot downgrade themselves');
  }

  const projectMember = await ProjectMember.findOneAndUpdate(
    { project: projectId, user: userId },
    { role },
    { new: true, runValidators: true }
  );

  if (!projectMember) {
    throw new ApiError(404, 'Project member not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, projectMember, 'Role updated successfully'));
});

/* =========================================================
   DELETE MEMBER
========================================================= */

const deleteMember = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;

  validateObjectId(projectId, 'projectId');
  validateObjectId(userId, 'userId');

  if (req.user._id.toString() === userId) {
    throw new ApiError(400, 'Admin cannot remove themselves');
  }

  const projectMember = await ProjectMember.findOne({
    project: projectId,
    user: userId,
  });

  if (!projectMember) {
    throw new ApiError(404, 'Project member not found');
  }

  const adminCount = await ProjectMember.countDocuments({
    project: projectId,
    role: UserRoleEnum.ADMIN,
  });

  if (projectMember.role === UserRoleEnum.ADMIN && adminCount === 1) {
    throw new ApiError(400, 'Project must have at least one admin');
  }

  await ProjectMember.findOneAndDelete({ project: projectId, user: userId });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Member removed successfully'));
});

export {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addMembersToProject,
  getProjectMembers,
  updateMemberRole,
  deleteMember,
};
