"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import supabase from "../utils/supabaseClient";
import Image from "next/image";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("../components/WeeklyChart"), { ssr: false });

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
          <Image src="/logo.png" alt="RapidRoutes Logo" width={40} height={40} priority />
          <span className="text-2xl font-bold tracking-tight">RapidRoutes</span>
        </div>
        <button
          onClick={handleLogout}
          className="bg-blue-700 hover:bg-
