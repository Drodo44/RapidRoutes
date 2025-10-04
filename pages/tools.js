// pages/tools.js
import FloorSpaceCalculator from "../components/FloorSpaceCalculator";
import HeavyHaulChecker from "../components/HeavyHaulChecker";

export default function Tools() {
  return (
    <div className="min-h-screen px-6 py-12" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <h1 className="text-4xl font-bold text-center mb-12" style={{ color: 'var(--accent-primary)' }}>
        Tools & Calculators
      </h1>
      <FloorSpaceCalculator />
      <HeavyHaulChecker />
    </div>
  );
}
