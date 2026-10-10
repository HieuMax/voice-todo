"use client";

import LoginScreen from "@/components/LoginScreen";
import TodoApp from "@/components/TodoApp";
import { useAuth } from "@/hooks/useAuth";
import { getUsername, signOut } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";

function SplashLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-500" />
    </div>
  );
}

export default function HomePage() {
  const { user, initializing } = useAuth();

  if (isSupabaseConfigured && initializing) {
    return <SplashLoader />;
  }

  if (isSupabaseConfigured && !user) {
    return <LoginScreen />;
  }

  return (
    <TodoApp
      userId={user?.id ?? null}
      username={getUsername(user)}
      onSignOut={isSupabaseConfigured ? signOut : undefined}
    />
  );
}
