import mongoose from 'mongoose';
import { Comment } from '#models/comment.models.js';
import { Task } from '#models/task.models.js';
import { ProjectMember } from '#models/projectmember.models.js';
import { ApiError } from '#utils/ApiError.js';
import { ApiResponse } from '#utils/ApiResponse.js';
import { asyncHandler } from '#utils/asyncHandler.js';
import { UserRoleEnum } from '#utils/constants.js';

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

export const getComments = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  validateObjectId(projectId, 'projectId');
  validateObjectId(taskId, 'taskId');

  await getTaskFromProject(projectId, taskId);

  const comments = await Comment.find({ project: projectId, task: taskId })
    .populate('author', '_id username fullName avatar email')
    .sort({ createdAt: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, comments, 'Comments fetched successfully'));
});

export const createComment = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const { content } = req.body;

  validateObjectId(projectId, 'projectId');
  validateObjectId(taskId, 'taskId');

  if (!content || !content.trim()) {
    throw new ApiError(400, 'Comment content cannot be empty');
  }

  await getTaskFromProject(projectId, taskId);

  const comment = await Comment.create({
    content: content.trim(),
    project: projectId,
    task: taskId,
    author: req.user._id,
  });

  const populatedComment = await Comment.findById(comment._id).populate(
    'author',
    '_id username fullName avatar email'
  );

  return res
    .status(201)
    .json(new ApiResponse(201, populatedComment, 'Comment added successfully'));
});

export const deleteComment = asyncHandler(async (req, res) => {
  const { projectId, taskId, commentId } = req.params;

  validateObjectId(projectId, 'projectId');
  validateObjectId(taskId, 'taskId');
  validateObjectId(commentId, 'commentId');

  const comment = await Comment.findOne({
    _id: commentId,
    project: projectId,
    task: taskId,
  });

  if (!comment) {
    throw new ApiError(404, 'Comment not found');
  }

  const isAuthor = comment.author.toString() === req.user._id.toString();
  let isProjectAdmin =
    req.projectRole === UserRoleEnum.ADMIN ||
    req.projectRole === UserRoleEnum.PROJECT_ADMIN ||
    req.user?.role === UserRoleEnum.ADMIN;

  if (!isAuthor && !isProjectAdmin) {
    const member = await ProjectMember.findOne({
      project: projectId,
      user: req.user._id,
    });
    if (
      member &&
      (member.role === UserRoleEnum.ADMIN || member.role === UserRoleEnum.PROJECT_ADMIN)
    ) {
      isProjectAdmin = true;
    }
  }

  if (!isAuthor && !isProjectAdmin) {
    throw new ApiError(403, 'You do not have permission to delete this comment');
  }

  await Comment.deleteOne({ _id: commentId });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Comment deleted successfully'));
});

/* =========================================================
   PROJECT-LEVEL DISCUSSIONS & COMMENTS (For anyone in project)
========================================================= */

export const getProjectComments = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  validateObjectId(projectId, 'projectId');

  const comments = await Comment.find({ project: projectId })
    .populate('author', '_id username fullName avatar email role')
    .populate('task', '_id title status priority')
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, comments, 'Project comments fetched successfully'));
});

export const createProjectComment = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { content, category, taskId } = req.body;

  validateObjectId(projectId, 'projectId');
  if (taskId) validateObjectId(taskId, 'taskId');

  if (!content || !content.trim()) {
    throw new ApiError(400, 'Comment content cannot be empty');
  }

  const comment = await Comment.create({
    content: content.trim(),
    project: projectId,
    task: taskId || undefined,
    category: category || 'general',
    author: req.user._id,
  });

  const populated = await Comment.findById(comment._id)
    .populate('author', '_id username fullName avatar email role')
    .populate('task', '_id title status priority');

  return res
    .status(201)
    .json(new ApiResponse(201, populated, 'Comment posted successfully'));
});

export const deleteProjectComment = asyncHandler(async (req, res) => {
  const { projectId, commentId } = req.params;
  validateObjectId(projectId, 'projectId');
  validateObjectId(commentId, 'commentId');

  const comment = await Comment.findOne({ _id: commentId, project: projectId });
  if (!comment) {
    throw new ApiError(404, 'Comment not found');
  }

  const isAuthor = comment.author.toString() === req.user._id.toString();
  let isProjectAdmin =
    req.projectRole === UserRoleEnum.ADMIN ||
    req.projectRole === UserRoleEnum.PROJECT_ADMIN ||
    req.user?.role === UserRoleEnum.ADMIN;

  if (!isAuthor && !isProjectAdmin) {
    const member = await ProjectMember.findOne({
      project: projectId,
      user: req.user._id,
    });
    if (
      member &&
      (member.role === UserRoleEnum.ADMIN || member.role === UserRoleEnum.PROJECT_ADMIN)
    ) {
      isProjectAdmin = true;
    }
  }

  if (!isAuthor && !isProjectAdmin) {
    throw new ApiError(403, 'You do not have permission to delete this comment');
  }

  await Comment.deleteOne({ _id: commentId });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Comment deleted successfully'));
});
