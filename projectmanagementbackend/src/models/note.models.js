import mongoose, { Schema } from 'mongoose';

const projectNoteSchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    content: {
      type: String,
      required: [true, 'Note content is required'],
      trim: true,
      minlength: 1,
      maxlength: 5000,
    },

    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },

    editedAt: {
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

projectNoteSchema.index({ project: 1, createdAt: -1, });

projectNoteSchema.index({
  project: 1,
  isPinned: 1,
});

/* =========================================================
   AUTO UPDATE editedAt
========================================================= */

/*
 * Mongoose 9 (kareem 3): pre hooks receive no `next` — a callback-style hook
 * threw "next is not a function" and note creation/update 500'd.
 */
projectNoteSchema.pre('save', function () {
  if (
    this.isModified('content') &&
    !this.isNew
  ) {
    this.editedAt = new Date();
  }
});

export const ProjectNote = mongoose.model('ProjectNote', projectNoteSchema);