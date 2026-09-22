/**
 * src/core/auth-store.ts
 * Estado de autenticação em memória (sem localStorage — o token de
 * verdade é o cookie httpOnly). Guardamos aqui só uma cópia do usuário
 * para a UI decidir o que mostrar (ex.: esconder "cadastrar música" de
 * quem não é professor).
 */
import { api } from "./api-client";
import type { AuthUser } from "./types";

type Listener = (user: AuthUser | null) => void;

class AuthStore {
  private user: AuthUser | null = null;
  private listeners = new Set<Listener>();
  private initialized = false;

  async init(): Promise<AuthUser | null> {
    if (this.initialized) return this.user;
    const { user } = await api.auth.me();
    this.setUser(user);
    this.initialized = true;
    return user;
  }

  getUser(): AuthUser | null {
    return this.user;
  }

  private setUser(user: AuthUser | null): void {
    this.user = user;
    this.listeners.forEach((cb) => cb(user));
  }

  async login(identifier: string, password: string): Promise<AuthUser> {
    const { user } = await api.auth.login(identifier, password);
    this.setUser(user);
    return user;
  }

  async register(username: string, email: string, password: string): Promise<AuthUser> {
    const { user } = await api.auth.register(username, email, password);
    this.setUser(user);
    return user;
  }

  async logout(): Promise<void> {
    await api.auth.logout();
    this.setUser(null);
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const authStore = new AuthStore();
