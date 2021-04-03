/* eslint-disable no-param-reassign */
import { unflatten } from 'flat';
import { BaseResource, BaseRecord, BaseProperty, Filter } from 'admin-bro';
import { Op } from 'sequelize';

import { Model, ModelAttributeColumnOptions } from 'sequelize/types';
import Property from './property';
import convertFilter from './utils/convert-filter';
import createValidationError from './utils/create-validation-error';

const SEQUELIZE_VALIDATION_ERROR = 'SequelizeValidationError';
const SEQUELIZE_UNIQUE_ERROR = 'SequelizeUniqueConstraintError';

// this fixes problem with unbound this when you setup type of Mode as a member of another
// class: https://stackoverflow.com/questions/55166230/sequelize-typescript-typeof-model
type Constructor<T> = new (...args: any[]) => T;
export type ModelType<T extends Model<T>> = Constructor<T> & typeof Model;

type FindOptions = {
  limit?: number;
  offset?: number;
  sort?: {
    sortBy?: string;
    direction?: 'asc' | 'desc';
  };
}

class Resource extends BaseResource {
  private SequelizeModel: ModelType<any>

  static isAdapterFor(rawResource): boolean {
    return rawResource.sequelize && rawResource.sequelize.constructor.name === 'Sequelize';
  }

  constructor(SequelizeModel: typeof Model) {
    super(SequelizeModel);
    this.SequelizeModel = SequelizeModel as ModelType<any>;
  }

  rawAttributes(): Record<string, ModelAttributeColumnOptions> {
    // different sequelize versions stores attributes in different places
    // .rawAttributes => sequelize ^5.0.0
    // .attributes => sequelize ^4.0.0
    return ((this.SequelizeModel as any).attributes
      || (this.SequelizeModel as any).rawAttributes) as Record<string, ModelAttributeColumnOptions>;
  }

  databaseName(): string {
    return (this.SequelizeModel.sequelize as any).options.database
      || (this.SequelizeModel.sequelize as any).options.host;
  }

  databaseType(): string {
    return (this.SequelizeModel.sequelize as any).options.dialect;
  }

  name(): string {
    return this.SequelizeModel.tableName;
  }

  id(): string {
    return this.SequelizeModel.tableName;
  }

  properties(): Array<BaseProperty> {
    return Object.keys(this.rawAttributes()).map((key) => (
      new Property(this.rawAttributes()[key])
    ));
  }

  property(path: string): BaseProperty | null {
    const nested = path.split('.');

    // if property is an array return the array property
    if (nested.length > 1 && this.rawAttributes()[nested[0]]) {
      return new Property(this.rawAttributes()[nested[0]]);
    }

    if (!this.rawAttributes()[path]) {
      return null;
    }
    return new Property(this.rawAttributes()[path]);
  }

  async count(filter: Filter) {
    return this.SequelizeModel.count(({
      where: convertFilter(filter),
    }));
  }

  primaryKey(): string {
    return (this.SequelizeModel as any).primaryKeyField || this.SequelizeModel.primaryKeyAttribute;
  }

  async populate(baseRecords, property): Promise<Array<BaseRecord>> {
    const ids = baseRecords.map((baseRecord) => (
      baseRecord.param(property.name())
    ));
    const records = await this.SequelizeModel.findAll({
      where: { [this.primaryKey()]: ids },
    });
    const recordsHash = records.reduce((memo, record) => {
      memo[record[this.primaryKey()]] = record;
      return memo;
    }, {});
    baseRecords.forEach((baseRecord) => {
      const id = baseRecord.param(property.name());
      if (recordsHash[id]) {
        const referenceRecord = new BaseRecord(
          recordsHash[id].toJSON(), this as unknown as BaseResource,
        );
        baseRecord.populated[property.name()] = referenceRecord;
      }
    });
    return baseRecords;
  }

  async find(filter, { limit = 20, offset = 0, sort = {} }: FindOptions) {
    const { direction, sortBy } = sort;
    const sequelizeObjects = await this.SequelizeModel
      .findAll({
        where: convertFilter(filter),
        limit,
        offset,
        order: [[sortBy as string, (direction || 'asc').toUpperCase()]],
      });
    return sequelizeObjects.map((sequelizeObject) => new BaseRecord(sequelizeObject.toJSON(), this));
  }

  async findOne(id): Promise<BaseRecord | null> {
    const sequelizeObject = await this.findById(id);
    if (!sequelizeObject) {
      return null;
    }
    return new BaseRecord(sequelizeObject.toJSON(), this);
  }

  async findMany(ids) {
    const sequelizeObjects = await this.SequelizeModel.findAll({
      where: {
        [this.primaryKey()]: { [Op.in]: ids },
      },
    });
    return sequelizeObjects.map((sequelizeObject) => new BaseRecord(sequelizeObject.toJSON(), this));
  }

  async findById(id) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore versions of Sequelize before 5 had findById method - after that there was findByPk
    const method = this.SequelizeModel.findByPk ? 'findByPk' : 'findById';
    return this.SequelizeModel[method](id);
  }

  async create(params): Promise<Record<string, any>> {
    const parsedParams = this.parseParams(params);
    const unflattedParams = unflatten(parsedParams);
    try {
      const record = await this.SequelizeModel.create(unflattedParams);
      return record.toJSON();
    } catch (error) {
      if (error.name === SEQUELIZE_VALIDATION_ERROR) {
        throw createValidationError(error);
      }
      if (error.name === SEQUELIZE_UNIQUE_ERROR) {
        throw createValidationError(error);
      }
      throw error;
    }
  }

  async update(id, params) {
    const parsedParams = this.parseParams(params);
    const unflattedParams = unflatten(parsedParams);
    try {
      await this.SequelizeModel.update(unflattedParams, {
        where: {
          [this.primaryKey()]: id,
        },
        individualHooks: true,
        hooks: false,
      });
      const record = await this.findById(id);
      return record.toJSON();
    } catch (error) {
      if (error.name === SEQUELIZE_VALIDATION_ERROR) {
        throw createValidationError(error);
      }
      if (error.name === SEQUELIZE_UNIQUE_ERROR) {
        throw createValidationError(error);
      }
      throw error;
    }
  }

  async delete(id): Promise<void> {
    // we find first because we need to invoke destroy on model, so all hooks
    // instance hooks (not bulk) are called.
    // We cannot set {individualHooks: true, hooks: false} in this.SequelizeModel.destroy,
    // as it is in #update method because for some reason it wont delete the record
    const model = await this.SequelizeModel.findByPk(id);
    await model.destroy();
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
    const parsedParams = { ...params };
    this.properties().forEach((property) => {
      const value = parsedParams[property.name()];
      if (value === '') {
        if (property.isArray() || property.type() !== 'string') {
          delete parsedParams[property.name()];
        }
      }
      if (!property.isEditable()) {
        delete parsedParams[property.name()];
      }
    });
    return parsedParams;
  }
}

export default Resource;
