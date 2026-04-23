import { Capacitor } from "@capacitor/core";
import type {
  AppService,
  ClipboardService,
  DeepLinkPayload,
  DeepLinkService,
  DeviceMediaService,
  DialogService,
  KeyValueStorage,
  NotificationOpenPayload,
  NotificationPermissionState,
  NotificationService,
  PlatformServices,
  SessionStore,
  ThemePreference,
  UiService,
} from "./types";

function canUseDom() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function normalizePath(path: string) {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function parseDeepLinkPath(urlString: string) {
  try {
    const url = new URL(urlString);
    const redirect = url.searchParams.get("redirect");
    if (redirect?.startsWith("/")) return redirect;

    if ((url.protocol === "http:" || url.protocol === "https:") && url.pathname) {
      return `${url.pathname}${url.search}${url.hash}`;
    }

    if (url.pathname && url.pathname !== "/") {
      return `${url.pathname}${url.search}${url.hash}`;
    }

    if (url.hostname) {
      return `/${url.hostname}${url.search}${url.hash}`;
    }
  } catch {
    return null;
  }

  return null;
}

class MemoryStore implements SessionStore {
  private readonly data = new Map<string, string>();

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.data.set(key, value);
  }

  removeItem(key: string) {
    this.data.delete(key);
  }
}

const memoryStore = new MemoryStore();

function readStorage(key: string) {
  if (!canUseDom()) return memoryStore.getItem(key);

  try {
    return window.localStorage.getItem(key);
  } catch {
    return memoryStore.getItem(key);
  }
}

function writeStorage(key: string, value: string) {
  if (!canUseDom()) {
    memoryStore.setItem(key, value);
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    memoryStore.setItem(key, value);
  }
}

function removeStorage(key: string) {
  if (!canUseDom()) {
    memoryStore.removeItem(key);
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    memoryStore.removeItem(key);
  }
}

const storage: KeyValueStorage = {
  getItem(key) {
    return readStorage(key);
  },
  setItem(key, value) {
    writeStorage(key, value);
  },
  removeItem(key) {
    removeStorage(key);
  },
  getJson(key, fallback) {
    const raw = readStorage(key);
    if (!raw) return fallback;

    try {
      return JSON.parse(raw) as typeof fallback;
    } catch {
      return fallback;
    }
  },
  setJson(key, value) {
    writeStorage(key, JSON.stringify(value));
  },
};

const sessionStore: SessionStore = {
  getItem(key) {
    return storage.getItem(key);
  },
  setItem(key, value) {
    storage.setItem(key, value);
  },
  removeItem(key) {
    storage.removeItem(key);
  },
};

const ui: UiService = {
  applyTheme(theme: ThemePreference) {
    if (!canUseDom()) return;
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  },
  toggleBodyClass(className, active) {
    if (!canUseDom()) return;
    document.body.classList.toggle(className, active);
  },
  getWindowWidth() {
    if (!canUseDom()) return null;
    return window.innerWidth;
  },
  watchMaxWidth(maxWidth, listener) {
    if (!canUseDom()) return () => {};

    const mediaQuery = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const onChange = (event: MediaQueryListEvent) => listener(event.matches);
    listener(mediaQuery.matches);
    mediaQuery.addEventListener("change", onChange);

    return () => mediaQuery.removeEventListener("change", onChange);
  },
};

const clipboard: ClipboardService = {
  async writeText(text) {
    if (canUseDom() && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    throw new Error("Clipboard is not available on this device.");
  },
};

const dialogs: DialogService = {
  async prompt(message, defaultValue = "") {
    if (!canUseDom()) return null;
    return window.prompt(message, defaultValue);
  },
};

function createAuthRedirectUrl(path: string) {
  const normalized = normalizePath(path);
  const nativeRedirect = import.meta.env.VITE_NATIVE_AUTH_REDIRECT_URL?.trim();
  if (Capacitor.isNativePlatform() && nativeRedirect) {
    const url = new URL(nativeRedirect);
    url.searchParams.set("redirect", normalized);
    return url.toString();
  }

  const appUrl = import.meta.env.VITE_APP_URL?.trim();
  if (appUrl) {
    return new URL(normalized, appUrl).toString();
  }

  if (canUseDom()) {
    return new URL(normalized, window.location.origin).toString();
  }

  return normalized;
}

const deepLinks: DeepLinkService = {
  getAuthRedirectUrl(path) {
    return createAuthRedirectUrl(path);
  },
  async getInitialPath() {
    if (!Capacitor.isNativePlatform()) return null;

    const { App } = await import("@capacitor/app");
    const launchUrl = await App.getLaunchUrl();
    if (!launchUrl?.url) return null;
    return parseDeepLinkPath(launchUrl.url);
  },
  async subscribe(listener) {
    if (!Capacitor.isNativePlatform()) {
      return () => {};
    }

    const { App } = await import("@capacitor/app");
    const handle = await App.addListener("appUrlOpen", ({ url }) => {
      const path = parseDeepLinkPath(url);
      if (!path) return;
      listener({ path, url });
    });

    return () => {
      void handle.remove();
    };
  },
};

async function getNativePushModule() {
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const module = await import("@capacitor/push-notifications");
    return module.PushNotifications;
  } catch {
    return null;
  }
}

function parseNotificationPath(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const path = (data as Record<string, unknown>).path;
  return typeof path === "string" && path.startsWith("/") ? path : null;
}

// Capacitor's PermissionState includes "prompt" / "prompt-with-rationale" which
// map conceptually to the browser's "default" (not yet granted or denied).
// Collapse them at the boundary so the rest of the app only deals with our
// narrower NotificationPermissionState union.
function normalizePermissionState(state: string): NotificationPermissionState {
  if (state === "granted" || state === "denied" || state === "unsupported") return state;
  return "default";
}

const notifications: NotificationService = {
  async getPermissionStatus() {
    const nativePush = await getNativePushModule();
    if (nativePush) {
      const permissions = await nativePush.checkPermissions();
      return normalizePermissionState(permissions.receive);
    }

    if (!canUseDom() || typeof Notification === "undefined") {
      return "unsupported";
    }

    return normalizePermissionState(Notification.permission);
  },
  async requestPermission() {
    const nativePush = await getNativePushModule();
    if (nativePush) {
      const permissions = await nativePush.requestPermissions();
      return normalizePermissionState(permissions.receive);
    }

    if (!canUseDom() || typeof Notification === "undefined") {
      return "unsupported";
    }

    return normalizePermissionState(await Notification.requestPermission());
  },
  async register() {
    const nativePush = await getNativePushModule();
    if (!nativePush) return null;

    // Wire up the listener promise BEFORE calling register(), otherwise the
    // token event can arrive while we're still awaiting addListener and we'll
    // miss it. Capacitor's addListener returns a Promise<PluginListenerHandle>,
    // so we have to await the handles before calling .remove() on them.
    let settled = false;
    let resolve: (token: string | null) => void = () => {};
    const done = new Promise<string | null>((r) => {
      resolve = r;
    });

    const registrationHandle = await nativePush.addListener("registration", (token) => {
      if (settled) return;
      settled = true;
      void registrationHandle.remove();
      void errorHandle.remove();
      resolve(token.value);
    });
    const errorHandle = await nativePush.addListener("registrationError", () => {
      if (settled) return;
      settled = true;
      void registrationHandle.remove();
      void errorHandle.remove();
      resolve(null);
    });

    await nativePush.register();
    return done;
  },
  async addOpenListener(listener) {
    const nativePush = await getNativePushModule();
    if (!nativePush) {
      return () => {};
    }

    const handle = await nativePush.addListener("pushNotificationActionPerformed", (event) => {
      const payload: NotificationOpenPayload = {
        data: event.notification.data,
        path: parseNotificationPath(event.notification.data),
      };
      listener(payload);
    });

    return () => {
      void handle.remove();
    };
  },
};

const deviceMedia: DeviceMediaService = {
  async pickImage() {
    return null;
  },
};

const app: AppService = {
  isNativeApp: Capacitor.isNativePlatform(),
  async registerServiceWorker(scriptUrl) {
    if (!canUseDom() || Capacitor.isNativePlatform() || !("serviceWorker" in navigator)) {
      return;
    }

    try {
      await navigator.serviceWorker.register(scriptUrl);
    } catch {
      // Ignore registration failures on unsupported browsers or dev hosts.
    }
  },
  getOnlineStatus() {
    if (!canUseDom()) return true;
    return navigator.onLine;
  },
  subscribeOnlineStatus(listener) {
    if (!canUseDom()) return () => {};

    const handleOnline = () => listener(true);
    const handleOffline = () => listener(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  },
  async onResume(listener) {
    if (Capacitor.isNativePlatform()) {
      const { App } = await import("@capacitor/app");
      const handle = await App.addListener("resume", listener);
      return () => {
        void handle.remove();
      };
    }

    if (!canUseDom()) return () => {};

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") listener();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  },
  async onBackButton(listener) {
    if (!Capacitor.isNativePlatform()) {
      return () => {};
    }

    const { App } = await import("@capacitor/app");
    const handle = await App.addListener("backButton", () => {
      const handled = listener();
      if (handled) return;

      if (window.history.length > 1) {
        window.history.back();
      }
    });

    return () => {
      void handle.remove();
    };
  },
};

export const platformServices: PlatformServices = {
  app,
  ui,
  storage,
  sessionStore,
  clipboard,
  dialogs,
  deepLinks,
  notifications,
  deviceMedia,
};
