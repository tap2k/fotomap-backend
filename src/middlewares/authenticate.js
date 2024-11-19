const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    try {
      // Extract Supabase JWT
      const supabaseToken =
        ctx.request?.headers?.authorization?.split(' ')[1] ||
        ctx.request?.headers?.cookie
          ?.split(';')
          .find(c => c.trim().startsWith('jwt='))
          ?.split('=')[1];

      if (!supabaseToken) {
        return next();
      }

      // Verify Supabase JWT
      const decodedToken = jwt.verify(supabaseToken, JWT_SECRET);

      // Check for user in Strapi
      const [existingUser] = await strapi.entityService.findMany(
        'plugin::users-permissions.user',
        {
          filters: {
            email: decodedToken.email,
            provider: 'supabase',
          },
        }
      );

      if (!existingUser) {
        return next();
      }

      // Fetch the authenticated role ID
      const [authenticatedRole] = await strapi.entityService.findMany(
        'plugin::users-permissions.role',
        {
          filters: { type: 'authenticated' },
          limit: 1,
        }
      );

      // Re-sign the token with Strapi-specific claims
      const strapiJwt = jwt.sign(
        {
          id: existingUser.id,
          email: existingUser.email,
          role: {
            id: authenticatedRole.id,
            name: authenticatedRole.name,
            type: authenticatedRole.type,
          },
        },
        JWT_SECRET,
        { expiresIn: '7d' } // Adjust expiration as needed
      );

      // Set the Authorization header and cookies
      ctx.request.header.authorization = `Bearer ${strapiJwt}`;
      
      // TODO: Dont do this?
      /*ctx.cookies.set('jwt', strapiJwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });*/

      // Update ctx.state.user to ensure Strapi recognizes the user
      ctx.state.user = {
        id: existingUser.id,
        email: existingUser.email,
        role: {
          id: authenticatedRole.id,
          name: authenticatedRole.name,
          type: authenticatedRole.type,
        },
      };

    } catch (error) {
      console.error('Authentication error:', error.message);
      console.log('Continuing as unauthenticated user');
    }

    await next();
  };
};
