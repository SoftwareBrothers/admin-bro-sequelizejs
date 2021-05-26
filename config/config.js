module.exports = {
  test: {
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    port: process.env.DATABASE_PORT || 5432,
    database: process.env.DATABASE_NAME || 'database_test',
    host: process.env.DATABASE_HOST || 'localhost',
    dialect: process.env.DATABASE_DIALECT || 'postgres',
    logging: false,
  },
}
