import { ApiError } from '#utils/ApiError.js';

const errorHandler = (err, req, res, _next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    // Mongoose schema validation -> 400 with field-level errors
    if (error?.name === 'ValidationError' && error.errors) {
      const fieldErrors = {};
      Object.values(error.errors).forEach((e) => {
        fieldErrors[e.path] = fieldErrors[e.path] || [];
        fieldErrors[e.path].push(e.message);
      });

      error = new ApiError(400, 'Validation failed', fieldErrors);
    }
    // Bad ObjectId / cast failures -> 400
    else if (error?.name === 'CastError') {
      error = new ApiError(400, `Invalid value for '${error.path}'`);
    }
    // Mongo duplicate key -> 409
    else if (error?.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0] || 'field';
      error = new ApiError(409, `Duplicate value for '${field}'`);
    }
    // Multer size/type errors -> 400
    else if (error?.code === 'LIMIT_FILE_SIZE') {
      error = new ApiError(400, 'File too large. Max size is 1MB per image');
    } else if (error?.code === 'LIMIT_UNEXPECTED_FILE') {
      error = new ApiError(400, 'Unexpected file field or too many files');
    }
    // JSON body parse errors -> 400
    else if (error?.type === 'entity.parse.failed') {
      error = new ApiError(400, 'Malformed JSON body');
    }
    // Everything else keeps its own statusCode or becomes a 500
    else {
      error = new ApiError(
        err.statusCode || 500,
        err.statusCode ? err.message : 'Internal Server Error',
        err.errors || [],
        err.stack
      );
    }
  }

  const response = {
    success: false,
    message: error.message,
    errors: error.errors,
  };

  // show stack only in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  return res.status(error.statusCode).json(response);
};

export { errorHandler };