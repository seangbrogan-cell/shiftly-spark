import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://a0dafcb42bb26df1b6c4e294dfca37c3@o4511135694979072.ingest.de.sentry.io/4511135698387024",
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 0.2,
  environment: "production",
});

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
