import fs from 'fs'

const openaiModels = [
  'gpt-3.5-turbo',
  'gpt-3.5-turbo-16k',
  'gpt-4',
  'gpt-4-32k',
  'gpt-4-turbo',
  'gpt-4-turbo-preview',
  'gpt-4o',
  'gpt-4o-2024-05-13',
]

const ollamaModels = [
  'orca-mini',
  'orca-mini:13b',
  'orca2',
  'aya:8b',
  'aya:35b',
  'mistral',
  'codegemma',
  'codegemma:7b-code',
  'codellama',
  'llama2',
  'llama2-uncensored',
  'llama2:13b',
  'llama2:70b',
  'llama3',
  'llama3:70b',
  'phi3',
  'phi3:mini',
  'phi3:medium',
  'qwen2',
  'qwen2:1.5b',
  'qwen2:0.5b',
]

const schema = {
  $schema: 'https://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    service: {
      description: 'The LLM provider to use',
      default: 'openai',
      enum: ['openai', 'ollama'],
    },
    model: {
      type: 'string',
      description: 'The LLM model to use',
      default: 'gpt-4',
      oneOf: [
        {
          if: { $ref: '#/definitions/is-openai' },
          then: { enum: openaiModels },
        },
        {
          if: { $ref: '#/definitions/is-ollama' },
          then: { enum: ollamaModels },
        },
      ],
    },
    endpoint: {
      type: 'string',
      description: 'The endpoint to use for the LLM service',
    },
    openAIApiKey: {
      type: 'string',
      description: 'Your OpenAI API key',
      default: null,
    },
    tokenLimit: {
      type: 'number',
      description: 'Maximum number of tokens for the commit message',
      default: 500,
    },
    verbose: {
      type: 'boolean',
      description: 'Verbose output',
      default: false,
    },
    prompt: {
      type: 'string',
      description: 'Prompt for the LLM service',
      default: 'What are the changes in this commit?',
    },
    temperature: {
      type: 'number',
      description:
        'Controls randomness in GPT-3 output. Lower values yield focused output; higher values offer diversity',
      default: 0.4,
    },
    mode: {
      type: 'string',
      description: 'Preferred output method for generated commit messages',
      enum: ['stdout', 'interactive'],
      default: 'stdout',
    },
    summarizePrompt: {
      type: 'string',
      description: 'GPT-3 prompt for summarizing large files',
      default: 'Summarize the changes in this large file:',
    },
    ignoredFiles: {
      type: 'array',
      description: 'Paths of files to be excluded when generating commit messages',
      items: {
        type: 'string',
      },
      default: ['package-lock.json'],
    },
    ignoredExtensions: {
      type: 'array',
      description: 'File extensions to be excluded when generating commit messages',
      items: {
        type: 'string',
      },
      default: ['.map', '.lock'],
    },
    defaultBranch: {
      type: 'string',
      description: 'Default branch for the repository',
      default: 'main',
    },
  },
  required: ['service', 'model'],
  definitions: {
    'is-openai': {
      properties: {
        service: { enum: ['openai'] },
      },
      required: ['service'],
    },
    'is-ollama': {
      properties: {
        service: { enum: ['ollama'] },
      },
      required: ['service'],
    },
    'ollama-requires-endpoint': {
      anyOf: [{ not: { $ref: '#/definitions/is-openai' } }, { required: ['endpoint'] }],
    },
  },
  additionalProperties: false,
}

schema.definitions['openai-models'] = {
  enum: openaiModels,
}

schema.definitions['ollama-models'] = {
  enum: ollamaModels,
}

schema.properties.model = {
  type: 'string',
  description: 'The LLM model to use',
  default: 'gpt-4',
  oneOf: [
    {
      if: { $ref: '#/definitions/is-openai' },
      then: { enum: schema.definitions['openai-models'].enum },
    },
    {
      if: { $ref: '#/definitions/is-ollama' },
      then: { enum: schema.definitions['ollama-models'].enum },
    },
  ],
}

console.log('Generating schema.json...')
fs.writeFileSync('schema.json', JSON.stringify(schema, null, 2))
console.log('schema.json has been generated successfully.')
