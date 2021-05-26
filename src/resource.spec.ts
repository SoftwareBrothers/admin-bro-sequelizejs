/* eslint-disable @typescript-eslint/no-var-requires */
import { ValidationError, Filter, BaseRecord } from 'admin-bro'

import chai, { expect } from 'chai'
import sinonChai from 'sinon-chai'
import sinon from 'sinon'

import isPostgres from './utils/is-postgres'
import Resource, { ModelType } from './resource'
import Property from './property'

chai.use(sinonChai)

const config = require('../config/config')[process.env.NODE_ENV as string]
const db = require('../models/index.js')

describe('Resource', function () {
  let SequelizeModel: ModelType<any>
  let resource: Resource

  before(function () {
    SequelizeModel = db.sequelize.models.User
    resource = new Resource(SequelizeModel)
  })

  afterEach(async function () {
    await SequelizeModel.destroy({ where: {} })
  })

  describe('.isAdapterFor', () => {
    it('returns true when sequelize model is given', function () {
      expect(Resource.isAdapterFor(SequelizeModel)).to.equal(true)
    })
  })

  describe('#database', () => {
    it('returns correct database name', function () {
      expect(resource.databaseName()).to.equal(config.database)
    })
  })

  describe('#databaseType', () => {
    it('returns correct database', function () {
      expect(resource.databaseType()).to.equal(config.dialect)
    })
  })

  describe('#name', () => {
    it('returns correct name', function () {
      expect(resource.name()).to.equal('Users')
    })
  })

  describe('#id', () => {
    it('returns correct name', function () {
      expect(resource.id()).to.equal('Users')
    })
  })

  describe('#properties', () => {
    it('returns all properties', function () {
      // there are 7 or 8 (postgres array) properties in the User model (5 regular + __v and _id)
      const length = isPostgres() ? 8 : 7
      expect(resource.properties()).to.have.lengthOf(length)
    })
  })

  describe('#property', () => {
    it('returns given property', function () {
      expect(resource.property('email')).to.be.an.instanceOf(Property)
    })

    it('returns null when property doesn\'t exit', function () {
      expect(resource.property('some.imagine.property')).to.be.null
    })

    if (isPostgres()) {
      it('returns nested property for array field', function () {
        const property = resource.property('arrayed.1')

        expect(property).to.be.an.instanceOf(Property)
        expect(property?.type()).to.equal('string')
      })
    }
  })

  describe('#findMany', () => {
    it('returns array of BaseRecords', async function () {
      const params = await resource.create({ email: 'john.doe@softwarebrothers.co' })

      const records = await resource.findMany([params.id])

      expect(records).to.have.lengthOf(1)
      expect(records[0]).to.be.instanceOf(BaseRecord)
    })
  })

  describe('#find with filter', () => {
    beforeEach(async function () {
      this.params = {
        gender: 'male',
        email: 'john.doe@softwarebrothers.co',
      }
      this.record = await resource.create(this.params)
    })

    it('returns 1 BaseRecord when filtering on ENUMS', async function () {
      const filter = new Filter({
        gender: 'male',
      }, resource)
      const records = await resource.find(filter, { limit: 20, offset: 0, sort: { direction: 'asc', sortBy: 'id' } })

      expect(records).to.have.lengthOf(1)
      expect(records[0]).to.be.instanceOf(BaseRecord)
      expect(records[0].params.gender).to.equal('male')
    })

    it('returns 0 BaseRecord when filtering on ENUMS', async function () {
      const filter = new Filter({
        gender: 'female',
      }, resource)
      const records = await resource.find(filter, { limit: 20, offset: 0, sort: { direction: 'asc', sortBy: 'id' } })

      expect(records).to.have.lengthOf(0)
    })

    it('returns error when filtering on ENUMS with invalid value', async function () {
      const filter = new Filter({
        gender: 'XXX',
      }, resource)
      try {
        await resource.find(filter, { limit: 20, offset: 0, sort: { direction: 'asc', sortBy: 'id' } })
      } catch (error) {
        expect(error.name).to.eq('SequelizeDatabaseError')
      }
    })
  })

  describe('#count', () => {
    it('returns 0 when there are none elements', async function () {
      const count = await resource.count(new Filter({} as any, {} as any))
      expect(count).to.equal(0)
    })

    it('returns given count without filters', async function () {
      await resource.create({ email: 'john.doe@softwarebrothers.co' })
      expect(await resource.count(new Filter({} as any, {} as any))).to.equal(1)
    })

    it('returns given count for given filters', async function () {
      await resource.create({
        firstName: 'john',
        lastName: 'doe',
        email: 'john.doe@softwarebrothers.co',
      })
      await resource.create({
        firstName: 'andrew',
        lastName: 'golota',
        email: 'andrew.golota@softwarebrothers.co',
      })
      const filter = new Filter({
        email: 'andrew.golota@softwarebrothers.co',
      }, resource)
      expect(await resource.count(filter)).to.equal(1)
    })
  })

  describe('#create', () => {
    context('correct record', () => {
      beforeEach(async function () {
        this.params = {
          firstName: 'john',
          lastName: 'doe',
          email: 'john.doe@softwarebrothers.co',
        }
        this.record = await resource.create(this.params)
      })

      it('creates new user when data is valid', async function () {
        const newCount = await resource.count(null as any)
        expect(newCount).to.equal(1)
      })

      it('returns an object', function () {
        expect(this.record).to.be.an.instanceof(Object)
      })
    })

    context('record with errors', () => {
      beforeEach(async function () {
        this.params = {
          firstName: '',
          lastName: 'doe',
          email: 'john.doe.co',
        }
      })

      it('throws validation error', async function () {
        try {
          await resource.create(this.params)
        } catch (error) {
          expect(error).to.be.an.instanceOf(ValidationError)
        }
      })
    })

    context('record with empty id field', () => {
      beforeEach(function () {
        SequelizeModel = db.sequelize.models.Post
        resource = new Resource(SequelizeModel)
      })

      it('creates record without an error', async function () {
        this.params = {
          title: 'some title',
          description: 'doe',
          publishedAt: '2019-12-10 12:00',
          userId: '',
        }
        this.recordParams = await resource.create(this.params)
        expect(this.recordParams.userId).to.be.oneOf([null, undefined])
      })
    })
  })

  describe('#update', () => {
    beforeEach(async function () {
      SequelizeModel = db.sequelize.models.User
      resource = new Resource(SequelizeModel)
      this.params = {
        firstName: 'john',
        lastName: 'doe',
        email: 'john.doe@softwarebrothers.co',
      }
      this.record = await resource.create(this.params)
    })

    it('updates the title', async function () {
      this.newEmail = 'w@k.pl'
      const params = await resource.update(this.record.id, {
        email: this.newEmail,
      })

      expect(params.email).to.equal(this.newEmail)
    })

    it('calls update hooks', async function () {
      const beforeUpdateSpy = sinon.spy()
      const afterUpdateSpy = sinon.spy()
      const beforeBulkUpdateSpy = sinon.spy()
      SequelizeModel.addHook('beforeUpdate', beforeUpdateSpy)
      SequelizeModel.addHook('beforeBulkUpdate', beforeBulkUpdateSpy)
      SequelizeModel.addHook('afterUpdate', afterUpdateSpy)

      await resource.update(this.record.id, { firstName: 'jack' })

      expect(beforeUpdateSpy).to.have.been.called
      expect(afterUpdateSpy).to.have.been.called
      expect(beforeBulkUpdateSpy).not.to.have.been.called
    })
  })

  describe('#delete', () => {
    beforeEach(async function () {
      SequelizeModel = db.sequelize.models.User
      resource = new Resource(SequelizeModel)
      this.params = {
        firstName: 'john',
        lastName: 'doe',
        email: 'john.doe@softwarebrothers.co',
      }
      this.record = await resource.create(this.params)
    })

    it('deletes the resource', async function () {
      await resource.delete(this.record.id)

      const newRecord = await resource.findOne(this.record.id)

      expect(newRecord).to.be.null
    })

    it('calls delete hooks', async function () {
      const beforeDestroySpy = sinon.spy()
      const afterDestroySpy = sinon.spy()
      const beforeDestroyUpdateSpy = sinon.spy()
      SequelizeModel.addHook('beforeDestroy', beforeDestroySpy)
      SequelizeModel.addHook('beforeBulkDestroy', beforeDestroyUpdateSpy)
      SequelizeModel.addHook('afterDestroy', afterDestroySpy)

      await resource.delete(this.record.id)

      expect(beforeDestroySpy).to.have.been.called
      expect(afterDestroySpy).to.have.been.called
      expect(beforeDestroyUpdateSpy).not.to.have.been.called
    })
  })
})
