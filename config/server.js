module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('PUBLIC_URL', 'http://mvc.represent.org/strapi'),
  app: {
    keys: env.array('APP_KEYS', ['iSLUu474x26TEqHMvvRE7w==', 'tb/QZ1CGTkDDEQSM62XKrg==']),
  },
});
