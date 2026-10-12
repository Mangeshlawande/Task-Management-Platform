# Product Requirements Document (PRD)

## Project Camp Backend

### 1. Product Overview

**Product Name:** Project Camp Backend  
**Version:** 1.0.0  
**Product Type:** Backend API for Project Management System

Project Camp Backend is a RESTful API service designed to support collaborative project management. The system enables teams to organize projects, manage tasks with subtasks, maintain project notes, and handle user authentication with role-based access control.

### 2. Target Users

- **Project Administrators:** Create and manage projects, assign roles, oversee all project activities
- **Project Admins:** Manage tasks and project content within assigned projects
- **Team Members:** View projects, update task completion status, access project information

### 3. Core Features

#### 3.1 User Authentication & Authorization

- **User Registration:** Account creation with **no verification step** — the account is usable (and signed in) immediately; there is no e-mail confirmation anywhere (decision 2026-10-12, replacing the earlier 6-digit OTP)
- **User Login:** Secure authentication with JWT tokens (email or username)
- **Password Management:** Change password from Settings while logged in (no forgot/reset flow — it needs e-mail)
- **Token Management:** Access token refresh mechanism
- **Role-Based Access Control:** Three-tier permission system (Admin, Project Admin, Member)

#### 3.2 Project Management

- **Project Creation:** Create new projects with name and description
- **Project Listing:** View all projects user has access to with member count
- **Project Details:** Access individual project information
- **Project Updates:** Modify project information (Admin only)
- **Project Deletion:** Remove projects (Admin only)

#### 3.3 Team Member Management

- **Member Addition:** Invite users to projects via email
- **Member Listing:** View all project team members
- **Role Management:** Update member roles within projects (Admin only)
- **Member Removal:** Remove team members from projects (Admin only)

#### 3.4 Task Management

- **Task Creation:** Create tasks with title, description, and assignee
- **Task Listing:** View all tasks within a project
- **Task Details:** Access individual task information
- **Task Updates:** Modify task information and status
- **Task Deletion:** Remove tasks from projects
- **File Attachments:** Support for multiple file attachments on tasks
- **Task Assignment:** Assign tasks to specific team members
- **Status Tracking:** Three-state status system (Todo, In Progress, Done)

#### 3.5 Subtask Management

- **Subtask Creation:** Add subtasks to existing tasks
- **Subtask Updates:** Modify subtask details and completion status
- **Subtask Deletion:** Remove subtasks (Admin/Project Admin only)
- **Member Completion:** Allow members to mark subtasks as complete

#### 3.6 Project Notes

- **Note Creation:** Add notes to projects (Admin only)
- **Note Listing:** View all project notes
- **Note Details:** Access individual note content
- **Note Updates:** Modify existing notes (Admin only)
- **Note Deletion:** Remove notes (Admin only)

#### 3.7 System Health

- **Health Check:** API endpoint for system status monitoring

### 4. Technical Specifications

#### 4.1 API Endpoints Structure

**Authentication Routes** (`/api/v1/auth/`)

- `POST /register` - User registration
- `POST /login` - User authentication (email or username)
- `POST /logout` - User logout (secured)
- `GET /me` - Get current user info (secured)
- `DELETE /me` - Delete account (secured)
- `POST /change-password` - Change user password (secured)
- `POST /refresh-token` - Refresh access token

**Removed auth routes** (answer `404`): `POST /forgot-password`,
`POST /reset-password/:resetToken`, `POST /verify-otp`, `POST /resend-otp`.

**Project Routes** (`/api/v1/projects/`)

- `GET /` - List user projects (secured)
- `POST /` - Create project (secured)
- `GET /:projectId` - Get project details (secured, role-based)
- `PUT /:projectId` - Update project (secured, Admin only)
- `DELETE /:projectId` - Delete project (secured, Admin only)
- `GET /:projectId/members` - List project members (secured)
- `POST /:projectId/members` - Add project member (secured, Admin/Project Admin)
- `PUT /:projectId/members/:userId` - Update member role (secured, Admin only)
- `DELETE /:projectId/members/:userId` - Remove member (secured, Admin only)
- `GET /:projectId/dashboard` - Project stats (secured)

**Task Routes** (`/api/v1/projects/:projectId/tasks/`, all secured)

- `GET /` - List project tasks
- `POST /` - Create task (Admin/Project Admin, `multipart/form-data` with `attachments` images)
- `GET /:taskId` - Get task details with subtasks
- `PUT /:taskId` - Update task
- `DELETE /:taskId` - Delete task (cascades subtasks)
- `POST /:taskId/subtasks` - Create subtask
- `PUT /:taskId/subtasks/:subTaskId` - Update subtask / toggle completion
- `DELETE /:taskId/subtasks/:subTaskId` - Delete subtask

**Note Routes** (`/api/v1/projects/:projectId/notes/`, all secured)

- `GET /` - List project notes (paginated, pinned first)
- `POST /` - Create note
- `GET /:noteId` - Get note details
- `PUT /:noteId` - Update note (content, pin)
- `DELETE /:noteId` - Delete note

**Health Check** (`/api/v1/healthcheck/`)

- `GET /` - System health status

#### 4.2 Permission Matrix

| Feature                    | Admin | Project Admin | Member |
| -------------------------- | ----- | ------------- | ------ |
| Create Project             | ✓     | ✗             | ✗      |
| Update/Delete Project      | ✓     | ✗             | ✗      |
| Manage Project Members     | ✓     | ✗             | ✗      |
| Create/Update/Delete Tasks | ✓     | ✓             | ✗      |
| View Tasks                 | ✓     | ✓             | ✓      |
| Update Subtask Status      | ✓     | ✓             | ✓      |
| Create/Delete Subtasks     | ✓     | ✓             | ✗      |
| Create/Update/Delete Notes | ✓     | ✗             | ✗      |
| View Notes                 | ✓     | ✓             | ✓      |

#### 4.3 Data Models

**User Roles:**

- `admin` - Full system access
- `project_admin` - Project-level administrative access
- `member` - Basic project member access

**Task Status:**

- `todo` - Task not started
- `in_progress` - Task currently being worked on
- `done` - Task completed

### 5. Security Features

- JWT-based authentication with refresh token rotation
- httpOnly cookie token delivery (Bearer header also supported)
- Role-based authorization middleware per project
- Input validation on all endpoints
- File upload security with Multer middleware (type + size limits)
- Centralized error handler mapping validation/duplicate/cast errors to 4xx responses
- CORS configuration for cross-origin requests

### 6. File Management

- Up to 5 image attachments per task (multipart field `attachments`)
- Files stored in public/images directory
- Only jpeg, jpg, png and webp allowed; max 1MB per file
- File metadata tracking (URL, MIME type, size)

## 7. Email

**Out of scope — deliberately.** The app sends no e-mail:

- No OTP verification, no password-reset links, no SMTP dependency at all
- `nodemailer` / `mailgen` and `src/utils/mail.js` are not part of the stack
- Sign-up has no confirmation step; forgot-password does not exist

### 8. Success Criteria

- Secure user authentication and authorization system
- Complete project lifecycle management
- Hierarchical task and subtask organization
- Role-based access control implementation
- File attachment capability for enhanced collaboration
- Password-free sign-up path: registration immediately yields a working session (no e-mail verification)
- Comprehensive API documentation through Swagger UI at /api-docs
