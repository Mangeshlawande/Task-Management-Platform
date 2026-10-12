import {
  changeCurrentPassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  deleteAccount,
} from '#controllers/auth.controllers.js';
import { verifyJWT } from '#middlewares/auth.middleware.js';
import {
  loginLimiter,
  registerLimiter,
} from '#middlewares/rateLimit.middleware.js';
import { validate } from '#middlewares/validator.middleware.js';
import {
  userChangeCurrentPasswordValidator,
  userLoginValidator,
  userRegisterValidator,
} from '#validators/index.js';
import { Router } from 'express';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     description: >
 *       Creates the account and logs the user in immediately — there is no
 *       e-mail verification step. httpOnly accessToken / refreshToken cookies
 *       are set and both tokens are returned in the response body.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RegisterRequest' }
 *     responses:
 *       201:
 *         description: User registered
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
 *                         user: { $ref: '#/components/schemas/User' }
 *             example:
 *               success: true
 *               message: Account created successfully
 *               data:
 *                 user:
 *                   _id: 650e6f3b8f1a2c3d4e5f6a7b
 *                   username: jane_doe
 *                   email: jane@example.com
 *                   fullName: Jane Doe
 *                   role: member
 *                 accessToken: eyJhbGciOiJIUzI1NiJ9...
 *                 refreshToken: eyJhbGciOiJIUzI1NiJ9...
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router
  .route('/register')
  .post(registerLimiter, userRegisterValidator(), validate, registerUser);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in
 *     description: >
 *       Authenticates with email OR username + password. Sets httpOnly
 *       accessToken / refreshToken cookies and also returns both tokens
 *       in the response body.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LoginRequest' }
 *           examples:
 *             withEmail:
 *               value: { email: jane@example.com, password: 'Str0ngPass!' }
 *             withUsername:
 *               value: { username: jane_doe, password: 'Str0ngPass!' }
 *     responses:
 *       200:
 *         description: Logged in
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/LoginResponse' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router
  .route('/login')
  .post(loginLimiter, userLoginValidator(), validate, loginUser);

/**
 * @openapi
 * /auth/refresh-token:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     description: >
 *       Rotates the refresh token. Reads the httpOnly refreshToken cookie
 *       (preferred) or refreshToken in the JSON body. Sets fresh cookies
 *       and returns new tokens.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Tokens refreshed
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
 *                         accessToken: { type: string }
 *                         refreshToken: { type: string }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.route('/refresh-token').post(refreshAccessToken);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out
 *     description: Clears auth cookies and invalidates the stored refresh token.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiResponse' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.route('/logout').post(verifyJWT, logoutUser);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user
 *     description: Returns the authenticated user. Used by the frontend on app load to hydrate session state.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/User' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *   delete:
 *     tags: [Auth]
 *     summary: Delete own account
 *     description: >
 *       Permanently deletes the account and cascades: removes all project
 *       memberships; for owned projects deletes tasks, subtasks, notes and
 *       memberships, then the projects. Transactional.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiResponse' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.route('/me').get(verifyJWT, getCurrentUser).delete(verifyJWT, deleteAccount);

/**
 * @openapi
 * /auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change password
 *     description: >
 *       Verifies the old password, sets a new one and revokes the existing
 *       refresh token (cookies cleared — client should redirect to login).
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ChangePasswordRequest' }
 *     responses:
 *       200:
 *         description: Password changed
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiResponse' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router
  .route('/change-password')
  .post(verifyJWT, userChangeCurrentPasswordValidator(), validate, changeCurrentPassword);

export default router;
