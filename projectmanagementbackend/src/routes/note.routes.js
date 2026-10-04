import express from 'express';
import {
  createProjectNote,
  deleteProjectNote,
  getProjectNotes,
  getProjectNoteById,
  updateProjectNote,
} from '#controllers/note.controllers.js';

import { validate } from '#middlewares/validator.middleware.js';
import { createNoteValidator, updateNoteValidator } from '#validators/index.js';
import { verifyJWT, validateProjectPermission } from '#middlewares/auth.middleware.js';
import { UserRoleEnum, AvailableUserRole } from '#utils/constants.js';

const router = express.Router({ mergeParams: true }); // mergeParams to get :projectId

router.use(verifyJWT);

/**
 * @openapi
 * /projects/{projectId}/notes:
 *   get:
 *     tags: [Notes]
 *     summary: List project notes
 *     description: Any project member. Pinned notes first, then newest. Paginated.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *     responses:
 *       200:
 *         description: Notes fetched
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         notes:
 *                           type: array
 *                           items: { $ref: '#/components/schemas/Note' }
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             total: { type: integer }
 *                             page: { type: integer }
 *                             limit: { type: integer }
 *                             totalPages: { type: integer }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   post:
 *     tags: [Notes]
 *     summary: Create note
 *     description: Admin/project_admin only.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/NoteRequest' }
 *     responses:
 *       201:
 *         description: Note created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Note' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get(
  '/',
  validateProjectPermission(AvailableUserRole),
  getProjectNotes,
);

router.post(
  '/',
  createNoteValidator(),
  validate,
  validateProjectPermission([UserRoleEnum.ADMIN, UserRoleEnum.PROJECT_ADMIN]),
  createProjectNote,
);

/**
 * @openapi
 * /projects/{projectId}/notes/{noteId}:
 *   get:
 *     tags: [Notes]
 *     summary: Get note by id
 *     description: Any project member. Includes populated createdBy and project summary.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Note fetched
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Note' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   put:
 *     tags: [Notes]
 *     summary: Update note
 *     description: Note owner or project admin/project_admin. Updates content and/or isPinned. editedAt set automatically.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateNoteRequest' }
 *     responses:
 *       200:
 *         description: Note updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Note' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     tags: [Notes]
 *     summary: Delete note
 *     description: Note owner or project admin/project_admin.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Note deleted
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiResponse' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router
  .route('/:noteId')
  .get(validateProjectPermission(AvailableUserRole), getProjectNoteById)
  .put(updateNoteValidator(), validate, validateProjectPermission(AvailableUserRole), updateProjectNote)
  .delete(validateProjectPermission(AvailableUserRole), deleteProjectNote);

export default router;
