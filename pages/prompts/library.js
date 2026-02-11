// Legacy prompt library page (deprecated route)
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

function PromptCard({ prompt, isAdmin, onView, onDownload, onEdit, onDelete, isFavorite, onToggleFavorite }) {
  const { title, description, category, html_content, workflow_type, use_case, target_audience, created_at } = prompt;

  const handleCopy = () => {
    if (!html_content) {
      toast.error('No content to copy');
      return;
    }
    navigator.clipboard.writeText(html_content);
    toast.success('Prompt copied to clipboard!');
  };

  const isHtmlWorkflow = workflow_type === 'download_html' || workflow_type === 'Download HTML';
  const isFileWorkflow = workflow_type === 'download_file' || workflow_type === 'Download File';
  
  const isNew = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  return (
    <div className="card h-full flex flex-col bg-gray-800 border border-gray-700 rounded-lg overflow-hidden hover:border-blue-500 transition-all duration-200 shadow-lg hover:shadow-blue-900/20 relative group">
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-lg font-bold text-white leading-tight">{title}</h3>
              {isNew(created_at) && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-sm animate-pulse">
                  🔥 NEW
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/50 text-blue-200 border border-blue-800">
                {category}
              </span>
              {workflow_type && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  isHtmlWorkflow 
                    ? 'bg-purple-900/50 text-purple-200 border-purple-800' 
                    : isFileWorkflow
                    ? 'bg-teal-900/50 text-teal-200 border-teal-800'
                    : 'bg-green-900/50 text-green-200 border-green-800'
                }`}>
                  {workflow_type === 'download_html' ? 'Download HTML' : workflow_type === 'download_file' ? 'Download File' : 'Copy Prompt'}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            <button 
              onClick={() => onToggleFavorite(prompt.id)} 
              className={`p-1.5 rounded-full transition-colors ${isFavorite ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-600 hover:text-yellow-400'}`}
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <svg className="w-5 h-5" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>

            {isAdmin && (
              <div className="flex space-x-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEdit(prompt)} className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-full transition-colors" title="Edit">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button onClick={() => onDelete(prompt.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-full transition-colors" title="Delete">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-4 mb-6 flex-1">
          {description && <p className="text-gray-300 text-sm leading-relaxed">{description}</p>}
          
          {(use_case || target_audience) && <div className="border-t border-gray-700/50 my-4"></div>}
          
          {use_case && (
            <div>
              <div className="flex items-center mb-1.5">
                <svg className="w-3.5 h-3.5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Use Case</h4>
              </div>
              <p className="text-gray-200 text-sm pl-5.5">{use_case}</p>
            </div>
          )}
          
          {target_audience && (
            <div>
              <div className="flex items-center mb-1.5">
                <svg className="w-3.5 h-3.5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target Audience</h4>
              </div>
              <p className="text-gray-200 text-sm pl-5.5">{target_audience}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 mt-auto pt-4 border-t border-gray-700">
          {!isHtmlWorkflow && !isFileWorkflow && (
            <button onClick={handleCopy} className="flex items-center px-3 py-1.5 text-sm border border-gray-600 rounded hover:bg-gray-700 text-gray-300 transition-colors">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy
            </button>
          )}
          {!isHtmlWorkflow && !isFileWorkflow && (
            <button onClick={() => onView(prompt)} className="flex items-center px-3 py-1.5 text-sm border border-gray-600 rounded hover:bg-gray-700 text-gray-300 transition-colors">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View
            </button>
          )}
          {isHtmlWorkflow && (
            <button onClick={() => onDownload(prompt)} className="flex items-center px-4 py-2 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download HTML
            </button>
          )}
          {isFileWorkflow && (
            <button onClick={() => window.open(prompt.html_content, '_blank')} className="flex items-center px-4 py-2 text-sm font-medium rounded bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download File
            </button>
          )}
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
  const [favorites, setFavorites] = useState(new Set());
  
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
    workflow_type: 'copy', // Default
    use_case: '',
    target_audience: ''
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
      fetchFavorites();
      if (isAdmin) fetchSuggestions();
    }
  }, [isAuthenticated, isAdmin]);

  async function fetchPrompts() {
    const { data, error } = await supabase.from('ai_prompts').select('*').order('created_at', { ascending: false });
    if (error) console.error('Error fetching prompts:', error);
    else setPrompts(data || []);
  }

  async function fetchFavorites() {
    const { data, error } = await supabase.from('user_favorite_prompts').select('prompt_id');
    if (error) console.error('Error fetching favorites:', error);
    else {
      setFavorites(new Set(data.map(f => f.prompt_id)));
    }
  }

  const handleToggleFavorite = async (promptId) => {
    const isFav = favorites.has(promptId);
    const newFavorites = new Set(favorites);
    
    if (isFav) {
      newFavorites.delete(promptId);
      setFavorites(newFavorites);
      const { error } = await supabase.from('user_favorite_prompts').delete().match({ prompt_id: promptId, user_id: profile.id });
      if (error) {
        toast.error('Failed to remove favorite');
        newFavorites.add(promptId); // Revert
        setFavorites(newFavorites);
      }
    } else {
      newFavorites.add(promptId);
      setFavorites(newFavorites);
      const { error } = await supabase.from('user_favorite_prompts').insert([{ prompt_id: promptId, user_id: profile.id }]);
      if (error) {
        toast.error('Failed to add favorite');
        newFavorites.delete(promptId); // Revert
        setFavorites(newFavorites);
      }
    }
  };

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
    const extension = 'html';
    const mimeType = 'text/html';
    
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
    if (wf === 'Download File') wf = 'download_file';

    setFormData({
      title: prompt.title,
      description: prompt.description,
      category: prompt.category,
      html_content: prompt.html_content,
      workflow_type: wf,
      use_case: prompt.use_case || '',
      target_audience: prompt.target_audience || ''
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
      workflow_type: 'copy',
      use_case: '',
      target_audience: ''
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

  const filteredPrompts = prompts.filter(p => {
    if (activeCategory === 'All') return true;
    if (activeCategory === 'Favorites') return favorites.has(p.id);
    return p.category === activeCategory;
  });

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
        <title>Sales Resources | RapidRoutes</title>
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Sales Resources</h1>
            <p className="text-gray-400">Curated templates, scripts, and flow charts for freight brokerage.</p>
          </div>
          {isAdmin && (
            <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors flex items-center">
              <span className="mr-2">+</span> Add New Resource
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="flex space-x-2 mb-8 overflow-x-auto pb-2">
          {['All', 'Favorites', 'General', 'Logistics', 'Creative', 'Sales', 'Operations', 'Flowcharts'].map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {cat === 'Favorites' ? '★ Favorites' : cat}
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
              isFavorite={favorites.has(prompt.id)}
              onToggleFavorite={handleToggleFavorite}
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
                {['General', 'Logistics', 'Creative', 'Sales', 'Operations', 'Flowcharts'].map(c => (
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
                <option value="download_file">Download File (URL)</option>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Use Case</label>
              <input
                type="text"
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-blue-500 focus:outline-none"
                value={formData.use_case}
                onChange={(e) => setFormData({...formData, use_case: e.target.value})}
                placeholder="e.g. Cold Outreach"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Target Audience</label>
              <input
                type="text"
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-blue-500 focus:outline-none"
                value={formData.target_audience}
                onChange={(e) => setFormData({...formData, target_audience: e.target.value})}
                placeholder="e.g. Prospects"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {formData.workflow_type === 'download_file' ? 'File URL (e.g. Google Drive, Dropbox link)' : 'Content (HTML or Text)'}
            </label>
            <textarea
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-blue-500 focus:outline-none font-mono"
              rows="10"
              value={formData.html_content}
              onChange={(e) => setFormData({...formData, html_content: e.target.value})}
              required
              placeholder={formData.workflow_type === 'download_file' ? 'https://...' : 'Enter content here...'}
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
