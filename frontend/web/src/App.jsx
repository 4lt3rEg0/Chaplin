import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate
} from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { GlobalStyles } from "./styles/Y2KTheme";
import api from "./services/api";

import { AuthProvider } from "./context/AuthContext";
import { SkinProvider, useSkin } from "./context/SkinContext";
import { PlayerProvider } from "./context/PlayerContext";
import { useVortex } from "./context/VortexContext";

/* CONTEXT */
import { VortexProvider } from "./context/VortexContext";

/* COMPONENTES */
import FloatingTopIcons from "./components/FloatingTopIcons";
import FloatingPlayerButton from "./components/FloatingPlayerButton";
import GlobalMobileDock from "./components/GlobalMobileDock";
import BackgroundErrorBoundary from "./components/BackgroundErrorBoundary";
import VisualIdentityHud from "./components/VisualIdentityHud";
import { CHAPLIN_AUDIO_STYLE_SET } from "./components/background/audioStyleIds";
import VideoBackground, {
  VIDEO_BACKGROUND_STYLE_SET,
  VIDEO_STYLE_TO_INDEX
} from "./components/background/VideoBackground";

// The default (ChromedVortexThree) and audio-reactive (13 visualizers) background
// trees are heavy — lazy-load each so only the branch the user actually selected
// is ever fetched, instead of bundling all of them into the initial chunk.
const ChromedVortexThree = React.lazy(() => import("./components/background/ChromedVortexThree"));
const ChaplinAudioBackgroundCanvas = React.lazy(() => import("./components/background/ChaplinAudioBackgroundCanvas"));

const BACKGROUND_FALLBACK_STYLE = {
  position: "fixed",
  inset: 0,
  zIndex: 0,
  pointerEvents: "none",
  background: "radial-gradient(circle at 50% 30%, #141a24 0%, #05070b 70%)"
};
const BackgroundFallback = () => <div aria-hidden="true" style={BACKGROUND_FALLBACK_STYLE} />;

/* PÁGINAS */
import Login from "./pages/Login";
import Feed from "./pages/Feed";
import Editor from "./pages/Editor";
import Publish from "./pages/Publish";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Radio from "./pages/Radio";
import Inbox from "./pages/Inbox";
import Explore from "./pages/Explore";
import RegisterCyber from "./components/RegisterCyber";
const PlayerLab = (import.meta.env.DEV || window.location.hostname === "localhost") ? React.lazy(() => import("./dev/PlayerLab/PlayerLab")) : null;
const SkinStudio = (import.meta.env.DEV || window.location.hostname === "localhost") ? React.lazy(() => import("./dev/SkinStudio/SkinStudio")) : null;

const MOBILE_PREVIEW_FLAG = "chaplin_mobile_preview";
const ALL_PAGES_FLAG = "chaplin_all_pages_enabled";

const safeSessionGet = (key) => {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSessionSet = (key, value) => {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // ignore storage exceptions on restricted mobile browsers
  }
};

const safeSessionRemove = (key) => {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // ignore storage exceptions on restricted mobile browsers
  }
};

const safeLocalGet = (key) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const getAllPagesEnabled = () => {
  if (typeof window === "undefined") {
    return false;
  }

  // Dev-only escape hatch for previewing protected routes without logging in.
  // Never honored in a production build (import.meta.env.DEV is stripped/false
  // by Vite at build time), so it can't leak into a deployed app as an auth bypass.
  if (!import.meta.env.DEV) {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  const modeParam = params.get("allpages");

  if (modeParam === "1") {
    safeSessionSet(ALL_PAGES_FLAG, "1");
    return true;
  }

  if (modeParam === "0") {
    safeSessionRemove(ALL_PAGES_FLAG);
    return false;
  }

  return safeSessionGet(ALL_PAGES_FLAG) === "1";
};

/* PROTECCIÓN */
const PrivateRoute = ({ children }) => {
  const allPagesEnabled = getAllPagesEnabled();
  if (allPagesEnabled) {
    return children;
  }

  const token = typeof window !== "undefined" ? safeLocalGet("token") : null;
  return token ? children : <Navigate to="/" replace />;
};

const getMobilePreviewMode = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  const modeParam = params.get("mobile");

  if (modeParam === "1") {
    safeSessionSet(MOBILE_PREVIEW_FLAG, "1");
    return true;
  }

  if (modeParam === "0") {
    safeSessionRemove(MOBILE_PREVIEW_FLAG);
    return false;
  }

  return safeSessionGet(MOBILE_PREVIEW_FLAG) === "1";
};

const ThemeBackgroundSync = () => {
  const { skinId, accentColor } = useSkin();
  const { syncFromTheme, autoSyncEnabled, backgroundStyle } = useVortex();
  const videoStyleActive = VIDEO_BACKGROUND_STYLE_SET.has(backgroundStyle);

  React.useEffect(() => {
    if (!autoSyncEnabled || videoStyleActive) {
      return;
    }

    syncFromTheme(skinId, accentColor);
  }, [skinId, accentColor, autoSyncEnabled, videoStyleActive, syncFromTheme]);

  return null;
};

const RegisterRoute = () => {
  const navigate = useNavigate();

  const handleRegister = async (formData) => {
    try {
      await api.post("/auth/register", {
        email: formData.email,
        username: formData.username,
        first_name: formData.firstName,
        last_name: formData.lastName,
        birth_date: formData.birthDate,
        password: formData.password,
        social_goal: formData.socialGoal,
        invitation_code: formData.invitationCode,
        role: formData.role,
        role_other: formData.roleOther || null
      });
      navigate("/login");
    } catch (err) {
      alert(err?.response?.data?.detail || "No se pudo completar el registro.");
    }
  };

  return <RegisterCyber onClose={() => navigate("/login")} onRegister={handleRegister} />;
};

const AppShell = () => {
  const { appTheme } = useSkin();
  const { backgroundStyle } = useVortex();
  const [currentBg, setCurrentBg] = React.useState(0);
  const [mobilePreviewMode, setMobilePreviewMode] = React.useState(getMobilePreviewMode);
  const [allPagesEnabled, setAllPagesEnabled] = React.useState(getAllPagesEnabled);
  const globalLayoutClass = `chaplin-layout-${appTheme?.profile?.layoutTemplate || "classic"}`;
  const visualIdentityClasses = [
    `chaplin-theme-${appTheme?.meta?.id || "y2k"}`,
    `chaplin-hud-${appTheme?.hud?.id || "aero"}`,
    `chaplin-density-${appTheme?.profile?.density || "balanced"}`,
    `chaplin-material-${appTheme?.card?.materialId || "default"}`
  ].join(" ");
  const useAudioBackgroundCanvas = CHAPLIN_AUDIO_STYLE_SET.has(backgroundStyle);
  const useVideoBackground = VIDEO_BACKGROUND_STYLE_SET.has(backgroundStyle);

  React.useEffect(() => {
    if (!useVideoBackground) {
      return;
    }

    const nextIndex = VIDEO_STYLE_TO_INDEX[backgroundStyle];
    if (typeof nextIndex === "number") {
      setCurrentBg(nextIndex);
    }
  }, [backgroundStyle, useVideoBackground]);

  React.useEffect(() => {
    const onLocationChange = () => {
      setMobilePreviewMode(getMobilePreviewMode());
      setAllPagesEnabled(getAllPagesEnabled());
    };

    window.addEventListener("popstate", onLocationChange);
    window.addEventListener("hashchange", onLocationChange);
    return () => {
      window.removeEventListener("popstate", onLocationChange);
      window.removeEventListener("hashchange", onLocationChange);
    };
  }, []);

  React.useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    document.documentElement.classList.toggle("chaplin-all-pages-enabled", allPagesEnabled);
    document.body.classList.toggle("chaplin-all-pages-enabled", allPagesEnabled);

    return () => {
      document.documentElement.classList.remove("chaplin-all-pages-enabled");
      document.body.classList.remove("chaplin-all-pages-enabled");
    };
  }, [allPagesEnabled]);

  React.useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    document.documentElement.classList.toggle("chaplin-mobile-preview", mobilePreviewMode);
    document.body.classList.toggle("chaplin-mobile-preview", mobilePreviewMode);

    return () => {
      document.documentElement.classList.remove("chaplin-mobile-preview");
      document.body.classList.remove("chaplin-mobile-preview");
    };
  }, [mobilePreviewMode]);

  React.useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    document.body.classList.toggle("chaplin-video-bg", useVideoBackground);
    return () => {
      document.body.classList.remove("chaplin-video-bg");
    };
  }, [useVideoBackground]);

  return (
    <ThemeProvider theme={appTheme}>
      <GlobalStyles />
      <ThemeBackgroundSync />

      <BackgroundErrorBoundary resetKey={backgroundStyle}>
        <React.Suspense fallback={<BackgroundFallback />}>
          {useVideoBackground ? (
            <VideoBackground currentBg={currentBg} />
          ) : useAudioBackgroundCanvas ? (
            <ChaplinAudioBackgroundCanvas styleId={backgroundStyle} />
          ) : (
            <ChromedVortexThree />
          )}
        </React.Suspense>
      </BackgroundErrorBoundary>

      <VisualIdentityHud />

      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <div
          className={`chaplin-identity-root ${globalLayoutClass} ${visualIdentityClasses}${mobilePreviewMode ? " chaplin-mobile-preview-app" : ""}`}
          style={{
            minHeight: "100dvh",
            position: "relative",
            zIndex: 1,
            paddingTop: "var(--chaplin-player-panel-offset, 0px)",
            paddingBottom: "var(--chaplin-mobile-dock-offset, 0px)"
          }}
        >
          <FloatingTopIcons />
          <FloatingPlayerButton mobilePreviewMode={mobilePreviewMode} />
          <GlobalMobileDock />

          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<RegisterRoute />} />

            <Route
              path="/feed"
              element={
                <PrivateRoute>
                  <Feed />
                </PrivateRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />

            <Route
              path="/profile/:username"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />

            <Route
              path="/editor"
              element={
                <PrivateRoute>
                  <Editor />
                </PrivateRoute>
              }
            />

            <Route
              path="/publish"
              element={
                <PrivateRoute>
                  <Publish />
                </PrivateRoute>
              }
            />

            <Route
              path="/settings"
              element={
                <PrivateRoute>
                  <Settings />
                </PrivateRoute>
              }
            />

            <Route path="/profile/customize" element={<Navigate to="/settings" replace />} />

            <Route
              path="/radio"
              element={
                <PrivateRoute>
                  <Radio />
                </PrivateRoute>
              }
            />

            <Route
              path="/inbox"
              element={
                <PrivateRoute>
                  <Inbox />
                </PrivateRoute>
              }
            />

            <Route
              path="/explore"
              element={
                <PrivateRoute>
                  <Explore />
                </PrivateRoute>
              }
            />

            {(import.meta.env.DEV || window.location.hostname === "localhost") && (
              <Route
                path="/dev/player-lab/:skinId"
                element={
                  <React.Suspense fallback={null}>
                    <PlayerLab />
                  </React.Suspense>
                }
              />
            )}

            {(import.meta.env.DEV || window.location.hostname === "localhost") && (
              <>
                <Route
                  path="/dev/skin-studio"
                  element={
                    <React.Suspense fallback={null}>
                      <SkinStudio />
                    </React.Suspense>
                  }
                />
                <Route
                  path="/dev/skin-studio/:playerId"
                  element={
                    <React.Suspense fallback={null}>
                      <SkinStudio />
                    </React.Suspense>
                  }
                />
              </>
            )}

            <Route path="/dev/liquid-chrome" element={<Navigate to="/profile" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SkinProvider>
        <PlayerProvider>
          <VortexProvider>
            <AppShell />
          </VortexProvider>
        </PlayerProvider>
      </SkinProvider>
    </AuthProvider>
  );
}
