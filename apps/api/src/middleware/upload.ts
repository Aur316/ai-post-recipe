import { MAX_UPLOAD_BYTES, UPLOAD_MIME_TYPES } from '@ai-post-recipe/shared'
import multer from 'multer'

import { UnsupportedMediaTypeError } from '../lib/errors.js'

const allowed = new Set<string>(UPLOAD_MIME_TYPES)

export const uploadSingleFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, done) => {
    if (allowed.has(file.mimetype)) return done(null, true)
    done(
      new UnsupportedMediaTypeError(
        `Unsupported file type ${file.mimetype}. Allowed: ${UPLOAD_MIME_TYPES.join(', ')}`,
      ),
    )
  },
}).single('file')
