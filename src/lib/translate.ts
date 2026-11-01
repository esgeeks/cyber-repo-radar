/**
 * Free, on-device translation of repository descriptions using Chrome's built-in
 * Translator and LanguageDetector APIs (Chrome 138+). No server, no API key, no cost:
 * the browser downloads the language model once and translates locally.
 * Other browsers simply keep the original text.
 */

type Availability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

interface TranslatorInstance {
  translate(text: string): Promise<string>;
}
interface TranslatorStatic {
  availability(opts: { sourceLanguage: string; targetLanguage: string }): Promise<Availability>;
  create(opts: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (m: EventTarget) => void;
  }): Promise<TranslatorInstance>;
}
interface DetectorInstance {
  detect(text: string): Promise<{ detectedLanguage: string; confidence: number }[]>;
}
interface DetectorStatic {
  create(): Promise<DetectorInstance>;
}

declare global {
  // eslint-disable-next-line no-var
  var Translator: TranslatorStatic | undefined;
  // eslint-disable-next-line no-var
  var LanguageDetector: DetectorStatic | undefined;
}

export const TARGET = 'es';

/** Rejects if `promise` does not settle within `ms` (some Chromium builds expose the API but never answer). */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      },
    );
  });
}
const MIN_CONFIDENCE = 0.6;

export function translationSupported(): boolean {
  return typeof globalThis.Translator?.create === 'function';
}

/** Picks the language to translate from, or null when the text should stay as is. */
export function pickSource(results: { detectedLanguage: string; confidence: number }[] | null, target = TARGET): string | null {
  if (!results) return 'en'; // no detector: descriptions are mostly English
  const best = results[0];
  if (!best || best.confidence < MIN_CONFIDENCE || best.detectedLanguage === 'und') return null;
  const lang = best.detectedLanguage.split('-')[0]!.toLowerCase();
  return lang === target ? null : lang;
}

type Listener = () => void;

/** Translation cache + sequential queue, shared by all cards. */
class TranslationStore {
  private cache = new Map<string, string | null>(); // original text -> translation (null = keep original)
  private pending = new Set<string>();
  private queue: string[] = [];
  private running = false;
  private listeners = new Set<Listener>();
  private translators = new Map<string, Promise<TranslatorInstance | null>>();
  private detector: Promise<DetectorInstance | null> | null = null;
  version = 0;

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getVersion = () => this.version;

  private emit() {
    this.version++;
    for (const l of this.listeners) l();
  }

  get(text: string): string | null | undefined {
    return this.cache.get(text);
  }

  /** Must be called from a user gesture the first time, so Chrome may download the model. */
  async prepare(onProgress?: (fraction: number) => void): Promise<boolean> {
    const t = await this.translator('en', onProgress);
    return t !== null;
  }

  request(text: string) {
    if (this.cache.has(text) || this.pending.has(text)) return;
    this.pending.add(text);
    this.queue.push(text);
    void this.run();
  }

  private getDetector(): Promise<DetectorInstance | null> {
    if (!this.detector) {
      const LD = globalThis.LanguageDetector;
      this.detector = LD ? withTimeout(LD.create(), 5_000).catch(() => null) : Promise.resolve(null);
    }
    return this.detector;
  }

  private translator(source: string, onProgress?: (fraction: number) => void): Promise<TranslatorInstance | null> {
    let t = this.translators.get(source);
    if (!t) {
      const T = globalThis.Translator;
      t = (async () => {
        if (!T) return null;
        try {
          const availability = await withTimeout(T.availability({ sourceLanguage: source, targetLanguage: TARGET }), 8_000);
          if (availability === 'unavailable') return null;
          // Downloading a language model can take a while; an installed one should be instant.
          const limit = availability === 'available' ? 15_000 : 180_000;
          return await withTimeout(T.create({
            sourceLanguage: source,
            targetLanguage: TARGET,
            monitor: (m) =>
              m.addEventListener('downloadprogress', (e) => onProgress?.((e as unknown as { loaded: number }).loaded)),
          }), limit);
        } catch {
          return null;
        }
      })();
      this.translators.set(source, t);
    }
    return t;
  }

  private async run() {
    if (this.running) return;
    this.running = true;
    while (this.queue.length) {
      const text = this.queue.shift()!;
      let result: string | null = null;
      try {
        const detector = await this.getDetector();
        const source = pickSource(detector ? await withTimeout(detector.detect(text), 5_000).catch(() => null) : null);
        if (source) {
          const t = await this.translator(source);
          if (t) {
            const out = (await withTimeout(t.translate(text), 10_000)).trim();
            result = out && out !== text ? out : null;
          }
        }
      } catch {
        result = null;
      }
      this.pending.delete(text);
      this.cache.set(text, result);
      this.emit();
    }
    this.running = false;
  }
}

export const translations = new TranslationStore();
