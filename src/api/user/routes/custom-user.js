module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/createSupabaseUser',
      handler: 'user.createSupabaseUser',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/getUserPlan',
      handler: 'user.getUserPlan',
    },
    {
      method: 'PUT',
      path: '/updateUserPlan',
      handler: 'user.updateUserPlan',
      config: {
        auth: false,
      },
    },
  ],
};
