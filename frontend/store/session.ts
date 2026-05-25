"use client";

import { create } from "zustand";
import { api } from "@/lib/api";

type User = {
  id: string;
  name: string;
  email: string;
  learning_goal: string;
  current_level: string;
};

type SessionState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  hydrated: boolean;
  hydrate: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { name: string; email: string; password: string; learning_goal: string }) => Promise<void>;
  loadMe: () => Promise<void>;
  logout: () => void;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,
  hydrate: () => {
    if (typeof window === "undefined") return;
    set({
      accessToken: localStorage.getItem("access_token"),
      refreshToken: localStorage.getItem("refresh_token"),
      hydrated: true
    });
  },
  login: async (email, password) => {
    const tokens = await api<{ access_token: string; refresh_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem("access_token", tokens.access_token);
    localStorage.setItem("refresh_token", tokens.refresh_token);
    set({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
    await get().loadMe();
  },
  register: async (payload) => {
    const tokens = await api<{ access_token: string; refresh_token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    localStorage.setItem("access_token", tokens.access_token);
    localStorage.setItem("refresh_token", tokens.refresh_token);
    set({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
    await get().loadMe();
  },
  loadMe: async () => {
    const token = get().accessToken || localStorage.getItem("access_token");
    if (!token) return;
    const result = await api<{ user: User }>("/me", { token });
    set({ user: result.user });
  },
  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ accessToken: null, refreshToken: null, user: null });
  }
}));
