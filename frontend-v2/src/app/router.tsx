import { createBrowserRouter, Navigate } from "react-router-dom";
import { ShellLayout } from "@widgets/app-shell";
import { DashboardPage } from "@pages/DashboardPage";
import { CreatePage } from "@pages/CreatePage";
import { StudioPage } from "@pages/StudioPage";
import { RendersPage } from "@pages/RendersPage";
import { SettingsPage } from "@pages/SettingsPage";
import { NotFoundPage } from "@pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <ShellLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "create", element: <CreatePage /> },
      { path: "studio/:projectId", element: <StudioPage /> },
      { path: "renders", element: <RendersPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
