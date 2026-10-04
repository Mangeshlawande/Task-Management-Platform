export const UserRoleEnum = {
  ADMIN: 'admin',
  PROJECT_ADMIN: 'project_admin',
  MEMBER: 'member',
};

//array
export const AvailableUserRole = Object.values(UserRoleEnum);

//object
export const TaskStatusEnum = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
};

// array
export const AvailableTaskStatues = Object.values(TaskStatusEnum);

// Email verification is a 6-digit OTP — these rules are shared by the
// User model (generation/validation) and the auth controllers (gating).
export const EmailOtpPolicy = {
  codeLength: 6,
  ttlMs: 10 * 60 * 1000, // code lifetime
  maxAttempts: 5, // wrong guesses before the code is burned
  resendCooldownMs: 60 * 1000, // minimum gap between resend requests
};
