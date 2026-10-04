import mongoose, { Schema } from 'mongoose';

import {
  AvailableUserRole,
  UserRoleEnum,
} from '#utils/constants.js';

const projectMemberSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project is required'],
      index: true,
    },
    role: {
      type: String,
      enum: AvailableUserRole,
      default: UserRoleEnum.MEMBER,
    },
  },
  {
    timestamps: true,

    toJSON: {
      virtuals: true,
    },

    toObject: {
      virtuals: true,
    },
  }
);

/* =========================================================
   PREVENT DUPLICATE MEMBERS
========================================================= */

projectMemberSchema.index(
  {
    user: 1,
    project: 1,
  },
  {
    unique: true,
  }
);

export const ProjectMember = mongoose.model(
  'ProjectMember',
  projectMemberSchema
);