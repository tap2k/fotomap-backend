module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET', 'vl2rR+G9lEi8vl6J23zy3A=='),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT', 'PhbBQsqyHvsr0hZHjZy3fA=='),
  },
});
