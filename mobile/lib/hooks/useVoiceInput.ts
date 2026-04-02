/**
 * Voice input hook — wraps expo-speech-recognition.
 * IMPORTANT: expo-speech-recognition is lazy-loaded to prevent startup crashes.
 * Never import it at the top level of any eagerly-loaded file.
 */
import { useState, useCallback, useRef } from "react";
import { hapticMedium } from "./useHaptic";

interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => Promise<void>;
  stopListening: () => void;
  isAvailable: boolean;
}

export function useVoiceInput(): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const moduleRef = useRef<any>(null);

  const loadModule = useCallback(async () => {
    if (moduleRef.current) return moduleRef.current;
    try {
      const mod = await import("expo-speech-recognition");
      moduleRef.current = mod;
      return mod;
    } catch {
      setIsAvailable(false);
      return null;
    }
  }, []);

  const startListening = useCallback(async () => {
    const mod = await loadModule();
    if (!mod?.ExpoSpeechRecognitionModule) return;

    try {
      const { granted } = await mod.ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        setIsAvailable(false);
        return;
      }

      hapticMedium();
      setIsListening(true);
      setTranscript("");

      mod.ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
      });
    } catch {
      setIsListening(false);
    }
  }, [loadModule]);

  const stopListening = useCallback(async () => {
    const mod = await loadModule();
    if (!mod?.ExpoSpeechRecognitionModule) return;
    try {
      mod.ExpoSpeechRecognitionModule.stop();
    } catch {
      // Ignore stop errors
    }
    setIsListening(false);
  }, [loadModule]);

  return { isListening, transcript, startListening, stopListening, isAvailable };
}
