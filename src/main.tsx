

import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

// Initialize Sentry BEFORE rendering your app
Sentry.init({
  dsn: "https://a0dafcb42bb26df1b6c4e294dfca37c3@o4511135694979072.ingest.de.sentry.io/4511135698387024", // Get this from sentry.io
  integrations: [
    new BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  environment: "production",
});
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
