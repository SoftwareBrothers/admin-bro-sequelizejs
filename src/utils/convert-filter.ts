import escape from 'escape-regexp'
import {
  Op,
} from 'sequelize'

const convertFilter = (filter) => {
  if (!filter) {
    return {}
  }
  return filter.reduce((memo, filterProperty) => {
    const { property, value, path: filterPath } = filterProperty
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, index] = filterPath.split('.')
    const isArray = typeof index !== 'undefined' && !Number.isNaN(Number(index))
    const previousValue = memo[property.name()] || {}
    switch (property.type()) {
    case 'string': {
      if (property.sequelizePath.values) {
        return {
          [property.name()]: { [Op.eq]: `${escape(value)}` },
          ...memo,
        }
      }
      if (isArray) {
        return {
          ...memo,
          [property.name()]: {
            [Op.in]: [
              ...(previousValue[Op.in] || []),
              escape(value),
            ],
          },
        }
      }
      return {
        ...memo,
        [Op.and]: [
          ...(memo[Op.and] || []),
          {
            [property.name()]: {
              [Op.like as unknown as string]: `%${escape(value)}%`,
            },
          },
        ],
      }
    }
    case 'number': {
      if (!Number.isNaN(Number(value))) {
        if (isArray) {
          return {
            ...memo,
            [property.name()]: {
              [Op.in]: [
                ...(previousValue[Op.in] || []),
                Number(value),
              ],
            },
          }
        }
        return {
          [property.name()]: Number(value),
          ...memo,
        }
      }
      return memo
    }
    case 'date':
    case 'datetime': {
      if (value.from || value.to) {
        return {
          [property.name()]: {
            ...value.from && { [Op.gte]: value.from },
            ...value.to && { [Op.lte]: value.to },
          },
          ...memo,
        }
      }
      break
    }
    default:
      break
    }
    if (isArray) {
      return {
        ...memo,
        [property.name()]: {
          [Op.in]: [
            ...(previousValue[Op.in] || []),
            value,
          ],
        },
      }
    }
    return {
      [property.name()]: value,
      ...memo,
    }
  }, {})
}

export default convertFilter
