import mongoose, { Schema } from 'mongoose';

const projectSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      minlength: 3,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: 1000,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
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
   COMPOUND UNIQUE INDEX
========================================================= */

projectSchema.index(
  {
    name: 1,
    createdBy: 1,
  },
  {
    unique: true,
  }
);

export const Project = mongoose.model(
  'Project',
  projectSchema
);