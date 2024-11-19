const jwt = require('jsonwebtoken');
const crypto = require('crypto');

module.exports = {
  async createSupabaseUser(ctx) {
    try {
      // Extract and validate the token
      const authHeader = ctx.request.headers.authorization;

      if (!authHeader) {
        return ctx.unauthorized('Authorization header is missing');
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.decode(token, { complete: true });

      if (!decoded) {
        return ctx.badRequest('Invalid token format');
      }

      const JWT_SECRET = process.env.JWT_SECRET;
      const decodedToken = jwt.verify(token, JWT_SECRET);
      //console.log('Verified Token:', decodedToken);

      const { email, userId } = decodedToken; // Ensure userId is present in token
      if (!email) {
        return ctx.badRequest('Invalid token payload');
      }

      // Check if the user already exists
      const [existingUser] = await strapi.entityService.findMany(
        'plugin::users-permissions.user',
        {
          filters: {
            email,
            provider: 'supabase',
          },
        }
      );

      if (existingUser) {
        // Return the existing user's data
        return ctx.send({
          id: existingUser.id,
          email: existingUser.email,
          username: existingUser.username,
        });
      }

      // Fetch the authenticated role ID
      const authenticatedRole = await strapi.entityService.findMany(
        'plugin::users-permissions.role',
        {
          filters: { type: 'authenticated' },
          limit: 1,
        }
      );

      if (!authenticatedRole || authenticatedRole.length === 0) {
        throw new Error('Authenticated role not found');
      }

      const authenticatedRoleId = authenticatedRole[0].id;

      // Create a new user
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const newUser = await strapi.entityService.create(
        'plugin::users-permissions.user',
        {
          data: {
            username: `${email.split('@')[0]}_${userId}`,
            email,
            provider: 'supabase',
            password: randomPassword,
            confirmed: true,
            role: authenticatedRoleId, // Correctly set the role
          },
        }
      );

      return ctx.created({
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
      });
    } catch (error) {
      console.error('Error creating user:', error);
      return ctx.internalServerError('Unable to create user');
    }
  },
};
