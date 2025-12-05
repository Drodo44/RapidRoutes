// pages/prompts/library.js
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../../lib/supabaseClient';
import ErrorBoundary from '../../components/ErrorBoundary';
import { toast } from 'react-hot-toast';

function Section({ title, right, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        {right}
      </div>
      <div className="card-body">{children}</div>
    </section>
  );
}

function PromptCard({ title, description, category, content }) {
  const handleCopy = () => {
    if (!content) {
      toast.error('No content to copy');
      return;
    }
    navigator.clipboard.writeText(content);
    toast.success('Prompt copied to clipboard!');
  };

  return (
    <div className="card">
      <div className="card-body">
        <h3 className="card-title">{title}</h3>
        <p className="text-gray-500">{category}</p>
        <p>{description}</p>
        <div className="flex justify-end space-x-2 mt-4">
          <button onClick={handleCopy} className="btn btn-sm btn-outline">Copy</button>
          <button className="btn btn-sm btn-outline">View</button>
          <button className="btn btn-sm btn-outline">Download</button>
        </div>
      </div>
    </div>
  );
}

function PromptLibrary() {
  const router = useRouter();
  const { loading, isAuthenticated } = useAuth();
  const [prompts, setPrompts] = useState([]);
  const [suggestionTitle, setSuggestionTitle] = useState('');
  const [suggestionText, setSuggestionText] = useState('');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    async function fetchPrompts() {
      const { data, error } = await supabase.from('ai_prompts').select('*');
      if (error) {
        console.error('Error fetching prompts:', error);
      } else {
        setPrompts(data);
      }
    }
    if (isAuthenticated) {
      fetchPrompts();
    }
  }, [isAuthenticated]);

  const handleSuggestionSubmit = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from('prompt_suggestions')
      .insert([{ suggestion_title: suggestionTitle, suggestion_text: suggestionText }]);
    if (error) {
      console.error('Error submitting suggestion:', error);
    } else {
      setSuggestionTitle('');
      setSuggestionText('');
      // Show a success message
    }
  };

  if (loading || !isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 16px' }}></div>
          <p style={{ fontSize: '18px' }}>Loading Prompt Library...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>AI Prompt Library | RapidRoutes</title>
      </Head>
      
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">AI Prompt Library & Idea Bank</h1>
          <p className="page-subtitle">A collection of prompts for various AI models and a place to suggest new ideas.</p>
        </div>

        <div className="mb-8">
          {/* Category Filter */}
          <div className="flex space-x-2">
            <button className="btn btn-sm btn-active">All</button>
            <button className="btn btn-sm">General</button>
            <button className="btn btn-sm">Logistics</button>
            <button className="btn btn-sm">Creative</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prompts.map((prompt) => (
            <PromptCard
              key={prompt.id}
              title={prompt.title}
              description={prompt.description}
              category={prompt.category}
              content={prompt.html_content}
            />
          ))}
        </div>

        <div className="mt-12">
          <Section title="Suggest a New Prompt Idea">
            <form onSubmit={handleSuggestionSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="suggestion-title">Suggestion Title</label>
                <input
                  id="suggestion-title"
                  className="form-input"
                  type="text"
                  value={suggestionTitle}
                  onChange={(e) => setSuggestionTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="suggestion-text">Suggestion Details</label>
                <textarea
                  id="suggestion-text"
                  className="form-input"
                  rows="4"
                  value={suggestionText}
                  onChange={(e) => setSuggestionText(e.target.value)}
                ></textarea>
              </div>
              <button type="submit" className="btn btn-primary mt-4">Submit Suggestion</button>
            </form>
          </Section>
        </div>
      </div>
    </>
  );
}

export default PromptLibrary;
