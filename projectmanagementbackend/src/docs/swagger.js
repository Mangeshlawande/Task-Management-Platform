import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Project Camp API',
      version: '1.0.0',
      description:
        'REST API for Project Camp — a collaborative project management backend. ' +
        'Authentication uses JWT access/refresh tokens delivered as httpOnly cookies ' +
        '(and accepted as Bearer headers). All responses use a uniform envelope: ' +
        '`{ success, message, data, meta }` and errors `{ success, message, errors }`.',
    },
    servers: [
      {
        url: 'http://localhost:{port}/api/v1',
        description: 'Local development',
        variables: {
          port: {
            default: '8000',
            enum: ['8000', '3000', '3001'],
          },
        },
      },
    ],
    tags: [
      { name: 'Health', description: 'Service health checks' },
      { name: 'Auth', description: 'Register, login, tokens, passwords, account' },
      { name: 'Projects', description: 'Project CRUD and members' },
      { name: 'Tasks', description: 'Task and subtask management' },
      { name: 'Notes', description: 'Project notes' },
      { name: 'Dashboard', description: 'Per-project stats' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
          description: 'JWT access token cookie (set by /auth/login)',
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Alternative to cookies — Authorization: Bearer <accessToken>',
        },
      },
      responses: {
        ValidationError: {
          description: 'Validation failed — field errors in `errors`',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        Unauthorized: {
          description: 'Missing, invalid or expired access token',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        Forbidden: {
          description: 'Authenticated but not allowed (role/permission)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        NotFound: {
          description: 'Resource not found (or no membership)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        Conflict: {
          description: 'Duplicate resource',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        TooManyRequests: {
          description:
            'Rate limited — OTP resend cooldown or too many wrong verification codes',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
      schemas: {
        /* ---------- Shared response envelope ---------- */
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Success' },
            data: { type: 'object', nullable: true },
            meta: { type: 'object', nullable: true },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Something went wrong' },
            errors: {
              type: 'object',
              description: 'Field -> list of error messages',
              additionalProperties: { type: 'array', items: { type: 'string' } },
              example: { email: ['Invalid email'] },
            },
          },
        },
        /* ---------- Domain models ---------- */
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '650e6f3b8f1a2c3d4e5f6a7b' },
            username: { type: 'string', example: 'jane_doe' },
            email: { type: 'string', format: 'email', example: 'jane@example.com' },
            fullName: { type: 'string', example: 'Jane Doe' },
            role: { type: 'string', enum: ['admin', 'project_admin', 'member'] },
            isEmailVerified: {
              type: 'boolean',
              description:
                'Absent on accounts created before OTP verification existed — treat missing as verified',
              example: true,
            },
            avatar: {
              type: 'object',
              properties: {
                url: { type: 'string', example: 'https://placehold.co/150x150' },
                localPath: { type: 'string' },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Project: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '650e6f3b8f1a2c3d4e5f6a7c' },
            name: { type: 'string', example: 'Website Redesign' },
            description: { type: 'string', example: 'Marketing site refresh' },
            createdBy: { type: 'string', example: '650e6f3b8f1a2c3d4e5f6a7b' },
            members: { type: 'integer', description: 'Member count (list endpoint only)' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        ProjectMember: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'project_admin', 'member'] },
            user: { $ref: '#/components/schemas/User' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Task: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string', example: 'Design hero section' },
            description: { type: 'string' },
            project: { type: 'string' },
            assignedTo: { $ref: '#/components/schemas/User' },
            assignedBy: { $ref: '#/components/schemas/User' },
            status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
            dueDate: { type: 'string', format: 'date-time', nullable: true },
            attachments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  url: { type: 'string' },
                  localPath: { type: 'string' },
                  mimeType: { type: 'string', example: 'image/png' },
                  size: { type: 'integer' },
                },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        SubTask: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string', example: 'Pick color palette' },
            task: { type: 'string' },
            isCompleted: { type: 'boolean', default: false },
            createdBy: { type: 'string' },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Note: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            project: { type: 'string' },
            createdBy: { $ref: '#/components/schemas/User' },
            content: { type: 'string', example: 'Client prefers minimal design.' },
            isPinned: { type: 'boolean', default: false },
            editedAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        DashboardStats: {
          type: 'object',
          properties: {
            project: { type: 'object' },
            stats: {
              type: 'object',
              properties: {
                todo: { type: 'integer', example: 3 },
                in_progress: { type: 'integer', example: 2 },
                done: { type: 'integer', example: 5 },
                total: { type: 'integer', example: 10 },
              },
            },
            memberCount: { type: 'integer', example: 4 },
            recentTasks: { type: 'array', items: { $ref: '#/components/schemas/Task' } },
          },
        },
        /* ---------- Auth payloads ---------- */
        RegisterRequest: {
          type: 'object',
          required: ['email', 'username', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'jane@example.com' },
            username: { type: 'string', example: 'jane_doe', description: '3-30 chars, letters/numbers/underscore, lowercase' },
            password: { type: 'string', format: 'password', minLength: 8, example: 'Str0ngPass!' },
            fullName: { type: 'string', example: 'Jane Doe', description: 'Optional display name' },
          },
        },
        VerifyEmailOtpRequest: {
          type: 'object',
          required: ['email', 'otp'],
          properties: {
            email: { type: 'string', format: 'email', example: 'jane@example.com' },
            otp: {
              type: 'string',
              description: '6-digit code from the verification email',
              pattern: '^[0-9]{6}$',
              example: '428913',
            },
          },
        },
        ResendOtpRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email', example: 'jane@example.com' },
          },
        },
        LoginRequest: {
          type: 'object',
          description: 'Send either email or username (not both required).',
          properties: {
            email: { type: 'string', format: 'email', example: 'jane@example.com' },
            username: { type: 'string', example: 'jane_doe' },
            password: { type: 'string', format: 'password', example: 'Str0ngPass!' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/User' },
            accessToken: { type: 'string', description: 'Also set as httpOnly cookie' },
            refreshToken: { type: 'string', description: 'Also set as httpOnly cookie' },
          },
        },
        ChangePasswordRequest: {
          type: 'object',
          required: ['oldPassword', 'newPassword'],
          properties: {
            oldPassword: { type: 'string', format: 'password' },
            newPassword: { type: 'string', format: 'password', minLength: 8 },
          },
        },
        ForgotPasswordRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
          },
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['newPassword'],
          properties: {
            newPassword: { type: 'string', format: 'password', minLength: 8 },
          },
        },
        AddMemberRequest: {
          type: 'object',
          required: ['email', 'role'],
          properties: {
            email: { type: 'string', format: 'email', description: 'Registered user email' },
            role: { type: 'string', enum: ['project_admin', 'member'] },
          },
        },
        UpdateMemberRoleRequest: {
          type: 'object',
          required: ['role'],
          properties: {
            role: { type: 'string', enum: ['admin', 'project_admin', 'member'] },
          },
        },
        TaskRequest: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string', example: 'Design hero section' },
            description: { type: 'string' },
            assignedTo: { type: 'string', description: 'User id — must be a project member' },
            status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
            dueDate: { type: 'string', format: 'date-time' },
          },
        },
        SubTaskRequest: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string', example: 'Pick color palette' },
          },
        },
        UpdateSubTaskRequest: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            isCompleted: { type: 'boolean' },
          },
        },
        NoteRequest: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string', maxLength: 5000, example: 'Client prefers minimal design.' },
          },
        },
        UpdateNoteRequest: {
          type: 'object',
          properties: {
            content: { type: 'string', maxLength: 5000 },
            isPinned: { type: 'boolean' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'], // JSDoc-annotated route files
};

export const swaggerSpec = swaggerJsdoc(options);
