// pages/prompts/library.js
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../../lib/supabaseClient';
import ErrorBoundary from '../../components/ErrorBoundary';
import { toast } from 'react-hot-toast';

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
      <div className="bg-[#1f2937] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function PromptCard({ prompt, isAdmin, onView, onDownload, onEdit, onDelete }) {
  const { title, description, category, html_content, workflow_type } = prompt;

  const handleCopy = () => {
    if (!html_content) {
      toast.error('No content to copy');
      return;
    }
    navigator.clipboard.writeText(html_content);
    toast.success('Prompt copied to clipboard!');
  };

  const isHtmlWorkflow = workflow_type === 'download_html' || workflow_type === 'Download HTML';

  return (
    <div className="card h-full flex flex-col bg-gray-800 border border-gray-700 rounded-lg overflow-hidden hover:border-blue-500 transition-colors">
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
            <div className="flex flex-wrap gap-2">
              <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-blue-900 text-blue-200">
                {category}
              </span>
              {workflow_type && (
                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${isHtmlWorkflow ? 'bg-purple-900 text-purple-200' : 'bg-green-900 text-green-200'}`}>
                  {workflow_type === 'download_html' ? 'Download HTML' : 'Copy Prompt'}
                </span>
              )}
            </div>
          </div>
          {isAdmin && (
            <div className="flex space-x-2">
              <button onClick={() => onEdit(prompt)} className="p-1 text-gray-400 hover:text-blue-400 transition-colors" title="Edit">
                ✏️
              </button>
              <button onClick={() => onDelete(prompt.id)} className="p-1 text-gray-400 hover:text-red-400 transition-colors" title="Delete">
                🗑️
              </button>
            </div>
          )}
        </div>
        <p className="text-gray-400 text-sm mb-6 flex-1">{description}</p>
        <div className="flex justify-end space-x-2 mt-auto pt-4 border-t border-gray-700">
          {!isHtmlWorkflow && (
            <button onClick={handleCopy} className="px-3 py-1 text-sm border border-gray-600 rounded hover:bg-gray-700 text-gray-300 transition-colors">Copy</button>
          )}
          {!isHtmlWorkflow && (
            <button onClick={() => onView(prompt)} className="px-3 py-1 text-sm border border-gray-600 rounded hover:bg-gray-700 text-gray-300 transition-colors">View</button>
          )}
          <button onClick={() => onDownload(prompt)} className={`px-3 py-1 text-sm border rounded transition-colors ${isHtmlWorkflow ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700' : 'border-gray-600 hover:bg-gray-700 text-gray-300'}`}>
            Download
          </button>
        </div>
      </div>
    </div>
  );
}

function PromptLibrary() {
  const router = useRouter();
  const { loading, isAuthenticated, profile } = useAuth();
  const [prompts, setPrompts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  
  // Modal States
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  
  // Form States
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    category: 'General', 
    html_content: '',
    workflow_type: 'Copy Prompt' // Default
  });
  const [suggestionTitle, setSuggestionTitle] = useState('');
  const [suggestionText, setSuggestionText] = useState('');

  const isAdmin = profile?.role === 'Admin';

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPrompts();
      if (isAdmin) fetchSuggestions();
    }
  }, [isAuthenticated, isAdmin]);

  async function fetchPrompts() {
    const { data, error } = await supabase.from('ai_prompts').select('*').order('created_at', { ascending: false });
    if (error) console.error('Error fetching prompts:', error);
    else setPrompts(data || []);
  }

  async function fetchSuggestions() {
    const { data, error } = await supabase.from('prompt_suggestions').select('*').order('created_at', { ascending: false });
    if (error) console.error('Error fetching suggestions:', error);
    else setSuggestions(data || []);
  }

  const handleView = (prompt) => {
    setSelectedPrompt(prompt);
    setViewModalOpen(true);
  };

  const handleDownload = (prompt) => {
    const isHtml = prompt.workflow_type === 'download_html' || prompt.workflow_type === 'Download HTML';
    const extension = isHtml ? 'html' : 'txt';
    const mimeType = isHtml ? 'text/html' : 'text/plain';
    
    const element = document.createElement("a");
    const file = new Blob([prompt.html_content], {type: mimeType});
    element.href = URL.createObjectURL(file);
    // Format filename: RapidRoutes_Prompt_Name.html
    const safeTitle = prompt.title.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
    element.download = `RapidRoutes_${safeTitle}.${extension}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success(`Download started (${extension.toUpperCase()})`);
  };

  const handleEdit = (prompt) => {
    let wf = prompt.workflow_type || 'copy';
    if (wf === 'Download HTML') wf = 'download_html';
    if (wf === 'Copy Prompt') wf = 'copy';

    setFormData({
      title: prompt.title,
      description: prompt.description,
      category: prompt.category,
      html_content: prompt.html_content,
      workflow_type: wf
    });
    setSelectedPrompt(prompt);
    setEditModalOpen(true);
  };

  const handleAddNew = () => {
    setFormData({ 
      title: '', 
      description: '', 
      category: 'General', 
      html_content: '',
      workflow_type: 'copy'
    });
    setSelectedPrompt(null);
    setEditModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this prompt?')) return;
    
    const { error } = await supabase.from('ai_prompts').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete prompt');
    } else {
      toast.success('Prompt deleted');
      fetchPrompts();
    }
  };

  const handleSavePrompt = async (e) => {
    e.preventDefault();
    const isUpdate = !!selectedPrompt;
    
    // Ensure workflow_type is saved (might need schema update if column doesn't exist, 
    // but for now we can store it. If schema is strict, we might need to add the column first)
    // Assuming we can add it or use metadata. For now, let's try to save it.
    // If the column doesn't exist in DB, this might fail. 
    // We should probably add the column to the DB schema first.
    
    let result;
    if (isUpdate) {
      result = await supabase.from('ai_prompts').update(formData).eq('id', selectedPrompt.id);
    } else {
      result = await supabase.from('ai_prompts').insert([formData]);
    }

    if (result.error) {
      console.error('Save error:', result.error);
      toast.error(`Failed to ${isUpdate ? 'update' : 'create'} prompt. ${result.error.message}`);
    } else {
      toast.success(`Prompt ${isUpdate ? 'updated' : 'created'} successfully`);
      setEditModalOpen(false);
      fetchPrompts();
    }
  };

  const handleSuggestionSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('prompt_suggestions')
      .insert([{ suggestion_title: suggestionTitle, suggestion_text: suggestionText }]);
    
    if (error) {
      toast.error('Failed to submit suggestion');
    } else {
      toast.success('Suggestion submitted! Thank you.');
      setSuggestionTitle('');
      setSuggestionText('');
      if (isAdmin) fetchSuggestions();
    }
  };

  const filteredPrompts = activeCategory === 'All' 
    ? prompts 
    : prompts.filter(p => p.category === activeCategory);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111827] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading Library...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>AI Prompt Library | RapidRoutes</title>
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">AI Prompt Library</h1>
            <p className="text-gray-400">Curated templates for logistics and freight brokerage.</p>
          </div>
          {isAdmin && (
            <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors flex items-center">
              <span className="mr-2">+</span> Add New Prompt
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="flex space-x-2 mb-8 overflow-x-auto pb-2">
          {['All', 'General', 'Logistics', 'Creative', 'Sales', 'Operations'].map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Prompts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredPrompts.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              isAdmin={isAdmin}
              onView={handleView}
              onDownload={handleDownload}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {/* Suggestions Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Submit Suggestion Form */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Suggest a New Prompt</h2>
            <form onSubmit={handleSuggestionSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
                <input
                  type="text"
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-blue-500 focus:outline-none"
                  value={suggestionTitle}
                  onChange={(e) => setSuggestionTitle(e.target.value)}
                  required
                  placeholder="e.g., Rate Confirmation Email"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">Details</label>
                <textarea
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-blue-500 focus:outline-none"
                  rows="4"
                  value={suggestionText}
                  onChange={(e) => setSuggestionText(e.target.value)}
                  placeholder="Describe what this prompt should do..."
                ></textarea>
              </div>
              <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded transition-colors">
                Submit Suggestion
              </button>
            </form>
          </div>

          {/* Admin View: Recent Suggestions */}
          {isAdmin && (
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-4">Recent Suggestions (Admin Only)</h2>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {suggestions.length === 0 ? (
                  <p className="text-gray-500">No suggestions yet.</p>
                ) : (
                  suggestions.map(s => (
                    <div key={s.id} className="bg-gray-900 p-4 rounded border border-gray-700">
                      <h4 className="font-bold text-white">{s.suggestion_title}</h4>
                      <p className="text-gray-400 text-sm mt-1">{s.suggestion_text}</p>
                      <div className="text-xs text-gray-500 mt-2">
                        {new Date(s.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View Modal */}
      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title={selectedPrompt?.title}>
        <div className="space-y-4">
          <div>
            <span className="text-sm text-gray-400">Category:</span>
            <span className="ml-2 inline-block px-2 py-1 text-xs font-semibold rounded bg-blue-900 text-blue-200">
              {selectedPrompt?.category}
            </span>
            {selectedPrompt?.workflow_type && (
              <span className="ml-2 inline-block px-2 py-1 text-xs font-semibold rounded bg-purple-900 text-purple-200">
                {selectedPrompt.workflow_type === 'download_html' ? 'Download HTML' : 'Copy Prompt'}
              </span>
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-2">Description</h4>
            <p className="text-gray-300">{selectedPrompt?.description}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-2">Prompt Content</h4>
            <div className="bg-gray-900 p-4 rounded border border-gray-700 font-mono text-sm text-gray-300 whitespace-pre-wrap max-h-[400px] overflow-y-auto">
              {selectedPrompt?.html_content}
            </div>
          </div>
          <div className="flex justify-end pt-4 space-x-2">
            <button 
              onClick={() => {
                navigator.clipboard.writeText(selectedPrompt?.html_content);
                toast.success('Copied to clipboard');
              }}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
            >
              Copy Content
            </button>
            <button 
              onClick={() => handleDownload(selectedPrompt)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
            >
              Download File
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit/Add Modal */}
      <Modal 
        isOpen={editModalOpen} 
        onClose={() => setEditModalOpen(false)} 
        title={selectedPrompt ? 'Edit Prompt' : 'Add New Prompt'}
      >
        <form onSubmit={handleSavePrompt} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
            <input
              type="text"
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-blue-500 focus:outline-none"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
              <select
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-blue-500 focus:outline-none"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                {['General', 'Logistics', 'Creative', 'Sales', 'Operations'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Workflow Intention</label>
              <select
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-blue-500 focus:outline-none"
                value={formData.workflow_type}
                onChange={(e) => setFormData({...formData, workflow_type: e.target.value})}
              >
                <option value="copy">Copy Prompt</option>
                <option value="download_html">Download HTML</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
            <input
              type="text"
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-blue-500 focus:outline-none"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Content (HTML or Text)</label>
            <textarea
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-blue-500 focus:outline-none font-mono"
              rows="10"
              value={formData.html_content}
              onChange={(e) => setFormData({...formData, html_content: e.target.value})}
              required
            ></textarea>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button 
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 rounded text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              Save Prompt
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default PromptLibrary;
