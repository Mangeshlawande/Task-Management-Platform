import { Router } from 'express';
import { asyncHandler } from '#utils/asyncHandler.js';

const router = Router();

/**
 * @openapi
 * /healthcheck:
 *   get:
 *     tags: [Health]
 *     summary: Service health check
 *     responses:
 *       200:
 *         description: Service is up
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
 *                         uptime: { type: number }
 *                         timestamp: { type: string, format: date-time }
 */
router.route('/').get(
  asyncHandler(async (_req, res) => {
    res.status(200).json({
      success: true,
      message: 'OK',
      data: {
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    });
  }),
);

export default router;
