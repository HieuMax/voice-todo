export {};

declare global {
  interface TurnstileRenderOptions {
    sitekey: string;
    callback?: (token: string) => void;
    "expired-callback"?: () => void;
    "error-callback"?: () => void;
    "timeout-callback"?: () => void;
    theme?: "light" | "dark" | "auto";
    size?: "normal" | "flexible" | "compact";
  }

  interface TurnstileInstance {
    render(
      container: string | HTMLElement,
      options: TurnstileRenderOptions,
    ): string;
    reset(widgetId?: string): void;
    remove(widgetId?: string): void;
  }

  interface Window {
    turnstile?: TurnstileInstance;
  }
}
