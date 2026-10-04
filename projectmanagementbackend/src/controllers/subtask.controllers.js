import mongoose from 'mongoose';

import { SubTask } from '#models/subtask.models.js';
import { Task } from '#models/task.models.js';

import { ApiError } from '#utils/ApiError.js';
import { ApiResponse } from '#utils/ApiResponse.js';
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

const getTaskFromProject = async (projectId, taskId) => {
  const task = await Task.findOne({ _id: taskId, project: projectId });

  if (!task) {
    throw new ApiError(404, 'Task not found in this project');
  }

  return task;
};

/* =========================================================
   CREATE SUBTASK
========================================================= */

const createSubTask = asyncHandler(async (req, res) => {
  // URL: POST /projects/:projectId/tasks/:taskId/subtasks
  const { projectId, taskId } = req.params;
  const { title } = req.body;

  validateObjectId(projectId, 'projectId');
  validateObjectId(taskId, 'taskId');

  if (!title || !title.trim()) {
    throw new ApiError(400, 'Subtask title is required');
  }

  await getTaskFromProject(projectId, taskId);

  const subTask = await SubTask.create({
    title: title.trim(),
    task: taskId,
    createdBy: req.user._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, subTask, 'Subtask created successfully'));
});

/* =========================================================
   UPDATE SUBTASK
========================================================= */

const updateSubTask = asyncHandler(async (req, res) => {
  // URL: PUT /projects/:projectId/tasks/:taskId/subtasks/:subTaskId
  const { projectId, taskId, subTaskId } = req.params;
  const { title, isCompleted } = req.body;

  validateObjectId(projectId, 'projectId');
  validateObjectId(taskId, 'taskId');
  validateObjectId(subTaskId, 'subTaskId');

  const subTask = await SubTask.findById(subTaskId)
    .populate('task', 'project assignedBy')
    .populate('createdBy', '_id');

  if (!subTask || !subTask.task) {
    throw new ApiError(404, 'Subtask not found');
  }

  if (subTask.task.project.toString() !== projectId) {
    throw new ApiError(404, 'Subtask does not belong to this project');
  }

  if (subTask.task._id.toString() !== taskId) {
    throw new ApiError(404, 'Subtask does not belong to this task');
  }

  // Authorization: creator, task owner, or project admin
  const isCreator =
    subTask.createdBy?._id.toString() === req.user._id.toString();
  const isTaskOwner =
    subTask.task.assignedBy?.toString() === req.user._id.toString();
  const isProjectAdmin =
    req.projectRole === UserRoleEnum.ADMIN ||
    req.projectRole === UserRoleEnum.PROJECT_ADMIN;

  if (!isCreator && !isTaskOwner && !isProjectAdmin) {
    throw new ApiError(403, 'Not allowed to update this subtask');
  }

  if (title !== undefined) {
    if (!title.trim()) {
      throw new ApiError(400, 'Title cannot be empty');
    }
    subTask.title = title.trim();
  }

  if (isCompleted !== undefined) {
    if (typeof isCompleted !== 'boolean') {
      throw new ApiError(400, 'isCompleted must be boolean');
    }
    subTask.isCompleted = isCompleted;
  }

  await subTask.save();

  return res
    .status(200)
    .json(new ApiResponse(200, subTask, 'Subtask updated successfully'));
});

/* =========================================================
   DELETE SUBTASK
========================================================= */

const deleteSubTask = asyncHandler(async (req, res) => {
  // URL: DELETE /projects/:projectId/tasks/:taskId/subtasks/:subTaskId
  const { projectId, taskId, subTaskId } = req.params;

  validateObjectId(projectId, 'projectId');
  validateObjectId(taskId, 'taskId');
  validateObjectId(subTaskId, 'subTaskId');

  const subTask = await SubTask.findById(subTaskId)
    .populate('task', 'project assignedBy')
    .populate('createdBy', '_id');

  if (!subTask || !subTask.task) {
    throw new ApiError(404, 'Subtask not found');
  }

  if (subTask.task.project.toString() !== projectId) {
    throw new ApiError(404, 'Subtask does not belong to this project');
  }

  if (subTask.task._id.toString() !== taskId) {
    throw new ApiError(404, 'Subtask does not belong to this task');
  }

  const isCreator =
    subTask.createdBy?._id.toString() === req.user._id.toString();
  const isTaskOwner =
    subTask.task.assignedBy?.toString() === req.user._id.toString();
  const isProjectAdmin =
    req.projectRole === UserRoleEnum.ADMIN ||
    req.projectRole === UserRoleEnum.PROJECT_ADMIN;

  if (!isCreator && !isTaskOwner && !isProjectAdmin) {
    throw new ApiError(403, 'Not allowed to delete this subtask');
  }

  await subTask.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Subtask deleted successfully'));
});

export { createSubTask, updateSubTask, deleteSubTask };
