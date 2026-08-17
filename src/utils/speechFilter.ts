/**
 * Intelligent Speech Dictation Filter & Web Speech API Adapter.
 * Automatically cleans vocal filler sounds (umm, aah, uhh, hmm, etc.),
 * fixes stuttered words, parses spoken punctuation, and formats proper sentence casing.
 */

// Regex list for common vocal filler sounds, hesitation pauses, and speech clutter
const FILLER_WORDS_REGEX = /\b(umm+|uhh+|aah+|er+|hmm+|erm+|ah+|uh+|huh+|mhm+|like,\s*you\s*know|you\s*know\s*what\s*I\s*mean|you\s*know|so\s*basically|I\s*mean)\b/gi;

// Repeated word stuttering regex (e.g. "the the" -> "the", "what what" -> "what", "is is" -> "is")
const STUTTER_REGEX = /\b([a-zA-Z]+)\s+\1\b/gi;

// Spoken punctuation replacement map
const PUNCTUATION_MAP: Array<{ regex: RegExp; replacement: string }> = [
  { regex: /\b(period|full\s+stop)\b/gi, replacement: '.' },
  { regex: /\b(comma)\b/gi, replacement: ',' },
  { regex: /\b(question\s+mark)\b/gi, replacement: '?' },
  { regex: /\b(exclamation\s+mark|exclamation\s+point)\b/gi, replacement: '!' },
  { regex: /\b(colon)\b/gi, replacement: ':' },
  { regex: /\b(semicolon)\b/gi, replacement: ';' },
  { regex: /\b(new\s+line|next\s+line)\b/gi, replacement: '\n' }
];

export function cleanDictationText(rawText: string): string {
  if (!rawText) return '';

  let cleaned = rawText;

  // 1. Remove spoken punctuation first or map them
  for (const { regex, replacement } of PUNCTUATION_MAP) {
    cleaned = cleaned.replace(regex, replacement);
  }

  // 2. Strip vocal filler words and hesitation sounds
  cleaned = cleaned.replace(FILLER_WORDS_REGEX, '');

  // 3. Remove consecutive repeated word stuttering (run multiple times for n-tuples like "the the the")
  cleaned = cleaned.replace(STUTTER_REGEX, '$1');
  cleaned = cleaned.replace(STUTTER_REGEX, '$1');
  cleaned = cleaned.replace(STUTTER_REGEX, '$1');

  // 4. Fix spaces around punctuation (e.g. "temperature ," -> "temperature,")
  cleaned = cleaned.replace(/\s+([.,!?:;])/g, '$1');

  // 5. Consolidate multiple spaces and tabs
  cleaned = cleaned.replace(/[ \t]+/g, ' ').trim();

  // 6. Capitalize sentence beginnings
  cleaned = cleaned.replace(/(^\s*|[.!?\n]\s+)([a-z])/g, (_, prefix, char) => {
    return prefix + char.toUpperCase();
  });

  return cleaned;
}

export interface SpeechDictationController {
  isSupported: boolean;
  isListening: boolean;
  start: (
    onUpdate: (finalText: string, interimText: string) => void,
    onError?: (err: string) => void,
    onEnd?: () => void
  ) => void;
  stop: () => void;
}

export function createSpeechDictation(): SpeechDictationController {
  if (typeof window === 'undefined') {
    return {
      isSupported: false,
      isListening: false,
      start: () => {},
      stop: () => {}
    };
  }

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return {
      isSupported: false,
      isListening: false,
      start: (_onUpdate, onError) => {
        if (onError) onError('Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari.');
      },
      stop: () => {}
    };
  }

  let recognition: any = null;
  let isListening = false;

  return {
    isSupported: true,
    get isListening() {
      return isListening;
    },

    start(onUpdate, onError, onEnd) {
      if (isListening && recognition) {
        try { recognition.stop(); } catch {}
      }

      try {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = navigator.language || 'en-US';

        recognition.onstart = () => {
          isListening = true;
        };

        recognition.onresult = (event: any) => {
          let sessionFinalTranscript = '';
          let currentInterimTranscript = '';

          for (let i = 0; i < event.results.length; i++) {
            const transcript = event.results[i][0]?.transcript || '';
            if (event.results[i].isFinal) {
              sessionFinalTranscript += transcript + ' ';
            } else {
              currentInterimTranscript += transcript;
            }
          }

          const cleanedFinal = cleanDictationText(sessionFinalTranscript);
          const cleanedInterim = cleanDictationText(currentInterimTranscript);

          onUpdate(cleanedFinal, cleanedInterim);
        };

        recognition.onerror = (event: any) => {
          if (event.error !== 'no-speech' && event.error !== 'aborted') {
            if (onError) onError(`Microphone error: ${event.error}`);
          }
        };

        recognition.onend = () => {
          isListening = false;
          if (onEnd) onEnd();
        };

        recognition.start();
      } catch (err: any) {
        isListening = false;
        if (onError) onError(err.message || 'Failed to start speech recognition.');
      }
    },

    stop() {
      if (recognition && isListening) {
        try {
          recognition.stop();
        } catch {}
      }
      isListening = false;
    }
  };
}
