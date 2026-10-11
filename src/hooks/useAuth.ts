"use client";

import { useEffect, useState } from "react";

import type { User } from "@supabase/supabase-js";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";

interface UseAuthReturn {
  user: User | null;
  initializing: boolean;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(isSupabaseConfigured);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    let active = true;

    // Re-reading the session also refreshes the access token when it is close to
    // expiry, so returning to a long-suspended mobile tab restores the session
    // instead of looking signed out.
    const sync = () => {
      client.auth.getSession().then(({ data }) => {
        if (!active) return;
        setUser(data.session?.user ?? null);
        setInitializing(false);
      });
    };

    sync();

    const { data: listener } = client.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        setUser(session?.user ?? null);
        setInitializing(false);
      },
    );

    const handleVisible = () => {
      if (document.visibilityState === "visible") sync();
    };

    document.addEventListener("visibilitychange", handleVisible);
    window.addEventListener("focus", sync);
    window.addEventListener("online", sync);

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", handleVisible);
      window.removeEventListener("focus", sync);
      window.removeEventListener("online", sync);
      listener.subscription.unsubscribe();
    };
  }, []);

  return { user, initializing };
}
