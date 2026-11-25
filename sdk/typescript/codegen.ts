import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../../django-backend/schema.graphql', // Path to backend schema
  generates: {
    './src/generated/graphql.ts': {
      plugins: ['typescript']
    }
  }
};
export default config;