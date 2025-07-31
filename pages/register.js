// pages/register.js
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function Register() {
  const [status, setStatus] = useState("Loading...");

  useEffect(() => {
    const checkStatus = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) return setStatus("Not logged in");

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (!profile) {
        setStatus("Your request has been submitted. An admin will review it shortly.");
      } else if (profile.role === "Apprentice") {
        setStatus("Welcome Apprentice! Limited access until approval.");
      } else {
        setStatus("You are already approved.");
      }
    };

    checkStatus();
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="bg-[#1e293b] p-6 rounded-xl shadow-xl max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-cyan-400 mb-4">Registration Status</h1>
        <p className="text-lg text-gray-300">{status}</p>
      </div>
    </main>
  );
}
