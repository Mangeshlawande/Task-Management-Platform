export const buildSchema = (fields) => {
  const properties = {};
  const required = [];

  fields.forEach((field) => {
    properties[field.name] = {
      type: field.type || 'string',
      example: field.example || '',
    };

    if (field.required) {
      required.push(field.name);
    }
  });

  return {
    type: 'object',
    properties,
    required,
  };
};
