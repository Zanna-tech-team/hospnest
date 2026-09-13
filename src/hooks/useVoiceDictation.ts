import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

export interface UseVoiceDictationOptions {
  language?: string;
  continuous?: boolean;
  onResult?: (transcriptText: string) => void;
  onError?: (error: string) => void;
}

export function useVoiceDictation(options: UseVoiceDictationOptions = {}) {
  const { language = "en-NG", continuous = true, onResult, onError } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = continuous;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = "";
        let finalResult = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalResult += item[0].transcript;
          } else {
            currentInterim += item[0].transcript;
          }
        }

        if (finalResult) {
          setTranscript((prev) => {
            const next = prev ? `${prev} ${finalResult}` : finalResult;
            onResult?.(next);
            return next;
          });
        }
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          toast.error("Microphone access was denied. Please allow microphone permission in your browser.");
        } else if (event.error !== "no-speech") {
          onError?.(event.error);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn("Speech recognition initialization error:", err);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, [language, continuous, onResult, onError]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      toast.error("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (recognitionRef.current && !isListening) {
      try {
        setInterimTranscript("");
        recognitionRef.current.start();
      } catch (err: any) {
        console.warn("Speech recognition start failed:", err);
      }
    }
  }, [isSupported, isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      setIsListening(false);
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
  };
}
