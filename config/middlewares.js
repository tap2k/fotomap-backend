module.exports = [
  'strapi::errors',
  {
    name: "strapi::security",
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "connect-src": ["'self'", "https:", "http://localhost:1337"],
          "img-src": [
            "'self'",
            "data:",
            "blob:",
            '*.nyc3.digitaloceanspaces.com',
            'nyc3.digitaloceanspaces.com',
            's3.us-east-005.backblazeb2.com',
            '*.s3.us-east-005.backblazeb2.com',
            'mvcdevcdn.represent.org',
            'mvcprodcdn.represent.org',
            'supabase.co', 
            '*.supabase.co'
          ],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            '*.nyc3.digitaloceanspaces.com',
            'nyc3.digitaloceanspaces.com',
            's3.us-east-005.backblazeb2.com',
            '*.s3.us-east-005.backblazeb2.com',
            'mvcdevcdn.represent.org',
            'mvcprodcdn.represent.org',
            'supabase.co', 
            '*.supabase.co'
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  // Replace the simple 'strapi::cors' with this configuration
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      //origin: ['*'],
      origin: ['https://mvcdev.represent.org', 'https://expressdev.represent.org', 'https://mvcprod.represent.org', 'https://mvc.represent.org', 'https://express.represent.org', 'https://bihar.represent.org', 'https://gujarat.represent.org', 'https://express.maustro.com', 'https://express.ux4.me', 'https://expressdev.ux4.me', 'https://virtualfarm.represent.org', 'https://blogs.cornell.edu', 'http://127.0.0.1:3001', 'http://localhost:3001', 'http://127.0.0.1:1337', 'http://localhost:1337'], // Add your frontend URLs here
      headers: ['*'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    }
  },
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  {
    name: "strapi::body",
    config: {
      formLimit: "1gb",
      jsonLimit: "1gb",
      textLimit: "1gb",
      formidable: {
        maxFileSize: 1000 * 1024 * 1024,
      },
    },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
  'global::authenticate'
];

