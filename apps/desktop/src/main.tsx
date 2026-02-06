import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/700.css";
import { CssBaseline } from "@mui/material";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import { ThemeProvider } from "@mui/material/styles";
import mixpanel from "mixpanel-browser";
import React, { useMemo } from "react";
import ReactDOM from "react-dom/client";
import { IntlProvider } from "react-intl";
import { AgentOverlayRoot } from "./components/overlay/AgentOverlayRoot";
import { PillOverlayRoot } from "./components/overlay/PillOverlayRoot";
import { ToastOverlayRoot } from "./components/overlay/ToastOverlayRoot";
import { AppWithLoading } from "./components/root/AppWithLoading";
import { SnackbarEmitter } from "./components/root/SnackbarEmitter";
import { getIntlConfig } from "./i18n";
import { theme } from "./theme";

const mixpanelToken = import.meta.env.VITE_MIXPANEL_TOKEN;
if (mixpanelToken) {
  mixpanel.init(mixpanelToken, {
    debug: import.meta.env.DEV,
    track_pageview: true,
    persistence: "localStorage",
  });
}

const searchParams =
  typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : null;

const isPillOverlayWindow = searchParams?.get("pill-overlay") === "1";
const isToastOverlayWindow = searchParams?.get("toast-overlay") === "1";
const isAgentOverlayWindow = searchParams?.get("agent-overlay") === "1";

const rootElement = document.getElementById("root") as HTMLElement;

// Prevent HMR from creating multiple React roots.
// Store the root on the DOM element so we can reuse it across hot reloads.
const existingRoot = (rootElement as unknown as { _reactRoot?: ReactDOM.Root })
  ._reactRoot;
const root = existingRoot ?? ReactDOM.createRoot(rootElement);
(rootElement as unknown as { _reactRoot?: ReactDOM.Root })._reactRoot = root;

type ChildrenProps = {
  children: React.ReactNode;
};

const Main = ({ children }: ChildrenProps) => {
  const intlConfig = useMemo(() => getIntlConfig(), []);

  return (
    <React.StrictMode>
      <InitColorSchemeScript attribute="class" />
      <IntlProvider {...intlConfig}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </IntlProvider>
    </React.StrictMode>
  );
};

if (isPillOverlayWindow) {
  root.render(
    <Main>
      <PillOverlayRoot />
    </Main>,
  );
} else if (isToastOverlayWindow) {
  root.render(
    <Main>
      <ToastOverlayRoot />
    </Main>,
  );
} else if (isAgentOverlayWindow) {
  root.render(
    <Main>
      <AgentOverlayRoot />
    </Main>,
  );
} else {
  root.render(
    <Main>
      <SnackbarEmitter />
      <AppWithLoading />
    </Main>,
  );
}
