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
  ],
};
