module.exports = ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      host: '127.0.0.1',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: 'Mvc12345',
      ssl: false,
    },
  },
});
