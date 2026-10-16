import { ModelProvider } from './provider.js';
import { OllamaProvider } from './ollama.js';
import { DeterministicProvider } from './deterministic.js';
import { GeminiProvider } from './gemini.js';
import { ModelProviderType } from '../types.js';
import { getAllSettings, isHostedEnvironment } from '../db.js';

class ModelManager {
  private providers: Map<ModelProviderType, ModelProvider> = new Map();
  private ollamaProvider: OllamaProvider;
  private deterministicProvider: DeterministicProvider;
  private geminiProvider: GeminiProvider;

  constructor() {
    this.ollamaProvider = new OllamaProvider();
    this.deterministicProvider = new DeterministicProvider();
    this.geminiProvider = new GeminiProvider();

    this.providers.set('ollama', this.ollamaProvider);
    this.providers.set('deterministic', this.deterministicProvider);
    this.providers.set('gemini', this.geminiProvider);
  }

  getActiveProvider(): ModelProvider {
    const settings = getAllSettings();
    const isHosted = isHostedEnvironment();

    // Dynamically update Ollama configuration
    this.ollamaProvider.setConfiguration(settings.ollamaEndpoint, settings.ollamaModel);

    // Explicit Deterministic selection
    if (settings.modelProvider === 'deterministic') {
      return this.deterministicProvider;
    }

    // Explicit Gemini selection (Never automatically activated)
    if (settings.modelProvider === 'gemini') {
      return this.geminiProvider;
    }

    // When configured as Ollama:
    // In hosted deployments (Render, Cloud Run, Hosted Previews), local loopback 127.0.0.1 is not reachable in the container.
    // Default to the Deterministic Parser so hosted deployments work seamlessly out-of-the-box.
    const isLoopback =
      settings.ollamaEndpoint.includes('127.0.0.1') ||
      settings.ollamaEndpoint.includes('localhost');

    if (isHosted && isLoopback) {
      return this.deterministicProvider;
    }

    // For local development or custom external tunnels, use OllamaProvider
    return this.ollamaProvider;
  }

  getProvider(id: ModelProviderType): ModelProvider | undefined {
    return this.providers.get(id);
  }

  getAllProvidersInfo() {
    const settings = getAllSettings();
    const isHosted = isHostedEnvironment();
    this.ollamaProvider.setConfiguration(settings.ollamaEndpoint, settings.ollamaModel);

    const active = this.getActiveProvider();

    return Array.from(this.providers.values()).map((p) => {
      let isAvailable = true;
      let statusNote = '';

      if (p.id === 'ollama') {
        const isLoopback =
          settings.ollamaEndpoint.includes('127.0.0.1') ||
          settings.ollamaEndpoint.includes('localhost');
        if (isHosted && isLoopback) {
          isAvailable = false;
          statusNote = 'Hosted deployment: Loopback (127.0.0.1) is not running in cloud container. Active default is Offline Processing.';
        } else {
          statusNote = 'Local inference via Ollama. Run: `ollama run ' + settings.ollamaModel + '`';
        }
      } else if (p.id === 'deterministic') {
        statusNote = isHosted
          ? 'Active default for hosted deployment. 100% offline rule-based parser.'
          : '100% offline rule-based parser. Zero external dependencies.';
      } else if (p.id === 'gemini') {
        statusNote = 'Cloud inference. Never activated automatically without explicit user selection.';
      }

      return {
        id: p.id,
        name: p.name,
        type: p.type,
        description: p.description,
        privacyNotice: p.privacyNotice,
        isActive: p.id === active.id,
        isAvailable,
        statusNote,
      };
    });
  }
}

export const modelManager = new ModelManager();
