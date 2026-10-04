import {
  changeCurrentPassword,
  forgotPasswordRequest,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  resendEmailOtp,
  resetForgotPassword,
  verifyEmailOtp,
  deleteAccount,
} from '#controllers/auth.controllers.js';
import { verifyJWT } from '#middlewares/auth.middleware.js';
import {
  forgotPasswordLimiter,
  loginLimiter,
  registerLimiter,
  resendOtpLimiter,
  verifyOtpLimiter,
} from '#middlewares/rateLimit.middleware.js';
import { validate } from '#middlewares/validator.middleware.js';
import {
  userChangeCurrentPasswordValidator,
  userForgotPasswordValidator,
  userLoginValidator,
  userRegisterValidator,
  userResendEmailOtpValidator,
  userResetForgotPasswordValidator,
  userVerifyEmailOtpValidator,
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
 *       Creates an unverified account and emails a 6-digit verification code
 *       (valid 10 minutes). The account cannot log in until the code is
 *       confirmed via POST /auth/verify-otp. Outside production the code is
 *       also returned as `data.devOtp` so the flow is testable without a
 *       mailbox.
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
 *               message: Account created — enter the verification code we emailed you
 *               data:
 *                 user:
 *                   _id: 650e6f3b8f1a2c3d4e5f6a7b
 *                   username: jane_doe
 *                   email: jane@example.com
 *                   fullName: Jane Doe
 *                   role: member
 *                   isEmailVerified: false
 *                 devOtp: '428913'
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router
  .route('/register')
  .post(registerLimiter, userRegisterValidator(), validate, registerUser);

/**
 * @openapi
 * /auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify email with the emailed OTP
 *     description: >
 *       Consumes the 6-digit code sent at registration (or by
 *       POST /auth/resend-otp), marks the email as verified and logs the user
 *       in — httpOnly cookies are set and both tokens are returned.
 *       Codes expire after 10 minutes and allow 5 wrong guesses; afterwards a
 *       new code must be requested.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/VerifyEmailOtpRequest' }
 *     responses:
 *       200:
 *         description: Email verified (and logged in)
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/LoginResponse' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router
  .route('/verify-otp')
  .post(verifyOtpLimiter, userVerifyEmailOtpValidator(), validate, verifyEmailOtp);

/**
 * @openapi
 * /auth/resend-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Resend the email verification code
 *     description: >
 *       Issues a fresh 6-digit code (the previous one is invalidated).
 *       Rate-limited by a 60-second cooldown and enumeration-safe: unknown
 *       emails receive the same 200 response. Outside production the new code
 *       is returned as `data.devOtp`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ResendOtpRequest' }
 *     responses:
 *       200:
 *         description: Code (re)sent
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiResponse' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router
  .route('/resend-otp')
  .post(resendOtpLimiter, userResendEmailOtpValidator(), validate, resendEmailOtp);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in
 *     description: >
 *       Authenticates with email OR username + password. Sets httpOnly
 *       accessToken / refreshToken cookies and also returns both tokens
 *       in the response body. Returns 403 while the account's email is
 *       unverified (send the user to POST /auth/verify-otp).
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
 *       403:
 *         description: 'Email not verified (errors: [EMAIL_NOT_VERIFIED])'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
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

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset email
 *     description: >
 *       Sends a reset link (valid 20 minutes) pointing to
 *       {FRONTEND_URL}/reset-password/{token}. Always returns 200 — does not
 *       reveal whether the email is registered.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ForgotPasswordRequest' }
 *     responses:
 *       200:
 *         description: Reset email sent (or email not registered — indistinguishable)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiResponse' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router
  .route('/forgot-password')
  .post(
    forgotPasswordLimiter,
    userForgotPasswordValidator(),
    validate,
    forgotPasswordRequest
  );

/**
 * @openapi
 * /auth/reset-password/{resetToken}:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password with token
 *     description: Consumes the emailed token, sets the new password and revokes existing sessions.
 *     parameters:
 *       - in: path
 *         name: resetToken
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ResetPasswordRequest' }
 *     responses:
 *       200:
 *         description: Password reset
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiResponse' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 */
router
  .route('/reset-password/:resetToken')
  .post(userResetForgotPasswordValidator(), validate, resetForgotPassword);

export default router;
