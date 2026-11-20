"use client";

type SpeechRecognitionEventLike = {
    resultIndex: number;
    results: {
        length: number;
        [index: number]: {
            isFinal: boolean;
            0: { transcript: string };
        };
    };
};

type SpeechRecognitionInstance = {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: ((event: unknown) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
    abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
    if (typeof window === "undefined") return null;
    const win = window as unknown as {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

export type VoiceDictationResult = {
    transcriptText: string;
    base64DataUrl: string;
    mimeType: string;
};

export type VoiceDictationSession = {
    stop: () => void;
};

export async function startVoiceDictation(options: {
    initialText?: string;
    onTranscriptChange?: (text: string) => void;
    onComplete: (result: VoiceDictationResult) => void | Promise<void>;
}): Promise<VoiceDictationSession> {
    const baseText = (options.initialText || "").trim();
    let finalSegments = "";
    let interimSegment = "";
    let latestCombinedText = baseText;
    let isStopping = false;

    const emitTranscript = () => {
        const spoken = `${finalSegments} ${interimSegment}`.replace(/\s+/g, " ").trim();
        const combined = [baseText, spoken].filter(Boolean).join(" ").trim();
        latestCombinedText = combined;
        if (spoken) {
            options.onTranscriptChange?.(combined);
        }
    };

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
    ];
    const preferredMime =
        typeof MediaRecorder !== "undefined" &&
        typeof MediaRecorder.isTypeSupported === "function"
            ? candidates.find((c) => MediaRecorder.isTypeSupported(c))
            : undefined;
    const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);
    const effectiveMime = (recorder.mimeType || preferredMime || "audio/webm").split(";")[0];
    const audioChunks: Blob[] = [];

    let recognition: SpeechRecognitionInstance | null = null;
    const SpeechRec = getSpeechRecognitionConstructor();
    if (SpeechRec) {
        try {
            recognition = new SpeechRec();
            recognition.lang = "es-PE";
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.onresult = (event: SpeechRecognitionEventLike) => {
                let nextInterim = "";
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const res = event.results[i];
                    const piece = res?.[0]?.transcript || "";
                    if (res.isFinal) {
                        finalSegments = `${finalSegments} ${piece}`.replace(/\s+/g, " ").trim();
                    } else {
                        nextInterim += piece;
                    }
                }
                interimSegment = nextInterim.trim();
                emitTranscript();
            };
            recognition.onerror = () => {
                // Ignorar errores no fatales de SpeechRecognition; MediaRecorder sigue activo
            };
            recognition.onend = () => {
                if (!isStopping && recorder.state === "recording") {
                    try {
                        recognition?.start();
                    } catch {
                        // Ignorar si ya se detuvo
                    }
                }
            };
            recognition.start();
        } catch {
            recognition = null;
        }
    }

    recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) {
            audioChunks.push(ev.data);
        }
    };

    recorder.onstop = () => {
        isStopping = true;
        try {
            recognition?.stop();
        } catch {
            // Ignorar
        }
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(audioChunks, { type: effectiveMime });
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64DataUrl = typeof reader.result === "string" ? reader.result : "";
            void options.onComplete({
                transcriptText: latestCombinedText,
                base64DataUrl,
                mimeType: effectiveMime,
            });
        };
        reader.readAsDataURL(blob);
    };

    recorder.start(250);

    return {
        stop: () => {
            isStopping = true;
            try {
                recognition?.stop();
            } catch {
                // Ignorar
            }
            if (recorder.state !== "inactive") {
                recorder.stop();
            }
        },
    };
}
