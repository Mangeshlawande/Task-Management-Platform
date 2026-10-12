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
