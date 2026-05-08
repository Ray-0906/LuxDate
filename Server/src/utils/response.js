/**
 * Standardized API response helper.
 * Every endpoint returns the same envelope shape.
 */
const ApiResponse = {
  success(res, { data = null, message = 'Success', statusCode = 200 } = {}) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  },

  created(res, { data = null, message = 'Created successfully' } = {}) {
    return ApiResponse.success(res, { data, message, statusCode: 201 });
  },

  paginated(res, { data = [], total = 0, page = 1, limit = 20, message = 'Success' } = {}) {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  },

  error(res, { message = 'Something went wrong', statusCode = 500, errors = null } = {}) {
    const body = {
      success: false,
      message,
    };
    if (errors) body.errors = errors;
    return res.status(statusCode).json(body);
  },

  noContent(res) {
    return res.status(204).send();
  },
};

export default ApiResponse;
