// pages/dashboard.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import supabase from "../utils/supabaseClient";
import Image from "next/image";
import { generateDatCsv } from "../lib/generateDatCsv";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [lanes, setLanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!data?.user || error) {
        router.push("/login");
      } else {
        setUser(data.user);
        fetchLanes();
      }
    };

    const fetchLanes = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("lanes").select("*");
      if (!error) setLanes(data || []);
      setLoading(false);
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="flex items-center justify-between px-8 py-4 bg-gray-900 shadow-lg">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="RapidRoutes Logo"
            width={40}
            height={40}
            priority
          />
          <span className="text-2xl font-bold tracking-tight">
            RapidRoutes
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-xl text-white font-semibold"
        >
          Logout
        </button>
      </header>

      <section className="flex-1 p-8">
        <h2 className="text-3xl font-bold mb-6">Your Lanes</h2>
        {loading ? (
          <div className="text-blue-400">Loading lanes...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left bg-gray-900 rounded-xl">
              <thead>
                <tr>
                  <th className="p-3">Origin</th>
                  <th className="p-3">Destination</th>
                  <th className="p-3">Equipment</th>
                  <th className="p-3">Weight</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {lanes.length === 0 ? (
                  <tr>
                    <td className="p-4" colSpan={5}>
                      No lanes found.
                    </td>
                  </tr>
                ) : (
                  lanes.map((lane) => (
                    <tr key={lane.id} className="border-b border-gray-800">
                      <td className="p-3">
                        {lane.origin_city}, {lane.origin_state}
                      </td>
                      <td className="p-3">
                        {lane.dest_city}, {lane.dest_state}
                      </td>
                      <td className="p-3">{lane.equipment}</td>
                      <td className="p-3">{lane.weight}</td>
                      <td className="p-3">{lane.status || "Active"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={() => generateDatCsv(lanes)}
            className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-xl font-semibold text-white"
          >
            Export DAT CSV
          </button>
        </div>
      </section>
    </main>
  );
}
