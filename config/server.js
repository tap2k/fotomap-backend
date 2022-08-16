module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: ['iSLUu474x26TEqHMvvRE7w==', 'tb/QZ1CGTkDDEQSM62XKrg=='],
  },
});
