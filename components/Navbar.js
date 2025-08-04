import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import Image from "next/image";
import logo from "../public/logo.png";

export default function Navbar() {
  const router = useRouter();
  const [name, setName] = useState("");

  useEffect(() => {
    const getProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", session.user.id)
          .single();
        if (data?.name) setName(data.name);
      }
    };

    getProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800 shadow-sm">
      <div className="flex items-center gap-3">
        <Image src={logo} alt="Logo" width={40} height={40} />
        <h1 className="text-white text-xl font-bold">RapidRoutes</h1>
      </div>
      <div className="flex items-center gap-4">
        <p className="text-gray-300 hidden md:block">Logged in as: <span className="font-semibold">{name || "User"}</span></p>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
