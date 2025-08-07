// pages/tools.js
import FloorSpaceCalculator from "../components/FloorSpaceCalculator";
import HeavyHaulChecker from "../components/HeavyHaulChecker";

export default function Tools() {
  return (
    <div className="min-h-screen bg-gray-950 text-white px-6 py-12">
      <h1 className="text-4xl font-bold text-center mb-12 text-cyan-400">
        Tools & Calculators
      </h1>
      <FloorSpaceCalculator />
      <HeavyHaulChecker />
    </div>
  );
}
