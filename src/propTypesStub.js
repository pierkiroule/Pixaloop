const createValidator = () => {
  const validator = () => null;
  validator.isRequired = validator;
  return validator;
};

const PropTypes = {
  func: createValidator(),
  number: createValidator(),
  bool: createValidator(),
  string: createValidator(),
};

export default PropTypes;
