import Navbar from '@/components/Navbar';
import FloorSpaceChecker from '@/components/FloorSpaceChecker';

export default function Dashboard() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#0F1117] text-white px-6 py-8 space-y-8">
        <section className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Welcome to RapidRoutes
          </h1>
          <p className="text-gray-400 mt-2 text-lg italic">
            Where algorithmic intelligence meets AI automation
          </p>
        </section>

        {/* Metric Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#1B1F28] rounded-xl p-5 border border-gray-700">
            <h2 className="text-sm text-gray-400">Total Active Lanes</h2>
            <p className="text-2xl font-semibold mt-1">--</p>
          </div>
          <div className="bg-[#1B1F28] rounded-xl p-5 border border-gray-700">
            <h2 className="text-sm text-gray-400">Postings Today</h2>
            <p className="text-2xl font-semibold mt-1">--</p>
          </div>
          <div className="bg-[#1B1F28] rounded-xl p-5 border border-gray-700">
            <h2 className="text-sm text-gray-400">Archived Lanes</h2>
            <p className="text-2xl font-semibold mt-1">--</p>
          </div>
          <div className="bg-[#1B1F28] rounded-xl p-5 border border-gray-700">
            <h2 className="text-sm text-gray-400">RRSI Score</h2>
            <p className="text-2xl font-semibold mt-1">--</p>
          </div>
        </section>

        {/* Floor Space Calculator */}
        <section className="mt-10">
          <FloorSpaceChecker />
        </section>
      </main>
    </>
  );
}
