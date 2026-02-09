import React, { useState } from 'react';
import Head from 'next/head';

export default function SalesResources() {
    const [activeTab, setActiveTab] = useState('scripts');

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6">
            <Head>
                <title>Sales Resources | RapidRoutes</title>
            </Head>

            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            Sales Resources
                        </h1>
                        <p className="text-gray-400 mt-2">Scripts, Battle Cards, and Market Intelligence</p>
                    </div>
                </div>

                {/* Content Placeholder / Upload Area */}
                <div className="glass-card p-12 border border-dashed border-white/20 rounded-xl text-center bg-white/5">
                    <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">📂</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Resource Library Empty</h2>
                    <p className="text-gray-400 max-w-md mx-auto mb-8">
                        The previous resources (HTML prompts, flowcharts, PDFs) are missing from the repository.
                        Please upload them here when you have access to your backups.
                    </p>

                    <button className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg shadow-lg shadow-cyan-900/20 transition-all flex items-center gap-2 mx-auto">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Upload Resources
                    </button>
                </div>
            </div>

            <style jsx>{`
        .glass-card {
            background: linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%);
            backdrop-filter: blur(12px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }
      `}</style>
        </div>
    );
}
