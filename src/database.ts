import { BaseDatabase, BaseResource } from 'admin-bro';
import { Sequelize } from 'sequelize';

import Resource from './resource';

class Database extends BaseDatabase {
  private sequelize: Sequelize

  static isAdapterFor(database: any): boolean {
    return (database.sequelize
            && database.sequelize.constructor.name === 'Sequelize')
           || database.constructor.name === 'Sequelize';
  }

  constructor(database: any) {
    super(database);
    this.sequelize = database.sequelize || database;
  }

  resources(): Array<BaseResource> {
    return Object.keys(this.sequelize.models).map((key) => (
      new Resource(this.sequelize.models[key])
    ));
  }
}

export default Database;
