/**
 * Panel voice hook — voice input for panel creation.
 * Wraps useVoiceInput with panel-specific context.
 */
import { useCallback, useEffect } from "react";
import { useVoiceInput } from "@/lib/hooks/useVoiceInput";

interface UsePanelVoiceReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => Promise<void>;
  stopListening: () => void;
  isAvailable: boolean;
}

export function usePanelVoice(
  onTranscript?: (text: string) => void
): UsePanelVoiceReturn {
  const voice = useVoiceInput();

  useEffect(() => {
    if (voice.transcript && onTranscript) {
      onTranscript(voice.transcript);
    }
  }, [voice.transcript, onTranscript]);

  return voice;
}
