// pages/sales-resources.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import supabase from '../utils/supabaseClient';
import { toast, Toaster } from 'react-hot-toast';

function PromptCard({ prompt, onDownload }) {
    const { title, description, use_case, target_audience, html_content } = prompt;

    const handleCopy = () => {
        if (!html_content) {
            toast.error('No content to copy');
            return;
        }
        navigator.clipboard.writeText(html_content);
        toast.success('Prompt copied!');
    };

    return (
        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 flex flex-col hover:border-cyan-500/30 transition-all group">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">{title}</h3>
                <span className="px-2 py-1 bg-cyan-500/10 text-cyan-400 text-[10px] font-bold rounded uppercase tracking-wider border border-cyan-500/20">
                    Template
                </span>
            </div>

            <p className="text-gray-400 text-sm mb-6 line-clamp-2">{description}</p>

            <div className="space-y-4 mb-8 flex-1">
                {use_case && (
                    <div>
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Use Case</h4>
                        <p className="text-gray-200 text-sm">{use_case}</p>
                    </div>
                )}
                {target_audience && (
                    <div>
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Target Audience</h4>
                        <p className="text-gray-200 text-sm">{target_audience}</p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-auto">
                <button
                    onClick={handleCopy}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/10 transition-all"
                >
                    <span>📋</span> Copy Prompt
                </button>
                <button
                    onClick={() => onDownload(prompt)}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 text-xs font-bold border border-cyan-600/20 transition-all"
                >
                    <span>📥</span> HTML
                </button>
            </div>
        </div>
    );
}

function GeminiChat() {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello! I am your RapidRoutes Gemini assistant. How can I help you with your sales or logistics today?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const response = await fetch('/api/ai/gemini-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: input, history: messages })
            });

            const data = await response.json();
            if (data.reply) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
            } else {
                throw new Error(data.error || 'Failed to get response');
            }
        } catch (err) {
            toast.error(err.message);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please check your API configuration.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-black/40 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-white/10 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-xs">G</span>
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white leading-none">Gemini AI Lab</h3>
                    <p className="text-[10px] text-gray-500 mt-1">Real-time Prompt Testing</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                            m.role === 'user'
                                ? 'bg-cyan-600 text-white rounded-tr-none shadow-lg'
                                : 'bg-white/10 text-gray-200 rounded-tl-none border border-white/5'
                        }`}>
                            {m.content}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white/10 p-3 rounded-2xl rounded-tl-none border border-white/5 flex gap-1">
                            <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-75"></span>
                            <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-150"></span>
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={handleSend} className="p-4 border-t border-white/10 bg-black/20">
                <div className="relative">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask anything..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:border-cyan-500/50 outline-none transition-all"
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-cyan-600 text-white flex items-center justify-center hover:bg-cyan-500 disabled:opacity-50 transition-all shadow-lg shadow-cyan-900/40"
                    >
                        ➜
                    </button>
                </div>
            </form>
        </div>
    );
}

export default function SalesResources() {
    const { profile } = useAuth();
    const [prompts, setPrompts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUploadModal, setShowUploadModal] = useState(false);

    useEffect(() => {
        fetchPrompts();
    }, []);

    async function fetchPrompts() {
        try {
            const { data, error } = await supabase
                .from('ai_prompts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPrompts(data || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleDownload = (prompt) => {
        const blob = new Blob([prompt.html_content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${prompt.title.replace(/\s+/g, '_')}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Download started');
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target.result;
            const title = file.name.split('.')[0];

            const { error } = await supabase.from('ai_prompts').insert([{
                title,
                description: 'Uploaded resource',
                html_content: content,
                category: 'General',
                use_case: 'Sales Enablement',
                target_audience: 'Sales Team'
            }]);

            if (error) {
                toast.error('Upload failed');
            } else {
                toast.success('Resource uploaded!');
                fetchPrompts();
                setShowUploadModal(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <DashboardLayout title="Sales Resources | RapidRoutes">
            <Toaster position="top-right" />
            <div className="min-h-screen bg-[#0a0f18] text-white p-4 lg:p-8">
                <Head>
                    <title>Sales Resources | RapidRoutes</title>
                </Head>

                <div className="max-w-[1600px] mx-auto">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
                        <div>
                            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-white via-cyan-400 to-blue-500 bg-clip-text text-transparent tracking-tight">
                                Sales Intelligence Lab
                            </h1>
                            <p className="text-gray-400 mt-2 text-lg">Weaponize your outreach with AI-powered scripts and resources.</p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all flex items-center gap-2 shadow-xl"
                            >
                                <span>📤</span> Upload Resource
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Main Library */}
                        <div className="lg:col-span-8">
                            {loading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-64 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
                                    ))}
                                </div>
                            ) : prompts.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {prompts.map(p => (
                                        <PromptCard key={p.id} prompt={p} onDownload={handleDownload} />
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white/5 border border-dashed border-white/10 rounded-3xl p-20 text-center">
                                    <div className="w-24 h-24 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <span className="text-5xl">📚</span>
                                    </div>
                                    <h3 className="text-2xl font-bold mb-2">No resources yet</h3>
                                    <p className="text-gray-500 max-w-md mx-auto mb-8">
                                        Upload your first HTML script or prompt template to start building your sales arsenal.
                                    </p>
                                    <button
                                        onClick={() => setShowUploadModal(true)}
                                        className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-cyan-900/40"
                                    >
                                        Get Started
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Gemini Sidebar */}
                        <div className="lg:col-span-4 lg:sticky lg:top-8 h-[calc(100vh-160px)] min-h-[600px]">
                            <GeminiChat />
                        </div>
                    </div>
                </div>

                {/* Simple Upload Modal */}
                {showUploadModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl">
                            <h3 className="text-2xl font-bold text-white mb-4">Upload Sales Resource</h3>
                            <p className="text-gray-400 mb-8 text-sm">Select an HTML or text file containing your script or prompt template.</p>

                            <label className="block">
                                <div className="w-full h-32 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all cursor-pointer">
                                    <span className="text-3xl mb-2">📄</span>
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Click to browse</span>
                                    <input type="file" className="hidden" onChange={handleFileUpload} accept=".html,.txt,.md" />
                                </div>
                            </label>

                            <button
                                onClick={() => setShowUploadModal(false)}
                                className="w-full mt-6 py-3 text-gray-400 hover:text-white font-semibold"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
