import mongoose, { Schema } from 'mongoose';

const subTaskSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Subtask title is required'],
      trim: true,
      minlength: 1,
      maxlength: 200,
    },

    task: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },

    isCompleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },

  {
    timestamps: true,
  }
);

/* =========================================================
   INDEXES
========================================================= */

subTaskSchema.index({
  task: 1,
  createdAt: -1,
});

subTaskSchema.index({
  task: 1,
  isCompleted: 1,
});

/* =========================================================
   AUTO HANDLE completedAt
========================================================= */

/*
 * Mongoose 9 (kareem 3) runs pre hooks synchronously / as promises — there is
 * no `next` argument anymore, so calling it threw "next is not a function"
 * and every subtask creation 500'd. Keep the hook synchronous.
 */
subTaskSchema.pre('save', function () {
  if (this.isModified('isCompleted')) {
    this.completedAt = this.isCompleted
      ? new Date()
      : null;
  }
});

export const SubTask = mongoose.model(
  'SubTask',
  subTaskSchema
);