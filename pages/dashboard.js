import Navbar from "../components/Navbar";
import FloorSpaceCalculator from "../components/FloorSpaceChecker";
import HeavyHaulChecker from "../components/HeavyHaulChecker";

export default function Dashboard() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-950 text-white py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-cyan-400 mb-8 text-center">
            RapidRoutes Dashboard
          </h1>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Floor Space Calculator */}
            <div className="bg-[#1e293b] p-6 rounded-2xl shadow-md">
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">📦 Floor Space Calculator</h2>
              <FloorSpaceCalculator />
            </div>

            {/* Heavy Haul Checker */}
            <div className="bg-[#1e293b] p-6 rounded-2xl shadow-md">
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">🚛 Heavy Haul Compliance Checker</h2>
              <HeavyHaulChecker />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
