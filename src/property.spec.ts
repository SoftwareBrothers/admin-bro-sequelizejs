/* eslint-disable @typescript-eslint/no-var-requires */
import chai, { expect } from 'chai'
import sinonChai from 'sinon-chai'
import isPostgres from './utils/is-postgres'
import { AvailableTestModels } from './utils/available-test-models'

import Property from './property'

chai.use(sinonChai)

const db = require('../models/index.js')

const getRawProperty = (modelName: AvailableTestModels, propertyName) => {
  const model = db.sequelize.models[modelName]
  const propertyAttrs = model.attributes || model.rawAttributes
  return propertyAttrs[propertyName]
}

describe('Property', () => {
  describe('#isArray', () => {
    it('returns false for regular (not arrayed) property', () => {
      const property = new Property(getRawProperty('User', 'email'))
      expect(property.isArray()).to.equal(false)
    })

    if (isPostgres()) {
      it('returns true for array property', () => {
        const property = new Property(getRawProperty('User', 'arrayed'))
        expect(property.isArray()).to.equal(true)
      })
    }
  })

  describe('#type', () => {
    it('returns correct string type', () => {
      const property = new Property(getRawProperty('User', 'firstName'))
      expect(property.type()).to.equal('string')
    })

    it('returns correct integer type', () => {
      const property = new Property(getRawProperty('User', 'id'))
      expect(property.type()).to.equal('number')
    })

    it('returns correct date type', () => {
      const property = new Property(getRawProperty('User', 'createdAt'))
      expect(property.type()).to.equal('datetime')
    })

    if (isPostgres()) {
      it('returns string when property is an array of strings', () => {
        const property = new Property(getRawProperty('User', 'arrayed'))
        expect(property.type()).to.equal('string')
      })
    }
  })

  describe('#availableValues', () => {
    it('returns null for all standard (Non enum) values', () => {
      const property = new Property(getRawProperty('User', 'email'))
      expect(property.availableValues()).to.equal(null)
    })

    it('returns array of values for the enum field', () => {
      const property = new Property(getRawProperty('User', 'gender'))
      expect(property.availableValues()).to.deep.equal(['male', 'female'])
    })
  })

  describe('#isEditable', () => {
    it('returns false for UUID property', () => {
      const property = new Property(getRawProperty('Comment', 'id'))
      expect(property.isEditable()).to.equal(false)
    })
  })

  describe('#isId', () => {
    it('returns true for id when its default', () => {
      const property = new Property(getRawProperty('User', 'id'))
      expect(property.isId()).to.eq(true)
    })

    it('returns true for id when its uuid', () => {
      const property = new Property(getRawProperty('Comment', 'id'))
      expect(property.isId()).to.eq(true)
    })
  })

  describe('isRequired', () => {
    it('returns true for required fields', () => {
      const property = new Property(getRawProperty('User', 'email'))
      expect(property.isRequired()).to.equal(true)
    })

    it('returns false for not required fields', () => {
      const property = new Property(getRawProperty('User', 'gender'))
      expect(property.isRequired()).to.eq(false)
    })
  })
})
