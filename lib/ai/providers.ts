import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { xai } from '@ai-sdk/xai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
import { isTestEnvironment } from '../constants';

const openAIModel = process.env.OPENAI_MODEL?.trim() || '';
const openAIEnabled = process.env.SOUL_OPENAI_PROVIDER_ENABLED === 'true' && Boolean(process.env.OPENAI_API_KEY?.trim()) && Boolean(openAIModel);
const openAIBaseURL = process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1';

const openAICompatible = openAIEnabled
  ? createOpenAICompatible({
      name: 'soul-openai',
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: openAIBaseURL,
    })
  : null;

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        'chat-model': openAICompatible?.languageModel(openAIModel) ?? xai('grok-2-vision-1212'),
        'chat-model-reasoning': openAICompatible?.languageModel(openAIModel) ?? wrapLanguageModel({
          model: xai('grok-3-mini-beta'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': openAICompatible?.languageModel(openAIModel) ?? xai('grok-2-1212'),
        'artifact-model': openAICompatible?.languageModel(openAIModel) ?? xai('grok-2-1212'),
      },
      imageModels: {
        'small-model': xai.imageModel('grok-2-image'),
      },
    });
