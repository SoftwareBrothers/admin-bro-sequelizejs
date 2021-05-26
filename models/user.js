module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    firstName: {
      type: DataTypes.STRING,
      validate: { len: [3, 20] },
    },
    lastName: DataTypes.STRING,
    gender: DataTypes.ENUM('male', 'female'),
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { isEmail: true },
    },
    ...(process.env.DATABASE_DIALECT === 'postgres'
      ? { arrayed: DataTypes.ARRAY(DataTypes.STRING) }
      : {}),
  }, {})
  User.associate = function (models) {
    User.hasMany(models.Post, { foreignKey: 'userId' })
  }
  return User
}
