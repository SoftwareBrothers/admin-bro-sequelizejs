## admin-bro-sequelizejs

This is an official [AdminBro](https://github.com/SoftwareBrothers/admin-bro) adapter which integrates [sequelize ORM](http://docs.sequelizejs.com/) into admin-bro.

## Usage

The plugin can be registered using standard `AdminBro.registerAdapter` method.

```javascript
const AdminBro = require('admin-bro');
const AdminBroSequelize = require('@admin-bro/sequelize');

AdminBro.registerAdapter(AdminBroSequelize);
```

More options can be found on [AdminBro](https://github.com/SoftwareBrothers/admin-bro) official website.

## Testing

Integration tests require running database. Database connection data are given in `config/config.js`. Make sure you have following env variables set: `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_HOST`, `DATABASE_DIALECT`. Take a look at `config/config.js` to see default values.

Than you will have to create database and run migrations

```
npm run sequelize db:create
npm run sequelize db:migrate
```

## License

AdminBro is Copyright © 2018 SoftwareBrothers.co. It is free software, and may be redistributed under the terms specified in the [LICENSE](LICENSE) file.

## About SoftwareBrothers.co

<img src="https://softwarebrothers.co/assets/images/software-brothers-logo-full.svg" width=240>

We’re an open, friendly team that helps clients from all over the world to transform their businesses and create astonishing products.

- * We are available to [hire](https://softwarebrothers.co/contact).
- * If you want to work for us - checkout the [career page](https://softwarebrothers.co/career).
