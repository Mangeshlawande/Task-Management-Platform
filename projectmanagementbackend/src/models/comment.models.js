import mongoose, { Schema } from 'mongoose';

const commentSchema = new Schema(
  {
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      minlength: 1,
      maxlength: 2000,
    },

    category: {
      type: String,
      enum: ['general', 'idea', 'update', 'question', 'blocker'],
      default: 'general',
      trim: true,
    },

    task: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: false,
      index: true,
    },

    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },

    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

commentSchema.index({
  project: 1,
  createdAt: -1,
});

commentSchema.index({
  task: 1,
  createdAt: 1,
});

export const Comment = mongoose.model('Comment', commentSchema);
