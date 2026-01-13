import { useCallback, useEffect, useRef, useState } from 'react';
import type { WhisperWebLanguage, WhisperWebModel } from '@remotion/whisper-web';

type DictationEngine = 'speech' | 'whisper' | null;
type DictationStatus = 'idle' | 'starting' | 'downloading' | 'listening' | 'error';

type DictationTarget = {
  getValue: () => string;
  onUpdate: (value: string) => void;
};

type UseDictationOptions = {
  model?: WhisperWebModel;
  language?: WhisperWebLanguage;
  timesliceMs?: number;
};

const appendSegment = (base: string, segment: string) => {
  const clean = segment.replace(/\s+/g, ' ').trim();
  if (!clean) return base;
  if (!base) return clean;
  return /\s$/.test(base) ? `${base}${clean}` : `${base} ${clean}`;
};

export const useDictation = (options: UseDictationOptions = {}) => {
  const [status, setStatus] = useState<DictationStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [engine, setEngine] = useState<DictationEngine>(null);

  const recognitionRef = useRef<any>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const queueRef = useRef<Blob[]>([]);
  const processingRef = useRef(false);
  const listeningRef = useRef(false);
  const baseValueRef = useRef('');
  const finalValueRef = useRef('');
  const interimValueRef = useRef('');
  const targetRef = useRef<DictationTarget | null>(null);
  const whisperRef = useRef<any>(null);

  const model = options.model ?? 'tiny';
  const language = options.language ?? 'auto';
  const timesliceMs = options.timesliceMs ?? 2500;

  const refreshTarget = useCallback(() => {
    if (!targetRef.current) return;
    let combined = baseValueRef.current;
    combined = appendSegment(combined, finalValueRef.current);
    combined = appendSegment(combined, interimValueRef.current);
    targetRef.current.onUpdate(combined);
  }, []);

  const resetSegments = useCallback(() => {
    baseValueRef.current = targetRef.current?.getValue() ?? '';
    finalValueRef.current = '';
    interimValueRef.current = '';
  }, []);

  const cleanupStreams = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    recognitionRef.current = null;

    if (recorderRef.current) {
      try {
        recorderRef.current.ondataavailable = null;
        recorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    recorderRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    streamRef.current = null;

    queueRef.current = [];
    processingRef.current = false;
    listeningRef.current = false;
  }, []);

  const stop = useCallback(() => {
    cleanupStreams();
    setStatus('idle');
    setStatusMessage('');
    setProgress(null);
    setEngine(null);
    interimValueRef.current = '';
    refreshTarget();
  }, [cleanupStreams, refreshTarget]);

  const loadWhisper = useCallback(async () => {
    if (whisperRef.current) return whisperRef.current;
    const mod = await import('@remotion/whisper-web');
    whisperRef.current = mod;
    return mod;
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      const whisper = await loadWhisper();
      while (queueRef.current.length > 0 && listeningRef.current) {
        const blob = queueRef.current.shift();
        if (!blob || blob.size === 0) continue;
        const waveform = await whisper.resampleTo16Khz({ file: blob });
        let interimChunk = '';
        const result = await whisper.transcribe({
          channelWaveform: waveform,
          model,
          language,
          threads: 2,
          onTranscriptionChunk: (chunks: { text: string }[]) => {
            interimChunk = chunks.map((item) => item.text).join('');
            interimValueRef.current = interimChunk;
            refreshTarget();
          },
        });
        if (!listeningRef.current) break;
        const chunkText = result.transcription.map((item: { text: string }) => item.text).join('');
        if (chunkText) {
          finalValueRef.current = appendSegment(finalValueRef.current, chunkText);
        }
        interimValueRef.current = '';
        refreshTarget();
      }
    } catch (error) {
      if (listeningRef.current) {
        setStatus('error');
        setStatusMessage('Dictation failed. Please try again.');
        cleanupStreams();
      }
    } finally {
      processingRef.current = false;
    }
  }, [cleanupStreams, language, loadWhisper, model, refreshTarget]);

  const startWhisper = useCallback(async () => {
    setEngine('whisper');
    setStatus('starting');
    setStatusMessage('Preparing offline dictation...');
    try {
      if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setStatus('error');
        setStatusMessage('Offline dictation is not supported in this browser.');
        return;
      }
      const whisper = await loadWhisper();
      const support = await whisper.canUseWhisperWeb(model);
      if (!support.supported) {
        setStatus('error');
        setStatusMessage('Offline dictation is unavailable in this browser.');
        return;
      }

      const loaded = await whisper.getLoadedModels();
      if (!loaded.includes(model)) {
        setStatus('downloading');
        setProgress(0);
        setStatusMessage('Downloading voice model...');
        await whisper.downloadWhisperModel({
          model,
          onProgress: (p: { progress: number }) => {
            setProgress(p.progress);
            setStatusMessage(`Downloading voice model... ${Math.round(p.progress * 100)}%`);
          },
        });
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/webm',
        'audio/ogg',
        'audio/mp4',
        'audio/mp4;codecs=mp4a.40.2',
      ];
      const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (!event.data || event.data.size === 0) return;
        queueRef.current.push(event.data);
        if (queueRef.current.length > 6) {
          queueRef.current = queueRef.current.slice(-6);
        }
        void processQueue();
      };

      recorder.start(timesliceMs);
      listeningRef.current = true;
      setStatus('listening');
      setStatusMessage('Listening...');
    } catch (error) {
      setStatus('error');
      setStatusMessage('Microphone access was blocked.');
      cleanupStreams();
    }
  }, [cleanupStreams, loadWhisper, model, processQueue, timesliceMs]);

  const startSpeech = useCallback(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return false;
    const recognition = new SpeechRecognitionCtor();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? '';
        if (result.isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }
      if (finalText) {
        finalValueRef.current = appendSegment(finalValueRef.current, finalText);
      }
      interimValueRef.current = interim;
      refreshTarget();
    };

    recognition.onerror = () => {
      setStatus('error');
      setStatusMessage('Speech recognition failed.');
      cleanupStreams();
    };

    recognition.onend = () => {
      if (listeningRef.current) {
        try {
          recognition.start();
        } catch {
          // ignore
        }
      }
    };

    recognition.start();
    listeningRef.current = true;
    setEngine('speech');
    setStatus('listening');
    setStatusMessage('Listening...');
    return true;
  }, [cleanupStreams, refreshTarget]);

  const start = useCallback(
    async (target: DictationTarget) => {
      if (listeningRef.current) return;
      targetRef.current = target;
      resetSegments();
      setStatus('starting');
      setStatusMessage('Starting dictation...');
      setProgress(null);

      const startedSpeech = startSpeech();
      if (!startedSpeech) {
        await startWhisper();
      }
    },
    [resetSegments, startSpeech, startWhisper],
  );

  const toggle = useCallback(
    async (target: DictationTarget) => {
      if (listeningRef.current) {
        stop();
        return;
      }
      await start(target);
    },
    [start, stop],
  );

  useEffect(() => () => cleanupStreams(), [cleanupStreams]);

  return {
    engine,
    status,
    statusMessage,
    progress,
    isListening: status === 'listening',
    isBusy: status === 'starting' || status === 'downloading',
    start,
    stop,
    toggle,
  };
};
