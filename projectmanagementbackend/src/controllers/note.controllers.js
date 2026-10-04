import mongoose from 'mongoose';

import { Project } from '#models/project.models.js';
import { ProjectNote } from '#models/note.models.js';

import { ApiError } from '#utils/ApiError.js';
import { ApiResponse } from '#utils/ApiResponse.js';
import { asyncHandler } from '#utils/asyncHandler.js';
import { UserRoleEnum } from '#utils/constants.js';

/* =========================================================
   CREATE PROJECT NOTE
   POST /api/v1/projects/:projectId/notes
========================================================= */

const createProjectNote = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { content } = req.body;

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, 'Invalid project id');
  }

  if (!content || !content.trim()) {
    throw new ApiError(400, 'Content is required');
  }

  const project = await Project.exists({ _id: projectId });

  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  const note = await ProjectNote.create({
    project: projectId,
    createdBy: req.user._id,
    content: content.trim(),
  });

  const populated = await ProjectNote.findById(note._id)
    .populate('createdBy', 'username fullName email avatar');

  return res
    .status(201)
    .json(new ApiResponse(201, populated, 'Project note created successfully'));
});

/* =========================================================
   UPDATE PROJECT NOTE
   PUT /api/v1/projects/:projectId/notes/:noteId
========================================================= */

const updateProjectNote = asyncHandler(async (req, res) => {
  const { projectId, noteId } = req.params;
  const { content, isPinned } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(projectId) ||
    !mongoose.Types.ObjectId.isValid(noteId)
  ) {
    throw new ApiError(400, 'Invalid ids');
  }

  const note = await ProjectNote.findOne({ _id: noteId, project: projectId });

  if (!note) {
    throw new ApiError(404, 'Project note not found');
  }

  // Authorization: owner, project admin, or global admin
  const isOwner = note.createdBy.toString() === req.user._id.toString();
  const isProjectAdmin =
    req.projectRole === UserRoleEnum.ADMIN ||
    req.projectRole === UserRoleEnum.PROJECT_ADMIN;

  if (!isOwner && !isProjectAdmin) {
    throw new ApiError(403, 'You are not allowed to update this note');
  }

  if (content !== undefined) {
    if (!content.trim()) {
      throw new ApiError(400, 'Content cannot be empty');
    }
    note.content = content.trim();
  }

  if (typeof isPinned === 'boolean') {
    note.isPinned = isPinned;
  }

  await note.save();

  return res
    .status(200)
    .json(new ApiResponse(200, note, 'Project note updated successfully'));
});

/* =========================================================
   DELETE PROJECT NOTE
   DELETE /api/v1/projects/:projectId/notes/:noteId
========================================================= */

const deleteProjectNote = asyncHandler(async (req, res) => {
  const { projectId, noteId } = req.params;

  if (
    !mongoose.Types.ObjectId.isValid(projectId) ||
    !mongoose.Types.ObjectId.isValid(noteId)
  ) {
    throw new ApiError(400, 'Invalid ids');
  }

  const note = await ProjectNote.findOne({ _id: noteId, project: projectId });

  if (!note) {
    throw new ApiError(404, 'Project note not found');
  }

  const isOwner = note.createdBy.toString() === req.user._id.toString();
  const isProjectAdmin =
    req.projectRole === UserRoleEnum.ADMIN ||
    req.projectRole === UserRoleEnum.PROJECT_ADMIN;

  if (!isOwner && !isProjectAdmin) {
    throw new ApiError(403, 'You are not allowed to delete this note');
  }

  await note.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Project note deleted successfully'));
});

/* =========================================================
   GET ALL PROJECT NOTES
   GET /api/v1/projects/:projectId/notes
========================================================= */

const getProjectNotes = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, 'Invalid project id');
  }

  const project = await Project.exists({ _id: projectId });

  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  const skip = (page - 1) * limit;

  const notes = await ProjectNote.find({ project: projectId })
    .populate('createdBy', 'username fullName email avatar')
    .sort({ isPinned: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const totalNotes = await ProjectNote.countDocuments({ project: projectId });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        notes,
        pagination: {
          total: totalNotes,
          page,
          limit,
          totalPages: Math.ceil(totalNotes / limit),
        },
      },
      'Project notes fetched successfully',
    ),
  );
});

/* =========================================================
   GET PROJECT NOTE BY ID
   GET /api/v1/projects/:projectId/notes/:noteId
========================================================= */

const getProjectNoteById = asyncHandler(async (req, res) => {
  const { projectId, noteId } = req.params;

  if (
    !mongoose.Types.ObjectId.isValid(projectId) ||
    !mongoose.Types.ObjectId.isValid(noteId)
  ) {
    throw new ApiError(400, 'Invalid ids');
  }

  const note = await ProjectNote.findOne({ _id: noteId, project: projectId })
    .populate('createdBy', 'username fullName email avatar')
    .populate('project', 'name description')
    .lean();

  if (!note) {
    throw new ApiError(404, 'Project note not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, note, 'Project note fetched successfully'));
});

export {
  createProjectNote,
  updateProjectNote,
  deleteProjectNote,
  getProjectNotes,
  getProjectNoteById,
};
