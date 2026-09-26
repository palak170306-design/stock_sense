"use client";

import { create } from "zustand";

type UIState = {
  /** intro finished (or skipped) — main site revealed */
  introDone: boolean;
  /** user explicitly asked to replay the cinematic intro */
  replayRequested: boolean;
  finishIntro: () => void;
  replayIntro: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  introDone: false,
  replayRequested: false,
  finishIntro: () => {
    try {
      sessionStorage.setItem("ss_intro_done", "1");
    } catch {
      /* private mode */
    }
    set({ introDone: true, replayRequested: false });
  },
  replayIntro: () => {
    try {
      sessionStorage.removeItem("ss_intro_done");
    } catch {
      /* private mode */
    }
    set({ introDone: false, replayRequested: true });
  },
}));
