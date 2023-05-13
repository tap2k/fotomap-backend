module.exports = ({ env }) => ({
  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: env('SMTP_HOST', 'smtp.gmail.com'),
        port: env('SMTP_PORT', 465),
        auth: {
          user: env('SMTP_USERNAME'),
          pass: env('SMTP_PASSWORD'),
        },
        // ... any custom nodemailer options
      },
      settings: {
        defaultFrom: 'tapan@represent.org',
        defaultReplyTo: 'tapan@represent.org',
      },
    },
  },
  upload: {
    config: {
      provider: "strapi-provider-upload-do",
      providerOptions: {
        key: process.env.DO_SPACE_ACCESS_KEY,
        secret: process.env.DO_SPACE_SECRET_KEY,
        endpoint: process.env.DO_SPACE_ENDPOINT,
        space: process.env.DO_SPACE_BUCKET,
        directory: "mvc_dev", // optional
      },
    },
  },
});
