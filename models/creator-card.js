const { ModelSchema, SchemaTypes, DatabaseModel } = require('@app-core/mongoose');

const modelName = 'creator-cards';

const schemaConfig = {
  _id: { type: SchemaTypes.ULID },
  title: { type: SchemaTypes.String },
  description: { type: SchemaTypes.String },
  slug: { type: SchemaTypes.String, unique: true, index: true },
  creator_reference: { type: SchemaTypes.String },
  links: [
    {
      title: { type: SchemaTypes.String },
      url: { type: SchemaTypes.String },
    },
  ],
  service_rates: {
    currency: { type: SchemaTypes.String },
    rates: [
      {
        name: { type: SchemaTypes.String },
        description: { type: SchemaTypes.String },
        amount: { type: SchemaTypes.Number },
      },
    ],
  },
  status: { type: SchemaTypes.String, index: true },
  access_type: { type: SchemaTypes.String },
  access_code: { type: SchemaTypes.String, default: null },
  // Timestamps managed manually by repository-factory (create auto-sets created + updated)
  created: { type: SchemaTypes.Number },
  updated: { type: SchemaTypes.Number },
  // Soft-delete: null = active, Unix ms = deleted
  // We do NOT use paranoid mode — spec requires null (not 0) for active cards
  deleted: { type: SchemaTypes.Number, default: null },
};

const modelSchema = new ModelSchema(schemaConfig, { collection: modelName });

// No paranoid option — we manage deleted manually as null | timestamp
// ULID _id is still auto-enabled because the schema uses SchemaTypes.ULID
module.exports = DatabaseModel.model(modelName, modelSchema);
