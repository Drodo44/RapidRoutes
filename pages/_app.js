// pages/_app.js
import "../styles/globals.css";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";
import Image from "next/image";

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();

  // Define routes that should NOT show the global nav
  const noNav = ["/login", "/signup"];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      <Head>
        <title>RapidRoutes</title>
      </Head>

      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        {/* Only render nav when not on login/signup */}
        {!noNav.includes(router.pathname) && (
          <header className="flex items-center justify-between px-8 py-4 bg-gray-900 shadow-md">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="RapidRoutes"
                width={40}
                height={40}
                priority
              />
              <span className="text-xl font-bold tracking-tight">RapidRoutes</span>
            </div>
            <nav className="flex gap-6">
              <Link href="/dashboard"><a className="hover:underline">Dashboard</a></Link>
              <Link href="/lanes"><a className="hover:underline">Lanes</a></Link>
              <Link href="/recap"><a className="hover:underline">Recap</a></Link>
              <Link href="/tools"><a className="hover:underline">Tools</a></Link>
              <button
                onClick={handleLogout}
                className="text-red-400 hover:text-red-500"
              >
                Logout
              </button>
            </nav>
          </header>
        )}

        <main className="flex-grow">
          <Component {...pageProps} />
        </main>
      </div>
    </>
  );
}
