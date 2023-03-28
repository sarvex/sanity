export const fieldValidationInferReproSharedObject = {
  type: 'object',
  name: 'someObjectType',
  fields: [
    {name: 'first', type: 'string'},
    {name: 'second', type: 'string'},
  ],
}
export const fieldValidationInferReproDoc = {
  name: 'fieldValidationInferReproDoc',
  type: 'document',
  title: 'FieldValidationRepro',
  fieldsets: [{name: 'fieldset', title: 'fieldset', options: {collapsed: true}}],
  fields: [
    {
      name: 'withodutValidation',
      type: 'string',
      fieldset: 'fieldset',
      title: 'Field of someObjectType without validation',
      description: 'First field should not be required',
    },
    {
      name: 'withoutValidfation',
      type: 'string',
      fieldset: 'fieldset',
      title: 'Field of someObjectType without validation',
      description: 'First field should not be required',
    },
    {
      name: 'withoutValisdation',
      type: 'string',
      title: 'Field of someObjectType without validation',
      description: 'First field should not be required',
    },
  ],
}
