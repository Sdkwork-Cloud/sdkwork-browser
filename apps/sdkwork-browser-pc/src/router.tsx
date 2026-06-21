import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { HomePage } from "./pages/HomePage.tsx";
import { TabsPage } from "./pages/TabsPage.tsx";
import { AiPanelPage } from "./pages/AiPanelPage.tsx";
import { SettingsPage } from "./pages/SettingsPage.tsx";
import { ShellLayout } from "@sdkwork/browser-pc-shell";

const rootRoute = createRootRoute({
  component: () => (
    <ShellLayout>
      <Outlet />
    </ShellLayout>
  ),
  notFoundComponent: () => (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <p className="text-[2rem] font-light text-ink-secondary">404</p>
        <p className="text-sm text-ink-faint">Page not found</p>
      </div>
    </div>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const tabsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tabs",
  component: TabsPage,
});

const aiRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ai",
  component: AiPanelPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  tabsRoute,
  aiRoute,
  settingsRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
