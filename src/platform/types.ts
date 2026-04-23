export type ThemePreference = "dark" | "light";

export interface SessionStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface KeyValueStorage extends SessionStore {
  getJson<T>(key: string, fallback: T): T;
  setJson<T>(key: string, value: T): void;
}

export interface ClipboardService {
  writeText(text: string): Promise<void>;
}

export interface DialogService {
  prompt(message: string, defaultValue?: string): Promise<string | null>;
}

export interface DeepLinkPayload {
  path: string;
  url: string;
}

export interface DeepLinkService {
  getAuthRedirectUrl(path: string): string;
  getInitialPath(): Promise<string | null>;
  subscribe(listener: (payload: DeepLinkPayload) => void): Promise<() => void> | (() => void);
}

export type NotificationPermissionState = "default" | "granted" | "denied" | "unsupported";

export interface NotificationOpenPayload {
  data: unknown;
  path: string | null;
}

export interface NotificationService {
  getPermissionStatus(): Promise<NotificationPermissionState>;
  requestPermission(): Promise<NotificationPermissionState>;
  register(): Promise<string | null>;
  addOpenListener(
    listener: (payload: NotificationOpenPayload) => void,
  ): Promise<() => void> | (() => void);
}

export interface DeviceMediaService {
  pickImage(): Promise<null>;
}

export interface UiService {
  applyTheme(theme: ThemePreference): void;
  toggleBodyClass(className: string, active: boolean): void;
  getWindowWidth(): number | null;
  watchMaxWidth(maxWidth: number, listener: (matches: boolean) => void): () => void;
}

export interface AppService {
  isNativeApp: boolean;
  registerServiceWorker(scriptUrl: string): Promise<void>;
  getOnlineStatus(): boolean;
  subscribeOnlineStatus(listener: (online: boolean) => void): () => void;
  onResume(listener: () => void): Promise<() => void> | (() => void);
  onBackButton(listener: () => boolean | void): Promise<() => void> | (() => void);
}

export interface PlatformServices {
  app: AppService;
  ui: UiService;
  storage: KeyValueStorage;
  sessionStore: SessionStore;
  clipboard: ClipboardService;
  dialogs: DialogService;
  deepLinks: DeepLinkService;
  notifications: NotificationService;
  deviceMedia: DeviceMediaService;
}
