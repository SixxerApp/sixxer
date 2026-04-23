import * as React from "react";
import { platformServices } from "@/platform";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    return platformServices.ui.watchMaxWidth(MOBILE_BREAKPOINT - 1, setIsMobile);
  }, []);

  return !!isMobile;
}
