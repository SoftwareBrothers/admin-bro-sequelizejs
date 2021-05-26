/* eslint-disable no-console */
import { Sequelize } from 'sequelize'
import buildUser from './users/user.entity'
import buildComment from './comments/comment.entity'

const connect = async (): Promise<Sequelize> => {
  const dbName = process.env.DATABASE_NAME || 'adminbro-sequelize'
  const host = process.env.DATABASE_HOST || 'localhost'
  const password = process.env.DATABASE_PASSWORD || 'adminbro'
  const user = process.env.DATABASE_USER || 'adminbro'
  const port = process.env.DATABASE_PORT || 5432

  const sequelize = new Sequelize(
    `postgres://${user}:${password}@${host}:${port}/${dbName}`,
  )

  const User = buildUser(sequelize)
  const Comment = buildComment(sequelize)

  User.hasMany(Comment, { foreignKey: 'userId' })
  Comment.belongsTo(User, { foreignKey: 'userId' })

  try {
    await sequelize.authenticate()
    console.log('Connection has been established successfully.')
  } catch (error) {
    console.error('Unable to connect to the database:', error)
  }

  if (!process.env.SKIP_SYNC) {
    await sequelize.sync({ force: true })
  }
  return sequelize
}

export default connect
