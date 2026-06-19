import { createMobileBrowserShell } from "@sdkwork/browser-h5-react";

export function App() {
  const shell = createMobileBrowserShell();
  return (
    <div data-testid="browser-h5-shell">
      <h1>{shell.title}</h1>
      <p>{shell.tagline}</p>
    </div>
  );
}
