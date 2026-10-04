import express from 'express';
import {
  createTask,
  updateTask,
  deleteTask,
  getTasks,
  getTaskById,
} from '#controllers/task.controllers.js';

import {
  createSubTask,
  updateSubTask,
  deleteSubTask,
} from '#controllers/subtask.controllers.js';

import { validate } from '#middlewares/validator.middleware.js';
import { upload } from '#middlewares/multer.middleware.js';
import { verifyJWT, validateProjectPermission } from '#middlewares/auth.middleware.js';
import { UserRoleEnum, AvailableUserRole } from '#utils/constants.js';
import {
  createTaskValidator,
  updateTaskValidator,
  getTaskValidator,
  getTasksValidator,
  createSubTaskValidator,
  updateSubTaskValidator,
  deleteSubTaskValidator,
} from '#validators/index.js';

const router = express.Router({ mergeParams: true }); // mergeParams to get :projectId from parent

router.use(verifyJWT);

/**
 * @openapi
 * /projects/{projectId}/tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: List project tasks
 *     description: Any project member. Includes populated assignedTo/assignedBy profiles. Newest first.
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
 *         description: Tasks fetched
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Task' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   post:
 *     tags: [Tasks]
 *     summary: Create task
 *     description: >
 *       Admin/project_admin only. Accepts multipart/form-data with up to 5
 *       image attachments (field name "attachments", each ≤1MB, jpeg/png/webp).
 *       assignedTo must be an existing project member.
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
 *         multipart/form-data:
 *           schema: { $ref: '#/components/schemas/TaskRequest' }
 *           encoding:
 *             attachments:
 *               contentType: image/jpeg, image/png, image/webp
 *     responses:
 *       201:
 *         description: Task created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Task' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get(
  '/',
  getTasksValidator(),
  validate,
  validateProjectPermission(AvailableUserRole),
  getTasks,
);

router.post(
  '/',
  // upload must run BEFORE the body validators because it parses the
  // multipart request and fills req.body / req.files.
  upload.array('attachments', 5),
  createTaskValidator(),
  validate,
  validateProjectPermission([UserRoleEnum.ADMIN, UserRoleEnum.PROJECT_ADMIN]),
  createTask,
);

/**
 * @openapi
 * /projects/{projectId}/tasks/{taskId}:
 *   get:
 *     tags: [Tasks]
 *     summary: Get task details
 *     description: Any project member. Includes populated users and the full subTasks list.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Task fetched
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       allOf:
 *                         - $ref: '#/components/schemas/Task'
 *                         - type: object
 *                           properties:
 *                             subTasks:
 *                               type: array
 *                               items: { $ref: '#/components/schemas/SubTask' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   put:
 *     tags: [Tasks]
 *     summary: Update task
 *     description: Task creator (assignedBy) or project admin/project_admin. Partial updates.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/TaskRequest' }
 *     responses:
 *       200:
 *         description: Task updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Task' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     tags: [Tasks]
 *     summary: Delete task
 *     description: Task creator or project admin/project_admin. Cascade-deletes subtasks. Transactional.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Task deleted
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiResponse' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router
  .route('/:taskId')
  .get(
    getTaskValidator(),
    validate,
    validateProjectPermission(AvailableUserRole),
    getTaskById,
  )
  .put(
    updateTaskValidator(),
    validate,
    validateProjectPermission(AvailableUserRole),
    updateTask,
  )
  .delete(
    getTaskValidator(),
    validate,
    validateProjectPermission(AvailableUserRole),
    deleteTask,
  );

/**
 * @openapi
 * /projects/{projectId}/tasks/{taskId}/subtasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Create subtask
 *     description: Admin/project_admin only.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SubTaskRequest' }
 *     responses:
 *       201:
 *         description: Subtask created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/SubTask' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.post(
  '/:taskId/subtasks',
  createSubTaskValidator(),
  validate,
  validateProjectPermission([UserRoleEnum.ADMIN, UserRoleEnum.PROJECT_ADMIN]),
  createSubTask,
);

/**
 * @openapi
 * /projects/{projectId}/tasks/{taskId}/subtasks/{subTaskId}:
 *   put:
 *     tags: [Tasks]
 *     summary: Update subtask
 *     description: >
 *       Any member may toggle isCompleted (creator/task-owner/admin check in
 *       controller). Changing title requires admin rights.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: subTaskId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateSubTaskRequest' }
 *     responses:
 *       200:
 *         description: Subtask updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/SubTask' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     tags: [Tasks]
 *     summary: Delete subtask
 *     description: Creator, task owner, or project admin.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: subTaskId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Subtask deleted
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiResponse' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router
  .route('/:taskId/subtasks/:subTaskId')
  .put(
    updateSubTaskValidator(),
    validate,
    validateProjectPermission(AvailableUserRole),
    updateSubTask,
  )
  .delete(
    deleteSubTaskValidator(),
    validate,
    validateProjectPermission(AvailableUserRole),
    deleteSubTask,
  );

export default router;
