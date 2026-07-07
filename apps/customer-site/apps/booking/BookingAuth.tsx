import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Logo } from "../../constants";
import {
  registerWithGoogleForBooking,
  registerWithFacebookForBooking,
  registerForBooking,
  getAuthErrorMessage,
} from "../../services/authService";

export default function BookingAuth() {
  const [searchParams] = useSearchParams();
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "facebook" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loginSource = searchParams.get("loginSource") || "homepage";
  /** Same path the user used (slug or legacy id); strip trailing /auth for OAuth redirect. */
  const bookingUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname.replace(/\/auth\/?$/, "")}`
      : "/"; 

  const handleGoogle = async () => {
    setError(null);
    setSocialLoading("google");
    try {
      await registerWithGoogleForBooking(bookingUrl);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSocialLoading(null);
    }
  };

  const handleFacebook = async () => {
    setError(null);
    setSocialLoading("facebook");
    try {
      await registerWithFacebookForBooking(bookingUrl);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSocialLoading(null);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await registerForBooking({ email, password }, bookingUrl);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Simple header with logo */}
      <header className="w-full border-b border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Logo />
          </a>
        </div>
      </header>

      {/* Centered auth card */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-100 px-8 py-10 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 mb-6">
            Login to book online
          </h1>

          {error && (
            <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg text-left">
              {error}
            </p>
          )}

          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={!!socialLoading}
              className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center bg-white hover:bg-slate-50 transition-colors disabled:opacity-60"
              aria-label="Continue with Google"
            >
              <span className="text-lg font-semibold text-slate-800">G</span>
            </button>
            <button
              type="button"
              onClick={handleFacebook}
              disabled={!!socialLoading}
              className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center bg-white hover:bg-slate-50 transition-colors disabled:opacity-60"
              aria-label="Continue with Facebook"
            >
              <span className="w-6 h-6 rounded-full bg-[#1877F2] flex items-center justify-center text-white font-bold text-xs">
                f
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowEmail(true)}
              className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center bg-white hover:bg-slate-50 transition-colors"
              aria-label="Continue with email"
            >
              <svg
                className="w-5 h-5 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white text-xs text-slate-400">or</span>
            </div>
          </div>

          {!showEmail ? (
            <button
              type="button"
              onClick={() => setShowEmail(true)}
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors w-full"
            >
              Create profile
            </button>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-4 text-left">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-slate-300"
                required
              />
              <input
                type="password"
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-slate-300"
                minLength={6}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-60"
              >
                {loading ? "Creating profile…" : "Create profile"}
              </button>
            </form>
          )}

          <p className="mt-6 text-[11px] text-slate-400">
            You are booking for <span className="font-semibold text-slate-600">{outletId}</span>{" "}
            ({loginSource})
          </p>
        </div>
      </main>
    </div>
  );
}

