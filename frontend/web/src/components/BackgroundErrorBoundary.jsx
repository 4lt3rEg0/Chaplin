import React from "react";

const FALLBACK_STYLE = {
  position: "fixed",
  inset: 0,
  zIndex: 0,
  pointerEvents: "none",
  background: "radial-gradient(circle at 50% 30%, #141a24 0%, #05070b 70%)"
};

// Isolates the WebGL/background layer from the rest of Chaplin: a broken
// visualizer (shader compile failure, runtime WebGL exception, etc.) renders
// a cheap static fallback instead of taking down the entire React tree —
// the player, routing and UI all keep working underneath it.
class BackgroundErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[Chaplin] Background visualizer crashed — falling back to static background.", error, info);
  }

  componentDidUpdate(prevProps) {
    // Give a freshly-selected background a clean chance even if a previous one crashed.
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return <div aria-hidden="true" style={FALLBACK_STYLE} />;
    }
    return this.props.children;
  }
}

export default BackgroundErrorBoundary;
