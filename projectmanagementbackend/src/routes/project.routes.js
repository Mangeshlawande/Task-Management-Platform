import {
  addMembersToProject,
  createProject,
  deleteMember,
  getProjects,
  getProjectById,
  getProjectMembers,
  updateProject,
  updateMemberRole,
  deleteProject,
} from '#controllers/project.controllers.js';

import {
  validateProjectPermission,
  verifyJWT,
} from '#middlewares/auth.middleware.js';
import { validate } from '#middlewares/validator.middleware.js';
import { AvailableUserRole, UserRoleEnum } from '#utils/constants.js';

import {
  createProjectValidator,
  updateProjectValidator,
  addMemberToProjectValidator,
  projectIdValidator,
} from '#validators/index.js';

import { Router } from 'express';

// Sub-routers
import taskRouter from '#routes/task.routes.js';
import noteRouter from '#routes/note.routes.js';
import dashboardRouter from '#routes/dashboard.routes.js';

const router = Router();

router.use(verifyJWT);

/**
 * @openapi
 * /projects:
 *   get:
 *     tags: [Projects]
 *     summary: List my projects
 *     description: Returns every project the authenticated user is a member of, each with its role and a member count.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Projects fetched
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           role: { type: string, enum: [admin, project_admin, member] }
 *                           project: { $ref: '#/components/schemas/Project' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *   post:
 *     tags: [Projects]
 *     summary: Create project
 *     description: Creates a project and adds the creator as its first admin member. Names are unique per creator.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, minLength: 3, maxLength: 100, example: Website Redesign }
 *               description: { type: string, maxLength: 1000 }
 *     responses:
 *       201:
 *         description: Project created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Project' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router
  .route('/')
  .get(getProjects)
  .post(createProjectValidator(), validate, createProject);

/**
 * @openapi
 * /projects/{projectId}:
 *   get:
 *     tags: [Projects]
 *     summary: Get project details
 *     description: Requires any project role.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Project fetched
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Project' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   put:
 *     tags: [Projects]
 *     summary: Update project
 *     description: Admin and project_admin only. Partial updates supported.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, minLength: 3, maxLength: 100 }
 *               description: { type: string, maxLength: 1000 }
 *     responses:
 *       200:
 *         description: Project updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Project' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     tags: [Projects]
 *     summary: Delete project
 *     description: Admin only. Cascade-deletes tasks, subtasks, notes and memberships. Transactional.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Project deleted
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiResponse' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router
  .route('/:projectId')
  .get(
    projectIdValidator(),
    validate,
    validateProjectPermission(AvailableUserRole),
    getProjectById,
  )
  .put(
    updateProjectValidator(),
    validate,
    validateProjectPermission([UserRoleEnum.ADMIN, UserRoleEnum.PROJECT_ADMIN]),
    updateProject,
  )
  .delete(
    projectIdValidator(),
    validate,
    validateProjectPermission([UserRoleEnum.ADMIN]),
    deleteProject,
  );

/**
 * @openapi
 * /projects/{projectId}/members:
 *   get:
 *     tags: [Projects]
 *     summary: List project members
 *     description: Any project role. Each entry embeds the user's public profile.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Members fetched
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/ProjectMember' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   post:
 *     tags: [Projects]
 *     summary: Add member
 *     description: >
 *       Admin/project_admin only. Adds an existing registered user by email
 *       with role project_admin or member. Upserts — if already a member,
 *       their role is updated.
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
 *           schema: { $ref: '#/components/schemas/AddMemberRequest' }
 *     responses:
 *       200:
 *         description: Member added (or role updated)
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
 *                         projectMember: { $ref: '#/components/schemas/ProjectMember' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router
  .route('/:projectId/members')
  .get(
    projectIdValidator(),
    validate,
    validateProjectPermission(AvailableUserRole),
    getProjectMembers,
  )
  .post(
    addMemberToProjectValidator(),
    validate,
    validateProjectPermission([UserRoleEnum.ADMIN, UserRoleEnum.PROJECT_ADMIN]),
    addMembersToProject,
  );

/**
 * @openapi
 * /projects/{projectId}/members/{userId}:
 *   put:
 *     tags: [Projects]
 *     summary: Update member role
 *     description: Admin only. Cannot downgrade yourself.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateMemberRoleRequest' }
 *     responses:
 *       200:
 *         description: Role updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/ProjectMember' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     tags: [Projects]
 *     summary: Remove member
 *     description: Admin only. Cannot remove yourself; the last remaining admin cannot be removed.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Member removed
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiResponse' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router
  .route('/:projectId/members/:userId')
  .put(
    projectIdValidator(),
    validate,
    validateProjectPermission([UserRoleEnum.ADMIN]),
    updateMemberRole,
  )
  .delete(
    projectIdValidator(),
    validate,
    validateProjectPermission([UserRoleEnum.ADMIN]),
    deleteMember,
  );

//
// NESTED SUB-ROUTERS (tasks, notes, dashboard under project)
//

router.use('/:projectId/tasks', taskRouter);
router.use('/:projectId/notes', noteRouter);
router.use('/:projectId/dashboard', dashboardRouter);

export default router;
