module.exports = {
  // Database Configuration
  postgres: {
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgrespassword',
    database: process.env.POSTGRES_DB || 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432
  },

  // Hasura Configuration
  hasura: {
    adminSecret: process.env.HASURA_GRAPHQL_ADMIN_SECRET || 'myadminsecretkey',
    metadataDatabaseUrl: process.env.HASURA_GRAPHQL_METADATA_DATABASE_URL || 'postgres://postgres:postgrespassword@postgres:5432/postgres',
    databaseUrl: process.env.PG_DATABASE_URL || 'postgres://postgres:postgrespassword@postgres:5432/postgres',
    endpoint: process.env.HASURA_ENDPOINT || 'http://localhost:8080/v1/graphql'
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  // Server Configuration
  server: {
    port: process.env.PORT || 3000
  }
};
