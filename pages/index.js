// pages/index.js
import { useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/lanes");
  }, [router]);
  return (
    <>
      <Head>
        <title>RapidRoutes</title>
      </Head>
      <main className="min-h-screen flex items-center justify-center bg-[#0f1115] text-gray-100">
        <div className="text-center">
          <h1 className="text-xl font-semibold">RapidRoutes</h1>
          <p className="mt-2 text-sm text-gray-400">Redirecting to Lanes…</p>
        </div>
      </main>
    </>
  );
}
