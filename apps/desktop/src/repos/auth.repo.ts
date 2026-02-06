import type { User, AuthResponse } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import { BaseRepo } from "./base.repo";

export type SupabaseAuthResponse = AuthResponse;

export abstract class BaseAuthRepo extends BaseRepo {
  abstract signUpWithEmail(
    email: string,
    password: string,
  ): Promise<SupabaseAuthResponse>;
  abstract sendEmailVerificationForCurrentUser(): Promise<void>;
  abstract signOut(): Promise<void>;
  abstract signInWithEmail(
    email: string,
    password: string,
  ): Promise<SupabaseAuthResponse>;
  abstract sendPasswordResetRequest(email: string): Promise<void>;
  abstract signInWithGoogleTokens(
    idToken: string,
    accessToken: string,
  ): Promise<SupabaseAuthResponse>;
  abstract getCurrentUser(): Promise<User | null>;
  abstract deleteMyAccount(): Promise<void>;
}

export class SupabaseAuthRepo extends BaseAuthRepo {
  async signUpWithEmail(
    email: string,
    password: string,
  ): Promise<SupabaseAuthResponse> {
    const result = await supabase.auth.signUp({ email, password });
    if (result.error) throw result.error;
    if (!result.data.user) throw new Error("Sign up failed: no user returned");
    return result;
  }

  async sendEmailVerificationForCurrentUser(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("No user is currently signed in.");
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email!,
    });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async signInWithEmail(
    email: string,
    password: string,
  ): Promise<SupabaseAuthResponse> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { data, error };
  }

  async sendPasswordResetRequest(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }

  async signInWithGoogleTokens(
    idToken: string,
    _accessToken: string,
  ): Promise<SupabaseAuthResponse> {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });
    if (error) throw error;
    return { data, error };
  }

  async getCurrentUser(): Promise<User | null> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  }

  async deleteMyAccount(): Promise<void> {
    throw new Error("Account deletion not yet implemented. Please contact support.");
  }
}
