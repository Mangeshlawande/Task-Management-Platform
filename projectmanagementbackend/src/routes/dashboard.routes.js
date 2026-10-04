import { Router } from 'express';

import { getProjectDashboard } from '#controllers/dashboard.controller.js';
import { validateProjectPermission } from '#middlewares/auth.middleware.js';
import { AvailableUserRole } from '#utils/constants.js';

const router = Router({ mergeParams: true });

/**
 * @openapi
 * /projects/{projectId}/dashboard:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get project dashboard stats
 *     description: Any project member. Returns task counts by status, member count and the 5 most recently updated tasks.
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
 *         description: Dashboard data fetched
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/DashboardStats' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get(
  '/',
  validateProjectPermission(AvailableUserRole),
  getProjectDashboard,
);

export default router;
