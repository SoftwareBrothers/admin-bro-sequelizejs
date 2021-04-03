import { ValidationError } from 'admin-bro';

const createValidationError = (originalError: any): ValidationError => {
  const errors = Object.keys(originalError.errors).reduce((memo, key) => {
    const { path, message, validatorKey } = originalError.errors[key];
    memo[path] = { message, kind: validatorKey }; // eslint-disable-line no-param-reassign
    return memo;
  }, {});
  return new ValidationError(errors);
};

export default createValidationError;
