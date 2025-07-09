import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen items-center justify-center bg-gray-950">
      <div className="flex flex-col items-center">
        <Image src="/logo.png" alt="RapidRoutes Logo" width={120} height={120} priority />
        <h1 className="text-4xl font-bold mt-4 text-white drop-shadow-lg">RapidRoutes</h1>
        <p className="mt-2 text-xl text-blue-200 font-medium">The Gold Standard in Freight Brokerage Intelligence</p>
        <div className="mt-8">
          <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-8 rounded-2xl text-lg font-semibold shadow-lg transition">
            Sign In
          </Link>
        </div>
        <div className="mt-8 text-blue-400">
          <a href="https://totalqualitylogistics.com/" target="_blank" rel="noopener noreferrer" className="underline text-sm opacity-70">
            Created by Andrew Connellan – Logistics Account Executive at Total Quality Logistics HQ: Cincinnati, OH
          </a>
        </div>
      </div>
    </main>
  );
}

