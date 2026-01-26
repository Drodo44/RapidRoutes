// middleware/errorHandler.js
export function errorHandler(err, req, res, next) {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });

  if (err.code === 'PGRST301') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'You do not have permission to perform this action'
    });
  }

  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Duplicate entry',
      message: 'This record already exists'
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      error: 'Invalid reference',
      message: 'Referenced record does not exist'
    });
  }

  return res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message
  });
}
