import type { ErrorResponse } from '@ai-post-recipe/shared'
import type { ErrorRequestHandler } from 'express'
import multer from 'multer'

import {
  AppError,
  PayloadTooLargeError,
  ValidationError,
} from '../lib/errors.js'

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const error = toAppError(err)

  if (error.status >= 500) req.log.error({ err }, 'Unhandled error')

  const body: ErrorResponse = {
    error: {
      code: error.code,
      message: error.status >= 500 ? 'Internal server error' : error.message,
      details: error.details,
    },
  }
  res.status(error.status).json(body)
}

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err
  if (err instanceof multer.MulterError) {
    return err.code === 'LIMIT_FILE_SIZE'
      ? new PayloadTooLargeError('The file is larger than 10 MB')
      : new ValidationError(err.message)
  }
  return new AppError(500, 'INTERNAL_ERROR', 'Internal server error')
}
