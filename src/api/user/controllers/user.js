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

  async updateUserPlan(ctx) {
    if (!process.env.TIER_ENFORCEMENT) return ctx.send({ ok: true });

    // This route is auth:false because the Stripe webhook (which calls it) has
    // no user JWT. Authenticate it with a shared secret instead. When
    // WEBHOOK_SECRET is set, the matching header is required; otherwise the
    // check is skipped so existing deployments keep working until configured.
    const expectedSecret = process.env.WEBHOOK_SECRET;
    if (expectedSecret) {
      const provided = ctx.request.headers['x-webhook-secret'] || '';
      const a = Buffer.from(String(provided));
      const b = Buffer.from(expectedSecret);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return ctx.unauthorized('Invalid webhook secret');
      }
    }

    const { userId, plan, stripeCustomerId, stripeSubscriptionId, billingInterval } = ctx.request.body;
    if (!userId) return ctx.badRequest('Missing userId');

    const data = {};
    if (plan) {
      const validPlans = ['free', 'starter', 'pro', 'enterprise'];
      if (!validPlans.includes(plan)) return ctx.badRequest('Invalid plan');
      data.plan = plan;
    }
    if (stripeCustomerId !== undefined) data.stripeCustomerId = stripeCustomerId;
    if (stripeSubscriptionId !== undefined) data.stripeSubscriptionId = stripeSubscriptionId;
    if (billingInterval) data.billingInterval = billingInterval;

    if (Object.keys(data).length === 0) return ctx.badRequest('No fields to update');

    try {
      await strapi.entityService.update('plugin::users-permissions.user', userId, { data });
      return ctx.send({ ok: true });
    } catch (err) {
      console.error('updateUserPlan error:', err);
      return ctx.internalServerError('Failed to update plan');
    }
  },

  async getUserPlan(ctx) {
    if (!process.env.TIER_ENFORCEMENT) return ctx.send(null);

    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('Not authenticated');

    const user = await strapi.config.functions.getUserWithPlan(userId);
    if (!user) return ctx.notFound('User not found');

    const tierConfig = strapi.config.functions.getUserTierConfig(user);
    const storageMB = await strapi.config.functions.calculateUserTotalStorage(userId);
    const channelCount = await strapi.config.functions.countUserChannels(userId);

    return ctx.send({
      plan: user.plan || 'free',
      billingInterval: user.billingInterval || 'monthly',
      stripeCustomerId: user.stripeCustomerId || null,
      tierConfig,
      usage: { storageMB, channelCount },
    });
  },
};
