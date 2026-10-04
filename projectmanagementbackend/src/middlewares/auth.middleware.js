import jwt from 'jsonwebtoken';

import { ProjectMember } from '#models/projectmember.models.js';
import { User } from '#models/user.models.js';

import { ApiError } from '#utils/ApiError.js';
import { asyncHandler } from '#utils/asyncHandler.js';
import { UserRoleEnum } from '#utils/constants.js';

/* =========================================================
   VERIFY JWT
========================================================= */

export const verifyJWT = asyncHandler(async (req, res, next) => {
  const authHeader = req.header('Authorization');

  const token =
    req.cookies?.accessToken ||
    (authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null);

  if (!token) {
    // Machine-readable marker lets the SPA distinguish "session expired"
    // (refresh + retry) from credential failures (show field error).
    throw new ApiError(401, 'Unauthorized request', ['INVALID_TOKEN']);
  }

  try {
    const decodedToken = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id).select(
      '-password -refreshToken'
    );

    if (!user) {
      throw new ApiError(401, 'Invalid access token', ['INVALID_TOKEN']);
    }

    req.user = user;

    next();
  } catch (error) {
    throw new ApiError(
      401,
      error?.message || 'Invalid or expired access token',
      ['INVALID_TOKEN']
    );
  }
});

/* =========================================================
   ADMIN ONLY
========================================================= */

export const allowAdmin = (req, _, next) => {
  if (
    !req.user ||
    req.user.role !== UserRoleEnum.ADMIN
  ) {
    throw new ApiError(403, 'Admin access only');
  }
  next();
};

/* =========================================================
   PROJECT ROLE AUTHORIZATION
========================================================= */

export const validateProjectPermission = (
  roles = []
) => {
  return asyncHandler(async (req, _, next) => {
    const { projectId } = req.params;

    if (!projectId) {
      throw new ApiError(
        400,
        'Project ID is required'
      );
    }

    const membership =
      await ProjectMember.findOne({
        project: projectId,
        user: req.user._id,
      });

    if (!membership) {
      throw new ApiError(
        404,
        'Project membership not found'
      );
    }

    const projectRole = membership.role;

    req.projectRole = projectRole;

    if (!roles.includes(projectRole)) {
      throw new ApiError(
        403,
        'You do not have permission to perform this action'
      );
    }

    next();
  });
};