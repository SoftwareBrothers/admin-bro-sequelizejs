const GENDER_CHOICES = {
  MALE: 'male',
  FEMALE: 'female',
}

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      firstName: {
        type: Sequelize.STRING,
      },
      lastName: {
        type: Sequelize.STRING,
      },
      gender: {
        type: Sequelize.ENUM({
          values: Object.values(GENDER_CHOICES),
        }),
      },
      email: {
        type: Sequelize.STRING,
      },
      ...(process.env.DATABASE_DIALECT === 'postgres'
        ? { arrayed: { type: Sequelize.ARRAY(Sequelize.STRING) } }
        : {}),
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    })
  },
  down: (queryInterface) => queryInterface.dropTable('Users'),
}
