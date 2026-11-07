import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Admin belépés", robots: { index: false, follow: false } };

export default function AdminLogin() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <p className="mb-6 text-center font-script text-4xl text-gold">Húzdrá!</p>
        <div className="rounded-2xl border border-line bg-surface p-6">
          <h1 className="font-display text-2xl font-black">Admin belépés</h1>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
