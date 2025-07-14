// pages/ric.js
import Link from "next/link";

export default function RIC() {
  const modules = [
    {
      title: "📍 KMA Mapping Trainer",
      desc: "Test your knowledge of DAT markets & cities",
      href: "#",
    },
    {
      title: "🚛 Equipment & Mode Mastery",
      desc: "Understand trailer types, dimensions, and usage scenarios",
      href: "#",
    },
    {
      title: "🧠 Lane Strategy & Smart Posting",
      desc: "Sharpen your ability to choose and sequence effective lanes",
      href: "#",
    },
    {
      title: "📦 LTL vs FTL Logic",
      desc: "Train on when to convert truckload to LTL/Partial",
      href: "#",
    },
    {
      title: "🧨 Overcoming Carrier Objections",
      desc: "Practice rebuttals for deadhead, rate, commodity, etc.",
      href: "#",
    },
  ];

  return (
    <main className="min-h-screen bg-[#0f172a] text-white px-8 py-12">
      <h1 className="text-4xl font-bold text-neon-blue mb-6">
        Routing Intelligence Center (RIC)
      </h1>
      <p className="text-gray-400 mb-10 max-w-2xl">
        This training center is designed to sharpen your freight strategy, improve market knowledge, and prepare you for top-tier execution as a broker, apprentice, or support role.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modules.map((m, i) => (
          <Link
            key={i}
            href={m.href}
            className="bg-[#1e293b] hover:bg-[#273549] p-6 rounded-2xl shadow border border-blue-700 transition-all"
          >
            <h2 className="text-xl font-semibold mb-2">{m.title}</h2>
            <p className="text-gray-300 text-sm">{m.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
