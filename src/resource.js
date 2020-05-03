/* eslint-disable no-param-reassign */

const { BaseResource, BaseRecord } = require('admin-bro')
const { Op, DataTypes  } = require('sequelize')

const Property = require('./property')
const convertFilter = require('./utils/convert-filter')
const createValidationError = require('./utils/create-validation-error')

const SEQUELIZE_VALIDATION_ERROR = 'SequelizeValidationError'

class Resource extends BaseResource {
  static isAdapterFor(rawResource) {
    return rawResource.sequelize && rawResource.sequelize.constructor.name === 'Sequelize'
  }

  constructor(SequelizeModel) {
    super(SequelizeModel)
    this.SequelizeModel = SequelizeModel
  }

  rawAttributes() {
    // different sequelize versions stores attributes in different places
    // .rawAttributes => sequelize ^5.0.0
    // .attributes => sequelize ^4.0.0
    return this.SequelizeModel.attributes || this.SequelizeModel.rawAttributes
  }

  databaseName() {
    return this.SequelizeModel.sequelize.options.database
      || this.SequelizeModel.sequelize.options.host
  }

  databaseType() {
    return this.SequelizeModel.sequelize.options.dialect
  }

  name() {
    return this.SequelizeModel.tableName
  }

  id() {
    return this.SequelizeModel.tableName
  }

  properties() {
    return Object.keys(this.rawAttributes()).map(key => (
      new Property(this.rawAttributes()[key])
    ))
  }

  property(path) {
    return new Property(this.rawAttributes()[path])
  }

  async count(filter) {
    return this.SequelizeModel.count(({
      where: convertFilter(filter),
    }))
  }

  async populate(baseRecords, property) {
    const ids = baseRecords.map(baseRecord => (
      baseRecord.param(property.name())
    ))
    const records = await this.SequelizeModel.findAll({
      where: { [this.SequelizeModel.primaryKeyField]: ids },
    })
    const recordsHash = records.reduce((memo, record) => {
      memo[record.id] = record
      return memo
    }, {})
    baseRecords.forEach((baseRecord) => {
      const id = baseRecord.param(property.name())
      if (recordsHash[id]) {
        const referenceRecord = new BaseRecord(
          recordsHash[id].toJSON(), this,
        )
        baseRecord.populated[property.name()] = referenceRecord
      }
    })
    return true
  }

  async find(filter, { limit = 20, offset = 0, sort = {} }) {
    const { direction, sortBy } = sort
    if (this.SequelizeModel.fieldRawAttributesMap[sortBy].type instanceof DataTypes.VIRTUAL) {
      throw new Error(`Cannot sort on VIRTUAL Datatype "${sortBy}" on resource "${this.SequelizeModel.name}"! You can provide a different sort by field to avoid this issue, see: https://adminbro.com/ResourceOptions.html#sort`)
    }
    const sequelizeObjects = await this.SequelizeModel
      .findAll({
        where: convertFilter(filter),
        limit,
        offset,
        order: [[sortBy, (direction || 'asc').toUpperCase()]],
      })
    return sequelizeObjects.map(sequelizeObject => new BaseRecord(sequelizeObject.toJSON(), this))
  }

  async findOne(id) {
    const sequelizeObject = await this.findById(id)
    return new BaseRecord(sequelizeObject.toJSON(), this)
  }

  async findMany(ids) {
    const sequelizeObjects = await this.SequelizeModel.findAll({
      where: {
        [this.SequelizeModel.primaryKeyField]: { [Op.in]: ids },
      },
    })
    return sequelizeObjects.map(sequelizeObject => new BaseRecord(sequelizeObject.toJSON(), this))
  }

  async findById(id) {
    // versions of Sequelize before 5 had findById method - after that there was findByPk
    const method = this.SequelizeModel.findByPk ? 'findByPk' : 'findById'
    return this.SequelizeModel[method](id)
  }

  async create(params) {
    const parsedParams = this.parseParams(params)
    try {
      const record = await this.SequelizeModel.create(parsedParams)
      return record.toJSON()
    } catch (error) {
      if (error.name === SEQUELIZE_VALIDATION_ERROR) {
        throw createValidationError(error)
      }
      throw error
    }
  }

  async update(id, params) {
    const parsedParams = this.parseParams(params)
    try {
      await this.SequelizeModel.update(parsedParams, {
        where: {
          [this.SequelizeModel.primaryKeyField]: id,
        },
      })
      const record = await this.findById(id)
      return record.toJSON()
    } catch (error) {
      if (error.name === SEQUELIZE_VALIDATION_ERROR) {
        throw createValidationError(error)
      }
      throw error
    }
  }

  async delete(id) {
    return this.SequelizeModel.destroy({
      where: {
        [this.SequelizeModel.primaryKeyField]: id,
      },
    })
  }

  /**
   * Check all params against values they hold. In case of wrong value it corrects it.
   *
   * What it does exactly:
   * - removes keys with empty strings for the `number`, `float` and 'reference' properties.
   *
   * @param   {Object}  params  received from AdminBro form
   *
   * @return  {Object}          converted params
   */
  parseParams(params) {
    const parsedParams = { ...params }
    this.properties().forEach((property) => {
      const value = parsedParams[property.name()]
      if (['number', 'float', 'reference'].includes(property.type())) {
        if (value === '') {
          delete parsedParams[property.name()]
        }
      }
      if (!property.isEditable()) {
        delete parsedParams[property.name()]
      }
    })
    return parsedParams
  }
}

module.exports = Resource
