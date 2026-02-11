export default function AppBackground({ children }) {
  return (
    <div className="rr-app-background">
      <div className="rr-bg-layer-base" aria-hidden="true" />
      <div className="rr-bg-layer-glow" aria-hidden="true" />
      <div className="rr-bg-layer-noise" aria-hidden="true" />

      <div className="rr-bg-content">{children}</div>
    </div>
  );
}
