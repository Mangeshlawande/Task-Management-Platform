import { validationResult } from 'express-validator';

import { ApiError } from '#utils/ApiError.js';

export const validate = (req, _, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors = {};

  errors.array().forEach((err) => {
    const field = err.path || err.param;

    if (!extractedErrors[field]) {
      extractedErrors[field] = [];
    }

    extractedErrors[field].push(err.msg);
  });

  return next(
    new ApiError(
      400,
      'Validation failed',
      extractedErrors
    )
  );
};