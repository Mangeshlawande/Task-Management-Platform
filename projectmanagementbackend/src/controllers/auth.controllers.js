import { ApiError } from '#utils/ApiError.js';
import { ApiResponse } from '#utils/ApiResponse.js';
import { asyncHandler } from '#utils/asyncHandler.js';

import jwt from 'jsonwebtoken';

import { User } from '#models/user.models.js';
import { Project } from '#models/project.models.js';
import { ProjectMember } from '#models/projectmember.models.js';
import { Task } from '#models/task.models.js';
import { SubTask } from '#models/subtask.models.js';
import { Comment } from '#models/comment.models.js';
import { ProjectNote } from '#models/note.models.js';
import { invalidateUserAuthCache } from '#middlewares/auth.middleware.js';
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
   GENERATE SINGLE ACCESS TOKEN
========================================================= */

const generateAccessToken = (user) => {
  return user.generateAccessToken();
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
  });

  await user.save();

  // Single clean auth token (httpOnly accessToken cookie + token in body).
  const accessToken = generateAccessToken(user);
  const createdUser = await User.findById(user._id);

  return res
    .status(201)
    .cookie('accessToken', accessToken, cookieOptions)
    .json(
      new ApiResponse(
        201,
        { user: createdUser, accessToken, token: accessToken },
        'Account created successfully'
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

  const user = await User.findOne(query).select('+password');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);

  if (!isPasswordCorrect) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Single clean auth token.
  const accessToken = generateAccessToken(user);
  const loggedInUser = await User.findById(user._id);

  return res
    .status(200)
    .cookie('accessToken', accessToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, token: accessToken },
        'User logged in successfully'
      )
    );
});

/* =========================================================
   LOGOUT USER
========================================================= */

const logoutUser = asyncHandler(async (req, res) => {
  if (req.user?._id) {
    invalidateUserAuthCache(req.user._id);
  }
  return res
    .status(200)
    .clearCookie('accessToken', cookieOptions)
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
      await Comment.deleteMany(
        { project: { $in: ownedProjectIds } },
        { session }
      );
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

    await Comment.deleteMany({ author: userId }, { session });
    await User.findByIdAndDelete(userId, { session });

    await session.commitTransaction();
    session.endSession();

    invalidateUserAuthCache(userId);

    return res
      .status(200)
      .clearCookie('accessToken', cookieOptions)
      .json(new ApiResponse(200, {}, 'Account deleted successfully'));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

/* =========================================================
   REFRESH / RENEW ACCESS TOKEN
========================================================= */

const refreshAccessToken = asyncHandler(async (req, res) => {
  const token =
    req.cookies?.accessToken ||
    (req.header('Authorization')?.startsWith('Bearer ')
      ? req.header('Authorization').split(' ')[1]
      : null);

  if (!token) {
    throw new ApiError(401, 'Unauthorized request');
  }

  try {
    const decodedToken = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, 'Invalid access token');
    }

    const accessToken = generateAccessToken(user);

    return res
      .status(200)
      .cookie('accessToken', accessToken, cookieOptions)
      .json(
        new ApiResponse(
          200,
          { accessToken, token: accessToken },
          'Access token refreshed successfully'
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || 'Invalid or expired token');
  }
});

/* =========================================================
   CHANGE CURRENT PASSWORD
========================================================= */

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, 'Old password and new password are required');
  }

  const user = await User.findById(req.user?._id).select('+password');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(401, 'Invalid old password');
  }

  user.password = newPassword;
  await user.save();

  invalidateUserAuthCache(user._id);

  return res
    .status(200)
    .clearCookie('accessToken', cookieOptions)
    .json(new ApiResponse(200, {}, 'Password changed successfully'));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  refreshAccessToken,
  changeCurrentPassword,
  deleteAccount,
};
