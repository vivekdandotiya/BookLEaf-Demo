export const successResponse = (res, data, statusCode = 200, meta = null) => {
  const response = {
    success: true,
    data,
  };
  if (meta) {
    response.meta = meta;
  }
  return res.status(statusCode).json(response);
};

export const errorResponse = (
  res,
  message = 'An unexpected error occurred',
  statusCode = 500,
  code = 'INTERNAL_ERROR',
  details = null
) => {
  const response = {
    success: false,
    error: {
      code,
      message,
    },
  };
  if (details) {
    response.error.details = details;
  }
  return res.status(statusCode).json(response);
};
