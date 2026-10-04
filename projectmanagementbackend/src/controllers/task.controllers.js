import mongoose from 'mongoose';

import { Task } from '#models/task.models.js';
import { Project } from '#models/project.models.js';
import { SubTask } from '#models/subtask.models.js';
import { User } from '#models/user.models.js';
import { ProjectMember } from '#models/projectmember.models.js';

import { ApiError } from '#utils/ApiError.js';
import { ApiResponse } from '#utils/ApiResponse.js';
import { asyncHandler } from '#utils/asyncHandler.js';

import {
  AvailableTaskStatues,
  TaskStatusEnum,
  UserRoleEnum,
} from '#utils/constants.js';

/* =========================================================
   HELPERS
========================================================= */

const validateObjectId = (id, field = 'Id') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${field}`);
  }
};

const validateAssignedUser = async (projectId, assignedTo) => {
  if (!assignedTo) return;

  validateObjectId(assignedTo, 'assignedTo');

  const userExists = await User.exists({ _id: assignedTo });

  if (!userExists) {
    throw new ApiError(404, 'Assigned user not found');
  }

  const isProjectMember = await ProjectMember.exists({
    project: projectId,
    user: assignedTo,
  });

  if (!isProjectMember) {
    throw new ApiError(400, 'Assigned user is not a project member');
  }
};

/* =========================================================
   GET ALL TASKS
========================================================= */

const getTasks = asyncHandler(async (req, res) => {
  // projectId comes from URL param (mounted at /projects/:projectId/tasks)
  const { projectId } = req.params;

  validateObjectId(projectId, 'projectId');

  const project = await Project.exists({ _id: projectId });

  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  // Access already validated by validateProjectPermission middleware
  const tasks = await Task.find({ project: projectId })
    .populate('assignedTo', 'avatar username fullName email')
    .populate('assignedBy', 'avatar username fullName')
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, tasks, 'Tasks fetched successfully'));
});

/* =========================================================
   CREATE TASK
========================================================= */

const createTask = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  validateObjectId(projectId, 'projectId');

  const { title, description, assignedTo, status, priority, dueDate } =
    req.body;

  const project = await Project.exists({ _id: projectId });

  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  if (!title || !title.trim()) {
    throw new ApiError(400, 'Task title is required');
  }

  if (status && !AvailableTaskStatues.includes(status)) {
    throw new ApiError(400, 'Invalid task status');
  }

  await validateAssignedUser(projectId, assignedTo);

  const files = Array.isArray(req.files)
    ? req.files
    : Object.values(req.files || {}).flat();

  const baseUrl =
    process.env.SERVER_URL ||
    `${req.protocol}://${req.get('host')}`;

  const attachments = files.map((file) => ({
    url: `${baseUrl}/images/${file.filename}`,
    localPath: file.path,
    mimeType: file.mimetype,
    size: file.size,
  }));

  const task = await Task.create({
    title: title.trim(),
    description: description?.trim() || '',
    project: projectId,
    assignedTo: assignedTo || undefined,
    assignedBy: req.user._id,
    status: status || TaskStatusEnum.TODO,
    priority,
    dueDate,
    attachments,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, task, 'Task created successfully'));
});

/* =========================================================
   GET TASK BY ID
========================================================= */

const getTaskById = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;

  validateObjectId(projectId, 'projectId');
  validateObjectId(taskId, 'taskId');

  const task = await Task.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(taskId),
        project: new mongoose.Types.ObjectId(projectId),
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'assignedTo',
        foreignField: '_id',
        as: 'assignedTo',
        pipeline: [
          {
            $project: { _id: 1, username: 1, fullName: 1, avatar: 1, email: 1 },
          },
        ],
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'assignedBy',
        foreignField: '_id',
        as: 'assignedBy',
        pipeline: [
          {
            $project: { _id: 1, username: 1, fullName: 1, avatar: 1 },
          },
        ],
      },
    },
    {
      $lookup: {
        from: 'subtasks',
        localField: '_id',
        foreignField: 'task',
        as: 'subTasks',
        pipeline: [
          {
            $lookup: {
              from: 'users',
              localField: 'createdBy',
              foreignField: '_id',
              as: 'createdBy',
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              createdBy: { $arrayElemAt: ['$createdBy', 0] },
            },
          },
        ],
      },
    },
    {
      $addFields: {
        assignedTo: { $arrayElemAt: ['$assignedTo', 0] },
        assignedBy: { $arrayElemAt: ['$assignedBy', 0] },
      },
    },
  ]);

  if (!task.length) {
    throw new ApiError(404, 'Task not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, task[0], 'Task fetched successfully'));
});

/* =========================================================
   UPDATE TASK
========================================================= */

const updateTask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;

  validateObjectId(projectId, 'projectId');
  validateObjectId(taskId, 'taskId');

  const task = await Task.findOne({ _id: taskId, project: projectId });

  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  // Check: task creator, project admin, or global admin
  const isOwner =
    task.assignedBy?.toString() === req.user._id.toString();
  const isProjectAdmin =
    req.projectRole === UserRoleEnum.ADMIN ||
    req.projectRole === UserRoleEnum.PROJECT_ADMIN;

  if (!isOwner && !isProjectAdmin) {
    throw new ApiError(403, 'Not allowed to update this task');
  }

  const { title, description, status, assignedTo, priority, dueDate } =
    req.body;

  if (title !== undefined && !title.trim()) {
    throw new ApiError(400, 'Title cannot be empty');
  }

  if (status && !AvailableTaskStatues.includes(status)) {
    throw new ApiError(400, 'Invalid task status');
  }

  await validateAssignedUser(projectId, assignedTo);

  if (title !== undefined) task.title = title.trim();
  if (description !== undefined) task.description = description.trim();
  if (status !== undefined) task.status = status;
  if (assignedTo !== undefined) task.assignedTo = assignedTo;
  if (priority !== undefined) task.priority = priority;
  if (dueDate !== undefined) task.dueDate = dueDate;

  await task.save();

  return res
    .status(200)
    .json(new ApiResponse(200, task, 'Task updated successfully'));
});

/* =========================================================
   DELETE TASK
========================================================= */

const deleteTask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;

  validateObjectId(projectId, 'projectId');
  validateObjectId(taskId, 'taskId');

  const task = await Task.findOne({ _id: taskId, project: projectId });

  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  const isOwner =
    task.assignedBy?.toString() === req.user._id.toString();
  const isProjectAdmin =
    req.projectRole === UserRoleEnum.ADMIN ||
    req.projectRole === UserRoleEnum.PROJECT_ADMIN;

  if (!isOwner && !isProjectAdmin) {
    throw new ApiError(403, 'Not allowed to delete this task');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await Task.deleteOne({ _id: taskId }, { session });
    await SubTask.deleteMany({ task: taskId }, { session });

    await session.commitTransaction();
    session.endSession();

    return res
      .status(200)
      .json(new ApiResponse(200, {}, 'Task deleted successfully'));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

export { getTasks, createTask, getTaskById, updateTask, deleteTask };
