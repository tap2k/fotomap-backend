module.exports = ({ env }) => ({
  host: env('HOST'),
  url: env("PUBLIC_URL"),
  port: env.int('PORT'),
  app: {
    keys: env.array('APP_KEYS')
  },
});
