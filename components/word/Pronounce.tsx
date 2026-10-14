"use client";

import { useEffect, useState } from "react";

/**
 * Speaks a word with the device's own Hebrew or Greek voice, when it has one.
 * Device voices use modern Israeli Hebrew / modern Greek pronunciation, so this is a guide, not a reconstruction.
 */
export function Pronounce({ text, language }: { text: string; language: "he" | "grc" }) {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const prefix = language === "he" ? "he" : "el";

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const pick = () => setVoice(speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(prefix)) ?? null);
    pick();
    speechSynthesis.addEventListener("voiceschanged", pick);
    return () => speechSynthesis.removeEventListener("voiceschanged", pick);
  }, [prefix]);

  if (!voice) return null;
  return (
    <button
      type="button"
      onClick={() => {
        const u = new SpeechSynthesisUtterance(text);
        u.voice = voice;
        u.lang = voice.lang;
        u.rate = 0.8;
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
      }}
      title={`Spoken by your device's ${language === "he" ? "modern Hebrew" : "modern Greek"} voice`}
      className="rounded-full border border-border px-3 py-1 text-sm hover:border-accent"
    >
      <span aria-hidden>🔊</span> Hear it
    </button>
  );
}
