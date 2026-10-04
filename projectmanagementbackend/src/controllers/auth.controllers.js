import { ApiError } from '#utils/ApiError.js';
import { ApiResponse } from '#utils/ApiResponse.js';
import { asyncHandler } from '#utils/asyncHandler.js';

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import {
  emailVerificationOtpMailgenContent,
  forgotPasswordMailgenContent,
  sendEmail,
} from '#utils/mail.js';
import { EmailOtpPolicy } from '#utils/constants.js';
import { User } from '#models/user.models.js';
import { Project } from '#models/project.models.js';
import { ProjectMember } from '#models/projectmember.models.js';
import { Task } from '#models/task.models.js';
import { SubTask } from '#models/subtask.models.js';
import { ProjectNote } from '#models/note.models.js';
import mongoose from 'mongoose';

/* =========================================================
   COOKIE OPTIONS
========================================================= */

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
};

/* =========================================================
   EMAIL VERIFICATION HELPERS
========================================================= */

const getFrontendUrl = () =>
  process.env.FRONTEND_URL ||
  process.env.FORGOT_PASSWORD_REDIRECT_URL ||
  'http://localhost:5173';

// Outside production the OTP is echoed in the API response and logged, so the
// sign-up flow is completable without a working mailbox (or a mail provider
// that is merely slow). `NODE_ENV=production` removes it completely.
const shouldExposeOtp = () => process.env.NODE_ENV !== 'production';

const sendVerificationOtpEmail = async (user, otp) => {
  if (shouldExposeOtp()) {
    console.log(`🔐 Email verification code for ${user.email}: ${otp}`);
  }

  try {
    await sendEmail({
      email: user.email,
      subject: `${otp} is your Project Camp verification code`,
      mailgenContent: emailVerificationOtpMailgenContent(
        user.username,
        otp,
        `${getFrontendUrl()}/verify-email`
      ),
    });
  } catch (error) {
    // A flaky mail provider must never cost the user their account — they can
    // always ask for a new code from the verification page.
    console.error('Failed to send verification email:', error.message);
  }
};

/* =========================================================
   GENERATE ACCESS & REFRESH TOKEN
========================================================= */

const generateAccessAndRefreshToken = async (userId) => {
  const user = await User.findById(userId).select('+refreshToken');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

/* =========================================================
   REGISTER USER
========================================================= */

const registerUser = asyncHandler(async (req, res) => {
  const { email, username, password, fullName, fullname } = req.body;
  // Accept both fullName and fullname from frontend
  const name = fullName || fullname;

  if (!email || !username || !password) {
    throw new ApiError(400, 'Email, username and password are required');
  }

  const existedUser = await User.findOne({
    $or: [
      { email: email.toLowerCase() },
      { username: username.toLowerCase() },
    ],
  });

  if (existedUser) {
    throw new ApiError(409, 'User with this email or username already exists');
  }

  const user = new User({
    email: email.toLowerCase(),
    username: username.toLowerCase(),
    password,
    fullName: name,
    isEmailVerified: false,
  });

  // Plaintext code is returned once so we can email it — only the hash is stored.
  const otp = user.generateEmailVerificationOtp();
  await user.save();

  // The OTP paths are select:false, so they stay out of the response body.
  const createdUser = await User.findById(user._id);

  await sendVerificationOtpEmail(user, otp);

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        user: createdUser,
        ...(shouldExposeOtp() ? { devOtp: otp } : {}),
      },
      'Account created — enter the verification code we emailed you'
    )
  );
});

/* =========================================================
   LOGIN USER
========================================================= */

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if ((!email && !username) || !password) {
    throw new ApiError(400, 'Email/Username and password are required');
  }

  const query = email
    ? { email: email.toLowerCase() }
    : { username: username.toLowerCase() };

  const user = await User.findOne(query).select('+password +refreshToken');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);

  if (!isPasswordCorrect) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Gate on an explicit `false` only: accounts created before OTP
  // verification existed have no stored value and stay usable.
  if (user.isEmailVerified === false) {
    throw new ApiError(
      403,
      'Please verify your email address before logging in',
      ['EMAIL_NOT_VERIFIED']
    );
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id);

  return res
    .status(200)
    .cookie('accessToken', accessToken, cookieOptions)
    .cookie('refreshToken', refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        'User logged in successfully'
      )
    );
});

/* =========================================================
   LOGOUT USER
========================================================= */

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { refreshToken: 1 } },
    { new: true }
  );

  return res
    .status(200)
    .clearCookie('accessToken', cookieOptions)
    .clearCookie('refreshToken', cookieOptions)
    .json(new ApiResponse(200, {}, 'User logged out successfully'));
});

/* =========================================================
   GET CURRENT USER
========================================================= */

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, 'Current user fetched successfully'));
});

/* =========================================================
   DELETE ACCOUNT
========================================================= */

const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Remove all project memberships
    await ProjectMember.deleteMany({ user: userId }, { session });

    // For projects created by this user, delete tasks, subtasks, notes and members
    const ownedProjects = await Project.find({ createdBy: userId }).select('_id');
    const ownedProjectIds = ownedProjects.map((p) => p._id);

    if (ownedProjectIds.length > 0) {
      const tasks = await Task.find({
        project: { $in: ownedProjectIds },
      }).select('_id');
      const taskIds = tasks.map((t) => t._id);

      await SubTask.deleteMany({ task: { $in: taskIds } }, { session });
      await Task.deleteMany({ project: { $in: ownedProjectIds } }, { session });
      await ProjectNote.deleteMany(
        { project: { $in: ownedProjectIds } },
        { session }
      );
      await ProjectMember.deleteMany(
        { project: { $in: ownedProjectIds } },
        { session }
      );
      await Project.deleteMany({ _id: { $in: ownedProjectIds } }, { session });
    }

    await User.findByIdAndDelete(userId, { session });

    await session.commitTransaction();
    session.endSession();

    return res
      .status(200)
      .clearCookie('accessToken', cookieOptions)
      .clearCookie('refreshToken', cookieOptions)
      .json(new ApiResponse(200, {}, 'Account deleted successfully'));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

/* =========================================================
   REFRESH ACCESS TOKEN
========================================================= */

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, 'Unauthorized request');
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id).select('+refreshToken');

    if (!user) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, 'Refresh token expired or already used');
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    return res
      .status(200)
      .cookie('accessToken', accessToken, cookieOptions)
      .cookie('refreshToken', refreshToken, cookieOptions)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          'Access token refreshed successfully'
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || 'Invalid refresh token');
  }
});

/* =========================================================
   FORGOT PASSWORD REQUEST
========================================================= */

const forgotPasswordRequest = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  // Respond identically whether or not the account exists so the
  // endpoint cannot be used to enumerate registered emails.
  if (!user) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {},
        'If that email is registered, a password reset link has been sent'
      )
    );
  }

  const { hashedToken, unHashedToken, tokenExpiry } =
    user.generateTemporaryToken();

  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  // Use FRONTEND_URL so the reset link lands on the React page
  const frontendUrl = getFrontendUrl();

  await sendEmail({
    email: user.email,
    subject: 'Password reset request — Project Camp',
    mailgenContent: forgotPasswordMailgenContent(
      user.username,
      `${frontendUrl}/reset-password/${unHashedToken}`
    ),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, {}, 'Password reset email sent successfully')
    );
});

/* =========================================================
   RESET FORGOT PASSWORD
========================================================= */

const resetForgotPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { newPassword } = req.body;

  if (!resetToken || !newPassword) {
    throw new ApiError(400, 'Reset token and new password are required');
  }

  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  user.password = newPassword;
  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpiry = undefined;
  user.refreshToken = undefined;
  await user.save();

  return res
    .status(200)
    .clearCookie('accessToken', cookieOptions)
    .clearCookie('refreshToken', cookieOptions)
    .json(new ApiResponse(200, {}, 'Password reset successfully'));
});

/* =========================================================
   VERIFY EMAIL (OTP)
========================================================= */

const verifyEmailOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+emailVerificationOtp +emailVerificationOtpExpiry +emailVerificationOtpAttempts'
  );

  // Same answer for "no such account" and "bad code" — never confirm which
  // emails exist.
  if (!user) {
    throw new ApiError(400, 'Invalid or expired verification code', [
      'INVALID_OTP',
    ]);
  }

  if (user.isEmailVerified !== false) {
    // Already verified (or a pre-OTP account) — idempotent, no state change.
    return res
      .status(200)
      .json(new ApiResponse(200, { user }, 'Email already verified'));
  }

  const isExpired =
    !user.emailVerificationOtpExpiry ||
    user.emailVerificationOtpExpiry.getTime() < Date.now();

  if (!user.emailVerificationOtp || isExpired) {
    throw new ApiError(
      400,
      'Your verification code has expired. Request a new one.',
      ['OTP_EXPIRED']
    );
  }

  const attempts = user.emailVerificationOtpAttempts || 0;

  if (attempts >= EmailOtpPolicy.maxAttempts) {
    throw new ApiError(
      429,
      'Too many incorrect attempts. Request a new code.',
      ['OTP_MAX_ATTEMPTS']
    );
  }

  if (!user.isEmailVerificationOtpValid(otp)) {
    user.emailVerificationOtpAttempts = attempts + 1;
    await user.save({ validateBeforeSave: false });

    const attemptsLeft =
      EmailOtpPolicy.maxAttempts - user.emailVerificationOtpAttempts;
    const attemptsWord = attemptsLeft === 1 ? 'attempt' : 'attempts';

    throw new ApiError(
      400,
      attemptsLeft > 0
        ? `Incorrect verification code. ${attemptsLeft} ${attemptsWord} left.`
        : 'Incorrect verification code. Request a new one.',
      ['INVALID_OTP']
    );
  }

  // Consume the code and activate the account.
  user.isEmailVerified = true;
  user.emailVerificationOtp = undefined;
  user.emailVerificationOtpExpiry = undefined;
  user.emailVerificationOtpAttempts = 0;
  await user.save();

  // Verification is the final step of sign-up, so log them straight in
  // instead of bouncing back to the login form.
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const verifiedUser = await User.findById(user._id);

  return res
    .status(200)
    .cookie('accessToken', accessToken, cookieOptions)
    .cookie('refreshToken', refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { user: verifiedUser, accessToken, refreshToken },
        'Email verified successfully'
      )
    );
});

/* =========================================================
   RESEND EMAIL VERIFICATION OTP
========================================================= */

const resendEmailOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+emailVerificationOtpSentAt'
  );

  // Enumeration-safe: an unknown email gets the same 200 as a real send.
  if (!user || user.isEmailVerified !== false) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {},
          'If that email needs verification, a new code has been sent'
        )
      );
  }

  const sentAt = user.emailVerificationOtpSentAt?.getTime() ?? 0;
  const elapsed = Date.now() - sentAt;

  if (elapsed < EmailOtpPolicy.resendCooldownMs) {
    const waitInSeconds = Math.ceil(
      (EmailOtpPolicy.resendCooldownMs - elapsed) / 1000
    );

    throw new ApiError(
      429,
      `Please wait ${waitInSeconds}s before requesting another code`,
      ['OTP_COOLDOWN']
    );
  }

  const otp = user.generateEmailVerificationOtp();
  await user.save({ validateBeforeSave: false });

  await sendVerificationOtpEmail(user, otp);

  return res.status(200).json(
    new ApiResponse(
      200,
      { ...(shouldExposeOtp() ? { devOtp: otp } : {}) },
      'A new verification code has been sent'
    )
  );
});

/* =========================================================
   CHANGE CURRENT PASSWORD
========================================================= */

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, 'Old password and new password are required');
  }

  const user = await User.findById(req.user?._id).select(
    '+password +refreshToken'
  );

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(401, 'Invalid old password');
  }

  user.password = newPassword;
  user.refreshToken = undefined;
  await user.save();

  return res
    .status(200)
    .clearCookie('accessToken', cookieOptions)
    .clearCookie('refreshToken', cookieOptions)
    .json(new ApiResponse(200, {}, 'Password changed successfully'));
});

export {
  registerUser,
  verifyEmailOtp,
  resendEmailOtp,
  loginUser,
  logoutUser,
  getCurrentUser,
  refreshAccessToken,
  forgotPasswordRequest,
  resetForgotPassword,
  changeCurrentPassword,
  deleteAccount,
};
