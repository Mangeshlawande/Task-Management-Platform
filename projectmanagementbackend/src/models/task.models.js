import mongoose, { Schema } from 'mongoose';

import {
  
  AvailableTaskStatues,
  TaskStatusEnum,
} from '#utils/constants.js';



const taskSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: AvailableTaskStatues,
      default: TaskStatusEnum.TODO,
      index: true,
    },

    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM',
    },

    dueDate: {
      type: Date,
    },

    attachments: {
      type: [
        {
          url: {
            type: String,
            required: true,
          },

          localPath: {
            type: String,
          },

          mimeType: {
            type: String,
          },

          size: {
            type: Number,
          },
        },
      ],

      default: [],
    },
  },

  {
    timestamps: true,
  }
);

taskSchema.index({
  project: 1,
  status: 1,
});

export const Task = mongoose.model('Task', taskSchema);