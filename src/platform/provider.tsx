import * as React from "react";
import { platformServices } from "./services";
import type { PlatformServices } from "./types";

const PlatformContext = React.createContext<PlatformServices>(platformServices);

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  return <PlatformContext.Provider value={platformServices}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  return React.useContext(PlatformContext);
}
