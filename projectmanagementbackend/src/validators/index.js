import { AvailableTaskStatues } from '#utils/constants.js';
import { body, param } from 'express-validator';

//
// COMMON VALIDATORS
//

const mongoIdParam = (field) =>
  param(field).isMongoId().withMessage(`Invalid ${field}`);

const projectIdValidator = () => [mongoIdParam('projectId')];

//
// USER VALIDATORS
//

const userRegisterValidator = () => [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email'),

  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLowercase().withMessage('Username must be lowercase')
    .isLength({ min: 3 }).withMessage('Min 3 chars required')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Letters, numbers and underscore only'),

  body('password')
    .trim()
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),

  // Accept both fullName and fullname from frontend
  body('fullname').optional().trim(),
  body('fullName').optional().trim(),
];

const userLoginValidator = () => [
  body().custom((_, { req }) => {
    if (!req.body.email && !req.body.username) {
      throw new Error('Email or username required');
    }
    return true;
  }),

  body('email').optional().isEmail(),
  body('username').optional().notEmpty(),
  body('password').notEmpty().isLength({ min: 6 }),
];

const userChangeCurrentPasswordValidator = () => [
  body('oldPassword').notEmpty(),
  body('newPassword').notEmpty().isLength({ min: 8 }),
];

const userForgotPasswordValidator = () => [
  body('email').notEmpty().isEmail(),
];

const userResetForgotPasswordValidator = () => [
  body('newPassword').notEmpty().isLength({ min: 8 }),
];

// Email verification is a 6-digit OTP (see EmailOtpPolicy in utils/constants)
const userVerifyEmailOtpValidator = () => [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email'),

  body('otp')
    .trim()
    .notEmpty().withMessage('Verification code is required')
    .isNumeric().withMessage('Code must be 6 digits')
    .isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits'),
];

const userResendEmailOtpValidator = () => [
  body('email').trim().notEmpty().isEmail().withMessage('Valid email required'),
];

//
// PROJECT VALIDATORS
//

const createProjectValidator = () => [
  body('name').trim().notEmpty().withMessage('Project name is required'),
  body('description').optional(),
];

const updateProjectValidator = () => [
  mongoIdParam('projectId'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('description').optional(),
];

const addMemberToProjectValidator = () => [
  mongoIdParam('projectId'),
  body('email').trim().notEmpty().isEmail().withMessage('Valid email required'),
  body('role').notEmpty().isIn(['project_admin', 'member']).withMessage('Role must be \'project_admin\' or \'member\''),
];

//
// NOTE VALIDATORS
//

const createNoteValidator = () => [
  mongoIdParam('projectId'),
  body('content').trim().notEmpty().withMessage('Content required'),
];

const updateNoteValidator = () => [
  mongoIdParam('projectId'),
  mongoIdParam('noteId'),  // Fixed: was 'noteId', consistent with route param
  body('content').optional().trim().notEmpty().withMessage('Content cannot be empty'),
];

//
// TASK VALIDATORS
//

const createTaskValidator = () => [
  mongoIdParam('projectId'),
  body('title').trim().notEmpty().withMessage('Title required'),
  body('description').optional().isString(),
  body('assignedTo').optional().isMongoId(),
  body('status').optional().isIn(AvailableTaskStatues),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH']),
];

const updateTaskValidator = () => [
  mongoIdParam('projectId'),
  mongoIdParam('taskId'),
  body('title').optional().trim().notEmpty(),
  body('description').optional().isString(),
  // values: 'null' → undefined AND null skip validation, so `assignedTo: null`
  // clears the assignment (unassign) instead of 400ing on isMongoId().
  body('assignedTo').optional({ values: 'null' }).isMongoId(),
  body('status').optional().isIn(AvailableTaskStatues),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH']),
];

const getTaskValidator = () => [
  mongoIdParam('projectId'),
  mongoIdParam('taskId'),
];

const getTasksValidator = () => [mongoIdParam('projectId')];

//
// SUBTASK VALIDATORS
//

const createSubTaskValidator = () => [
  mongoIdParam('projectId'),
  mongoIdParam('taskId'),
  body('title').trim().notEmpty().withMessage('Title required'),
];

const updateSubTaskValidator = () => [
  mongoIdParam('projectId'),
  mongoIdParam('taskId'),
  mongoIdParam('subTaskId'),
  body('title').optional().trim().notEmpty(),
  body('isCompleted').optional().isBoolean(),
];

const deleteSubTaskValidator = () => [
  mongoIdParam('projectId'),
  mongoIdParam('taskId'),
  mongoIdParam('subTaskId'),
];

//
// EXPORTS
//

export {
  createProjectValidator,
  updateProjectValidator,
  addMemberToProjectValidator,
  projectIdValidator,
  userRegisterValidator,
  userLoginValidator,
  userChangeCurrentPasswordValidator,
  userForgotPasswordValidator,
  userResetForgotPasswordValidator,
  userVerifyEmailOtpValidator,
  userResendEmailOtpValidator,
  createNoteValidator,
  updateNoteValidator,
  createTaskValidator,
  updateTaskValidator,
  getTaskValidator,
  getTasksValidator,
  createSubTaskValidator,
  updateSubTaskValidator,
  deleteSubTaskValidator,
};
