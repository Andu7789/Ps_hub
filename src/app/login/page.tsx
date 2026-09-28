import type { Metadata } from "next";
import { LoginForm } from "@/components/forms/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  const errorMessage = error
    ? "That sign-in link didn't work. It may have expired or already been used. Enter your email for a new one."
    : undefined;
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <LoginForm next={next} initialError={errorMessage} />
    </div>
  );
}
