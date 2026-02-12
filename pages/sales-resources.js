import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../components/DashboardLayout';
import AppBackground from '../components/ui/AppBackground';
import { useAuth } from '../contexts/AuthContext';
import supabase from '../utils/supabaseClient';

const TAB_OPTIONS = ['All', 'Email Prompts', 'Flowcharts', 'Lead Gen', 'Company Information', 'Favorites'];
const CATEGORY_OPTIONS = TAB_OPTIONS.filter((tab) => tab !== 'All' && tab !== 'Favorites');
const FAVORITE_KEY_CANDIDATES = ['prompt_card_id', 'card_id', 'prompt_id'];

const QUICK_PROMPTS = [
  'Draft a concise cold-call opener for a food shipper with late-pickup pain.',
  'Give me 3 pricing objection responses that keep tone collaborative.',
  'Create a short follow-up email after no reply for 5 days.',
  'Summarize why lane volatility justifies proactive communication this week.'
];

const INITIAL_CHAT = [
  {
    role: 'assistant',
    content: 'I can help you draft sales scripts, objection responses, and follow-ups. Ask for concise output with shipper context.'
  }
];

function createEmptyCardForm() {
  return {
    title: '',
    category: CATEGORY_OPTIONS[0],
    description: '',
    useCase: '',
    targetAudience: '',
    promptText: '',
    html: '',
    badge: '',
    allowCopyPrompt: true,
    allowDownloadHtml: true,
    allowView: false
  };
}

function createEmptySuggestionForm() {
  return {
    title: '',
    category: CATEGORY_OPTIONS[0],
    description: '',
    promptText: ''
  };
}

function getErrorMessage(error, fallbackMessage) {
  if (error?.message && typeof error.message === 'string') {
    return error.message;
  }
  return fallbackMessage;
}

function isPolicyError(error) {
  const message = getErrorMessage(error, '').toLowerCase();
  return message.includes('policy') || message.includes('row-level security') || message.includes('rls');
}

function isMissingColumnError(error) {
  const message = getErrorMessage(error, '').toLowerCase();
  return message.includes('does not exist') || message.includes('unknown column') || error?.code === 'PGRST204';
}

function slugifyTitle(title) {
  const normalized = String(title || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'prompt';
}

function trimStringValue(value) {
  return String(value || '').trim();
}

function isFlowchartsCategory(category) {
  return trimStringValue(category).toLowerCase() === 'flowcharts';
}

function looksLikeMermaidSyntax(text) {
  return /^\s*(graph|flowchart)\b/i.test(String(text || ''));
}

function hasRenderableHtml(html) {
  return /<(svg|img|iframe|div|section|article|main|p|table|ul|ol|h1|h2|h3|canvas|pre)\b/i.test(String(html || ''));
}

function sanitizeFlowchartHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '');
}

function getCardActionConfig(card) {
  const promptText = trimStringValue(card?.prompt_text);
  const html = trimStringValue(card?.html);
  const isFlowchart = isFlowchartsCategory(card?.category);
  const hasMermaidPrompt = looksLikeMermaidSyntax(promptText);

  return {
    isFlowchart,
    hasPromptText: promptText.length > 0,
    hasHtml: html.length > 0,
    hasMermaidPrompt,
    canCopyPrompt: !isFlowchart && promptText.length > 0,
    canDownloadHtml: html.length > 0,
    canViewFlowchart: isFlowchart && (html.length > 0 || hasMermaidPrompt)
  };
}

function getFavoriteCardId(row, preferredKey) {
  const keysToTry = [preferredKey, ...FAVORITE_KEY_CANDIDATES].filter(Boolean);
  for (const key of keysToTry) {
    if (row && row[key]) return row[key];
  }
  return null;
}

function detectFavoriteKey(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  for (const candidate of FAVORITE_KEY_CANDIDATES) {
    if (rows.some((row) => Object.prototype.hasOwnProperty.call(row || {}, candidate))) {
      return candidate;
    }
  }
  return null;
}

export default function SalesResources() {
  const router = useRouter();
  const { loading, isAuthenticated, user, profile } = useAuth();
  const chatInputRef = useRef(null);

  const isAdmin = profile?.role?.toLowerCase() === 'admin';

  const [activeTab, setActiveTab] = useState('All');
  const [promptCards, setPromptCards] = useState([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [cardsError, setCardsError] = useState('');
  const [actionError, setActionError] = useState('');
  const [policyError, setPolicyError] = useState('');
  const [favoriteKey, setFavoriteKey] = useState(FAVORITE_KEY_CANDIDATES[0]);

  const [messages, setMessages] = useState(INITIAL_CHAT);
  const [draftMessage, setDraftMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState('');

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState(null);
  const [cardForm, setCardForm] = useState(createEmptyCardForm());
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [isFlowchartViewerOpen, setIsFlowchartViewerOpen] = useState(false);
  const [activeFlowchartCard, setActiveFlowchartCard] = useState(null);

  const [suggestionForm, setSuggestionForm] = useState(createEmptySuggestionForm());
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);
  const [suggestionNotice, setSuggestionNotice] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState('');

  const blockedByPolicy = Boolean(policyError);

  const filteredCards = useMemo(() => {
    if (activeTab === 'All') return promptCards;
    if (activeTab === 'Favorites') return promptCards.filter((card) => card.isFavorite);

    return promptCards.filter(
      (card) => String(card.category || '').trim().toLowerCase() === activeTab.toLowerCase()
    );
  }, [activeTab, promptCards]);

  const favoriteKeyOrder = useMemo(() => {
    return [...new Set([favoriteKey, ...FAVORITE_KEY_CANDIDATES].filter(Boolean))];
  }, [favoriteKey]);

  const activeFlowchartConfig = useMemo(() => getCardActionConfig(activeFlowchartCard), [activeFlowchartCard]);
  const sanitizedFlowchartHtml = useMemo(
    () => sanitizeFlowchartHtml(activeFlowchartCard?.html || ''),
    [activeFlowchartCard?.html]
  );
  const activeFlowchartPrompt = useMemo(
    () => trimStringValue(activeFlowchartCard?.prompt_text),
    [activeFlowchartCard?.prompt_text]
  );

  const setPolicyErrorAndStop = useCallback((context, error) => {
    const message = `${context}: ${getErrorMessage(error, 'Policy validation failed.')}`;
    setPolicyError(message);
    setCardsError(message);
    setActionError(message);
  }, []);

  const loadPromptCards = useCallback(async () => {
    if (!user?.id || !supabase) return;

    setIsLoadingCards(true);
    setCardsError('');

    try {
      const [cardsResponse, favoritesResponse] = await Promise.all([
        supabase.from('prompt_cards').select('*').order('created_at', { ascending: false }),
        supabase.from('prompt_favorites').select('*').eq('user_id', user.id)
      ]);

      if (cardsResponse.error) {
        if (isPolicyError(cardsResponse.error)) {
          setPolicyErrorAndStop('prompt_cards fetch failed', cardsResponse.error);
          return;
        }
        throw cardsResponse.error;
      }

      if (favoritesResponse.error) {
        if (isPolicyError(favoritesResponse.error)) {
          setPolicyErrorAndStop('prompt_favorites fetch failed', favoritesResponse.error);
          return;
        }
        throw favoritesResponse.error;
      }

      const favoritesRows = favoritesResponse.data || [];
      const detectedFavoriteKey = detectFavoriteKey(favoritesRows);
      if (detectedFavoriteKey) {
        setFavoriteKey(detectedFavoriteKey);
      }

      const favoriteIds = new Set(
        favoritesRows
          .map((row) => getFavoriteCardId(row, detectedFavoriteKey || favoriteKey))
          .filter(Boolean)
          .map((value) => String(value))
      );

      const mergedCards = (cardsResponse.data || []).map((card) => ({
        ...card,
        isFavorite: favoriteIds.has(String(card.id))
      }));

      setPromptCards(mergedCards);
    } catch (error) {
      setCardsError(getErrorMessage(error, 'Unable to load prompt cards.'));
    } finally {
      setIsLoadingCards(false);
    }
  }, [favoriteKey, setPolicyErrorAndStop, user?.id]);

  const loadSuggestions = useCallback(async () => {
    if (!isAdmin || !supabase) return;

    setIsLoadingSuggestions(true);
    setSuggestionsError('');

    try {
      const { data, error } = await supabase
        .from('prompt_suggestions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (isPolicyError(error)) {
          setPolicyErrorAndStop('prompt_suggestions fetch failed', error);
          return;
        }
        throw error;
      }

      setSuggestions(data || []);
    } catch (error) {
      setSuggestionsError(getErrorMessage(error, 'Unable to load suggestions.'));
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [isAdmin, setPolicyErrorAndStop]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (loading || !isAuthenticated || !user?.id || blockedByPolicy) return;
    loadPromptCards();
  }, [blockedByPolicy, isAuthenticated, loadPromptCards, loading, user?.id]);

  useEffect(() => {
    if (!isAdmin || loading || !isAuthenticated || blockedByPolicy) {
      setSuggestions([]);
      return;
    }
    loadSuggestions();
  }, [blockedByPolicy, isAdmin, isAuthenticated, loadSuggestions, loading]);

  async function insertFavorite(cardId) {
    for (const key of favoriteKeyOrder) {
      const { error } = await supabase.from('prompt_favorites').insert([{ user_id: user.id, [key]: cardId }]);
      if (!error) {
        setFavoriteKey(key);
        return null;
      }
      if (isPolicyError(error)) return error;
      if (!isMissingColumnError(error)) return error;
    }
    return new Error('Unable to identify prompt_favorites key for insert.');
  }

  async function removeFavorite(cardId) {
    for (const key of favoriteKeyOrder) {
      const { error } = await supabase
        .from('prompt_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq(key, cardId);
      if (!error) {
        setFavoriteKey(key);
        return null;
      }
      if (isPolicyError(error)) return error;
      if (!isMissingColumnError(error)) return error;
    }
    return new Error('Unable to identify prompt_favorites key for delete.');
  }

  async function handleToggleFavorite(cardId) {
    if (!user?.id || blockedByPolicy || !supabase) return;

    const currentCard = promptCards.find((card) => card.id === cardId);
    if (!currentCard) return;

    const nextFavoriteValue = !currentCard.isFavorite;
    setActionError('');

    setPromptCards((prev) =>
      prev.map((card) => (card.id === cardId ? { ...card, isFavorite: nextFavoriteValue } : card))
    );

    const operationError = nextFavoriteValue
      ? await insertFavorite(cardId)
      : await removeFavorite(cardId);

    if (operationError) {
      if (isPolicyError(operationError)) {
        setPolicyErrorAndStop('prompt_favorites update failed', operationError);
      } else {
        setActionError(getErrorMessage(operationError, 'Unable to update favorite.'));
      }

      setPromptCards((prev) =>
        prev.map((card) => (card.id === cardId ? { ...card, isFavorite: !nextFavoriteValue } : card))
      );
    }
  }

  async function handleCopyPrompt(card) {
    const promptText = trimStringValue(card?.prompt_text);

    if (!promptText) {
      setActionError('This card has no prompt text to copy.');
      return;
    }

    try {
      await navigator.clipboard.writeText(promptText);
      setActionError('');
    } catch (error) {
      setActionError('Unable to copy prompt text to clipboard.');
    }
  }

  function handleDownloadHtml(card) {
    if (blockedByPolicy) return;

    const htmlContent = String(card?.html || '');
    if (!htmlContent.trim()) {
      setActionError('This card has no HTML content to download.');
      return;
    }

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `rapidroutes-${slugifyTitle(card?.title)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  }

  function openFlowchartViewer(card) {
    if (blockedByPolicy) return;
    setActionError('');
    setActiveFlowchartCard(card);
    setIsFlowchartViewerOpen(true);
  }

  function closeFlowchartViewer() {
    setIsFlowchartViewerOpen(false);
    setActiveFlowchartCard(null);
  }

  function openUploadModal() {
    setEditingCardId(null);
    setCardForm(createEmptyCardForm());
    setActionError('');
    setIsEditorOpen(true);
  }

  function openEditModal(card) {
    const normalizedCategory = CATEGORY_OPTIONS.includes(card.category) ? card.category : CATEGORY_OPTIONS[0];
    const actionConfig = getCardActionConfig({ ...card, category: normalizedCategory });

    setEditingCardId(card.id);
    setCardForm({
      title: String(card.title || ''),
      category: normalizedCategory,
      description: String(card.description || ''),
      useCase: String(card.use_case || ''),
      targetAudience: String(card.target_audience || ''),
      promptText: String(card.prompt_text || ''),
      html: String(card.html || ''),
      badge: String(card.badge || ''),
      allowCopyPrompt: actionConfig.canCopyPrompt,
      allowDownloadHtml: actionConfig.canDownloadHtml,
      allowView: actionConfig.isFlowchart
    });
    setActionError('');
    setIsEditorOpen(true);
  }

  function closeEditorModal() {
    if (isSavingCard) return;
    setIsEditorOpen(false);
  }

  async function handleSaveCard(event) {
    event.preventDefault();
    if (!isAdmin || blockedByPolicy || !supabase) return;

    setIsSavingCard(true);
    setActionError('');

    const normalizedCategory = cardForm.allowView ? 'Flowcharts' : cardForm.category;
    const isFlowchartCard = isFlowchartsCategory(normalizedCategory);
    const copyEnabled = !isFlowchartCard && cardForm.allowCopyPrompt;
    const downloadEnabled = cardForm.allowDownloadHtml;

    let promptTextToSave = trimStringValue(cardForm.promptText);
    let htmlToSave = trimStringValue(cardForm.html);

    if (copyEnabled && !promptTextToSave) {
      setActionError('Prompt Text is required when Copy Prompt is enabled.');
      setIsSavingCard(false);
      return;
    }

    if (downloadEnabled && !htmlToSave) {
      setActionError('HTML is required when Download HTML is enabled.');
      setIsSavingCard(false);
      return;
    }

    if (!copyEnabled && !isFlowchartCard && promptTextToSave) {
      const confirmClearPrompt = window.confirm(
        'Disabling "Copy Prompt" will clear Prompt Text to enforce permissions without schema changes. Continue?'
      );
      if (!confirmClearPrompt) {
        setIsSavingCard(false);
        return;
      }
      promptTextToSave = '';
    }

    if (!downloadEnabled && htmlToSave) {
      const confirmClearHtml = window.confirm(
        'Disabling "Download HTML" will clear HTML content to enforce permissions without schema changes. Continue?'
      );
      if (!confirmClearHtml) {
        setIsSavingCard(false);
        return;
      }
      htmlToSave = '';
    }

    const payload = {
      title: trimStringValue(cardForm.title),
      category: normalizedCategory,
      description: trimStringValue(cardForm.description),
      use_case: trimStringValue(cardForm.useCase) || null,
      target_audience: trimStringValue(cardForm.targetAudience) || null,
      prompt_text: promptTextToSave,
      html: htmlToSave,
      badge: trimStringValue(cardForm.badge) || null
    };

    try {
      const operation = editingCardId
        ? supabase.from('prompt_cards').update(payload).eq('id', editingCardId)
        : supabase.from('prompt_cards').insert([payload]);

      const { error } = await operation;
      if (error) {
        if (isPolicyError(error)) {
          setPolicyErrorAndStop('prompt_cards save failed', error);
          return;
        }
        throw error;
      }

      setIsEditorOpen(false);
      setEditingCardId(null);
      setCardForm(createEmptyCardForm());
      await loadPromptCards();
    } catch (error) {
      setActionError(getErrorMessage(error, 'Unable to save prompt card.'));
    } finally {
      setIsSavingCard(false);
    }
  }

  async function handleDeleteCard(cardId) {
    if (!isAdmin || blockedByPolicy || !supabase) return;
    if (!window.confirm('Delete this prompt card?')) return;

    setActionError('');

    try {
      const { error } = await supabase.from('prompt_cards').delete().eq('id', cardId);
      if (error) {
        if (isPolicyError(error)) {
          setPolicyErrorAndStop('prompt_cards delete failed', error);
          return;
        }
        throw error;
      }

      setPromptCards((prev) => prev.filter((card) => card.id !== cardId));
    } catch (error) {
      setActionError(getErrorMessage(error, 'Unable to delete prompt card.'));
    }
  }

  async function handleDeleteSuggestion(suggestionId) {
    if (!isAdmin || blockedByPolicy || !supabase) return;
    if (!window.confirm('Delete this suggestion?')) return;

    setSuggestionsError('');

    try {
      const { error } = await supabase.from('prompt_suggestions').delete().eq('id', suggestionId);
      if (error) {
        if (isPolicyError(error)) {
          setPolicyErrorAndStop('prompt_suggestions delete failed', error);
          return;
        }
        throw error;
      }
      setSuggestions((prev) => prev.filter((item) => item.id !== suggestionId));
    } catch (error) {
      setSuggestionsError(getErrorMessage(error, 'Unable to delete suggestion.'));
    }
  }

  async function handleSubmitSuggestion(event) {
    event.preventDefault();
    if (!user?.id || blockedByPolicy || !supabase) return;

    setIsSubmittingSuggestion(true);
    setSuggestionsError('');
    setSuggestionNotice('');

    const payload = {
      title: suggestionForm.title.trim(),
      category: suggestionForm.category,
      description: suggestionForm.description.trim(),
      prompt_text: suggestionForm.promptText.trim() || null,
      user_id: user.id
    };

    try {
      const { error } = await supabase.from('prompt_suggestions').insert([payload]);
      if (error) {
        if (isPolicyError(error)) {
          setPolicyErrorAndStop('prompt_suggestions submit failed', error);
          return;
        }
        throw error;
      }

      setSuggestionForm(createEmptySuggestionForm());
      setSuggestionNotice('Suggestion submitted successfully.');

      if (isAdmin) {
        await loadSuggestions();
      }
    } catch (error) {
      setSuggestionsError(getErrorMessage(error, 'Unable to submit suggestion.'));
    } finally {
      setIsSubmittingSuggestion(false);
    }
  }

  async function handleSendMessage(event) {
    event.preventDefault();

    const nextUserMessage = draftMessage;
    if (!nextUserMessage.trim() || isSending) return;

    const nextConversation = [...messages, { role: 'user', content: nextUserMessage }];
    setMessages(nextConversation);
    setDraftMessage('');
    setChatError('');
    setIsSending(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: nextUserMessage })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof payload?.error === 'string' && payload.error.trim()
            ? payload.error
            : 'AI service is temporarily unavailable.'
        );
      }

      const assistantMessage = typeof payload?.reply === 'string' ? payload.reply.trim() : '';
      if (!assistantMessage) {
        throw new Error('AI response was empty. Please try again.');
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      setChatError(getErrorMessage(error, 'AI service is temporarily unavailable.'));
    } finally {
      setIsSending(false);
    }
  }

  function startNewChat() {
    setMessages(INITIAL_CHAT);
    setDraftMessage('');
    setChatError('');
  }

  if (loading) {
    return (
      <AppBackground>
        <DashboardLayout title="Sales Resources | RapidRoutes">
          <section className="sales-page">
            <div className="sales-empty-state rr-card">
              <h3>Loading Prompt Library...</h3>
            </div>
          </section>
        </DashboardLayout>
      </AppBackground>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppBackground>
      <DashboardLayout title="Sales Resources | RapidRoutes">
        <section className="sales-page">
          <header className="sales-header">
            <div className="sales-header-copy">
              <h1 className="sales-title">Sales Resources</h1>
              <p className="sales-subtitle">Prompt library and RapidRoutes AI for outbound prep</p>
            </div>
            {isAdmin && (
              <button
                type="button"
                className="rr-btn rr-btn-primary"
                onClick={openUploadModal}
                disabled={blockedByPolicy}
              >
                Upload
              </button>
            )}
          </header>

          {policyError && (
            <div className="sales-empty-state rr-card sales-error-banner">
              <h3>Policy Error</h3>
              <p>{policyError}</p>
            </div>
          )}

          {cardsError && !policyError && (
            <div className="sales-empty-state rr-card sales-error-banner">
              <h3>Prompt Library Error</h3>
              <p>{cardsError}</p>
            </div>
          )}

          {actionError && !policyError && (
            <div className="sales-empty-state rr-card sales-error-banner">
              <p>{actionError}</p>
            </div>
          )}

          <div className="sales-grid">
            <section className="sales-library rr-card-elevated">
              <div className="sales-library-header">
                <div>
                  <h2>Prompt Library</h2>
                  <p>Database-backed prompts with favorites and HTML downloads.</p>
                </div>
              </div>

              <div className="sales-category-list" role="tablist" aria-label="Prompt tabs">
                {TAB_OPTIONS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`sales-category-btn ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {isLoadingCards ? (
                <div className="sales-empty-state rr-card">
                  <h3>Loading cards...</h3>
                </div>
              ) : (
                <div className="sales-resource-grid">
                  {filteredCards.map((card) => {
                    const actionConfig = getCardActionConfig(card);

                    return (
                    <article key={card.id} className="sales-resource-card rr-card">
                      <div className="sales-resource-card-head">
                        <div className="sales-resource-title-wrap">
                          <h3>{card.title}</h3>
                          {card.badge && <span className="sales-resource-badge">{card.badge}</span>}
                        </div>
                        <button
                          type="button"
                          className={`btn-icon sales-resource-pin ${card.isFavorite ? 'is-favorite' : ''}`}
                          onClick={() => handleToggleFavorite(card.id)}
                          aria-label={card.isFavorite ? `Remove ${card.title} from favorites` : `Add ${card.title} to favorites`}
                          disabled={blockedByPolicy}
                        >
                          ★
                        </button>
                      </div>

                      <div className="sales-resource-body">
                        <span className="sales-resource-category">{card.category}</span>
                        <p>{card.description}</p>

                        {card.use_case && (
                          <div className="sales-resource-meta">
                            <span className="sales-meta-label">USE CASE</span>
                            <p>{card.use_case}</p>
                          </div>
                        )}

                        {card.target_audience && (
                          <div className="sales-resource-meta">
                            <span className="sales-meta-label">TARGET AUDIENCE</span>
                            <p>{card.target_audience}</p>
                          </div>
                        )}
                      </div>

                      <div className="sales-resource-actions">
                        {actionConfig.isFlowchart ? (
                          <button
                            type="button"
                            className="rr-btn btn-outline sales-resource-action"
                            onClick={() => openFlowchartViewer(card)}
                            disabled={blockedByPolicy || !actionConfig.canViewFlowchart}
                          >
                            View
                          </button>
                        ) : actionConfig.canCopyPrompt ? (
                          <button
                            type="button"
                            className="rr-btn btn-outline sales-resource-action"
                            onClick={() => handleCopyPrompt(card)}
                            disabled={blockedByPolicy}
                          >
                            Copy Prompt
                          </button>
                        ) : (
                          <span className="sales-resource-inline-note">No prompt text</span>
                        )}

                        {actionConfig.canDownloadHtml && (
                          <button
                            type="button"
                            className="rr-btn btn-outline sales-resource-action"
                            onClick={() => handleDownloadHtml(card)}
                            disabled={blockedByPolicy}
                          >
                            Download HTML
                          </button>
                        )}

                        {isAdmin && (
                          <button
                            type="button"
                            className="rr-btn btn-outline sales-resource-action"
                            onClick={() => openEditModal(card)}
                            disabled={blockedByPolicy}
                          >
                            Edit
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            className="rr-btn btn-outline sales-resource-action sales-resource-action-danger"
                            onClick={() => handleDeleteCard(card.id)}
                            disabled={blockedByPolicy}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </article>
                    );
                  })}
                </div>
              )}

              {!isLoadingCards && filteredCards.length === 0 && (
                <div className="sales-empty-state rr-card">
                  <h3>No prompts found</h3>
                  <p>Try a different tab or add a new card.</p>
                </div>
              )}
            </section>

            <aside className="sales-chat-panel rr-card-elevated">
              <div className="sales-chat-header">
                <div>
                  <h2>RapidRoutes AI</h2>
                  <p>Ephemeral chat only. Nothing is stored.</p>
                </div>
                <button type="button" className="rr-btn btn-outline" onClick={startNewChat}>
                  New Chat
                </button>
              </div>

              <div className="sales-chat-messages" aria-live="polite">
                {messages.map((message, index) => (
                  <div
                    key={`chat-${index}`}
                    className={`sales-chat-message ${message.role === 'assistant' ? 'assistant' : 'user'}`}
                  >
                    <span className="sales-chat-role">{message.role === 'assistant' ? 'RapidRoutes AI' : 'You'}</span>
                    <p>{message.content}</p>
                  </div>
                ))}
                {isSending && (
                  <div className="sales-chat-message assistant pending">
                    <span className="sales-chat-role">RapidRoutes AI</span>
                    <p>Thinking...</p>
                  </div>
                )}
              </div>

              <div className="sales-chat-prompts">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={`prompt-${idx}`}
                    type="button"
                    className="sales-prompt-chip"
                    onClick={() => {
                      setDraftMessage(prompt);
                      chatInputRef.current?.focus();
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <form className="sales-chat-form" onSubmit={handleSendMessage}>
                <label htmlFor="sales-chat-input" className="form-label section-header">Message</label>
                <textarea
                  ref={chatInputRef}
                  id="sales-chat-input"
                  className="rr-input sales-chat-input"
                  value={draftMessage}
                  onChange={(event) => setDraftMessage(event.target.value)}
                  placeholder="Ask for a script, rebuttal, follow-up, or discovery questions..."
                  rows={3}
                  disabled={isSending}
                />
                {chatError && <p className="sales-chat-error">{chatError}</p>}
                <div className="sales-chat-actions">
                  <button type="submit" className="rr-btn rr-btn-primary" disabled={isSending || !draftMessage.trim()}>
                    {isSending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            </aside>
          </div>

          <div className="sales-suggestions-grid">
            <section className="sales-suggestion-box rr-card-elevated">
              <h2>Suggest a Prompt</h2>
              <p>Share ideas for new cards in the prompt library.</p>

              <form className="sales-suggestion-form" onSubmit={handleSubmitSuggestion}>
                <label htmlFor="suggest-title" className="form-label section-header">Title</label>
                <input
                  id="suggest-title"
                  type="text"
                  className="rr-input"
                  value={suggestionForm.title}
                  onChange={(event) =>
                    setSuggestionForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  required
                  disabled={isSubmittingSuggestion || blockedByPolicy}
                />

                <label htmlFor="suggest-category" className="form-label section-header">Category</label>
                <select
                  id="suggest-category"
                  className="rr-input"
                  value={suggestionForm.category}
                  onChange={(event) =>
                    setSuggestionForm((prev) => ({ ...prev, category: event.target.value }))
                  }
                  required
                  disabled={isSubmittingSuggestion || blockedByPolicy}
                >
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                <label htmlFor="suggest-description" className="form-label section-header">Description</label>
                <textarea
                  id="suggest-description"
                  className="rr-input sales-suggestion-textarea"
                  value={suggestionForm.description}
                  onChange={(event) =>
                    setSuggestionForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  rows={5}
                  required
                  disabled={isSubmittingSuggestion || blockedByPolicy}
                />

                <label htmlFor="suggest-prompt" className="form-label section-header">Prompt Text (Optional)</label>
                <textarea
                  id="suggest-prompt"
                  className="rr-input sales-suggestion-textarea"
                  value={suggestionForm.promptText}
                  onChange={(event) =>
                    setSuggestionForm((prev) => ({ ...prev, promptText: event.target.value }))
                  }
                  rows={4}
                  disabled={isSubmittingSuggestion || blockedByPolicy}
                />

                {suggestionNotice && <p className="sales-success-note">{suggestionNotice}</p>}
                {suggestionsError && !policyError && <p className="sales-chat-error">{suggestionsError}</p>}

                <div className="sales-suggestion-actions">
                  <button
                    type="submit"
                    className="rr-btn rr-btn-primary"
                    disabled={isSubmittingSuggestion || blockedByPolicy}
                  >
                    {isSubmittingSuggestion ? 'Submitting...' : 'Submit Suggestion'}
                  </button>
                </div>
              </form>
            </section>

            {isAdmin && (
              <section className="sales-admin-suggestions rr-card-elevated">
                <div className="sales-admin-suggestions-header">
                  <h2>Suggestions</h2>
                  <p>Admin-only review queue</p>
                </div>

                {isLoadingSuggestions ? (
                  <div className="sales-empty-state rr-card">
                    <h3>Loading suggestions...</h3>
                  </div>
                ) : (
                  <div className="sales-admin-suggestion-list">
                    {suggestions.map((item) => (
                      <article key={item.id} className="sales-admin-suggestion-item rr-card">
                        <div className="sales-admin-suggestion-title">
                          <h3>{item.title}</h3>
                          <button
                            type="button"
                            className="rr-btn btn-outline sales-resource-action sales-resource-action-danger"
                            onClick={() => handleDeleteSuggestion(item.id)}
                            disabled={blockedByPolicy}
                          >
                            Delete
                          </button>
                        </div>
                        <span className="sales-resource-category">{item.category}</span>
                        <p>{item.description}</p>
                        {item.prompt_text && (
                          <div className="sales-resource-meta">
                            <span className="sales-meta-label">PROMPT TEXT</span>
                            <p>{item.prompt_text}</p>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}

                {!isLoadingSuggestions && suggestions.length === 0 && (
                  <div className="sales-empty-state rr-card">
                    <h3>No suggestions yet</h3>
                  </div>
                )}
              </section>
            )}
          </div>

          {isFlowchartViewerOpen && activeFlowchartCard && (
            <div className="sales-modal-backdrop" onClick={closeFlowchartViewer}>
              <div
                className="sales-modal sales-flowchart-modal"
                role="dialog"
                aria-modal="true"
                aria-label={`View flowchart: ${activeFlowchartCard.title}`}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="sales-modal-header">
                  <h2>{activeFlowchartCard.title}</h2>
                  <button type="button" className="btn-icon sales-modal-close" onClick={closeFlowchartViewer}>
                    ✕
                  </button>
                </div>

                <div className="sales-flowchart-body">
                  {sanitizedFlowchartHtml && hasRenderableHtml(sanitizedFlowchartHtml) ? (
                    <iframe
                      title={`Flowchart preview: ${activeFlowchartCard.title}`}
                      className="sales-flowchart-frame"
                      sandbox=""
                      srcDoc={sanitizedFlowchartHtml}
                    />
                  ) : activeFlowchartConfig.hasMermaidPrompt ? (
                    <>
                      <p className="sales-flowchart-note">
                        Mermaid rendering library is not installed; showing source text instead.
                      </p>
                      <pre className="sales-flowchart-source">{activeFlowchartPrompt}</pre>
                    </>
                  ) : (
                    <p className="sales-chat-error">This flowchart card has no previewable content.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {isEditorOpen && (
            <div className="sales-modal-backdrop" onClick={closeEditorModal}>
              <div className="sales-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
                <div className="sales-modal-header">
                  <h2>{editingCardId ? 'Edit Prompt Card' : 'Upload Prompt Card'}</h2>
                  <button type="button" className="btn-icon sales-modal-close" onClick={closeEditorModal} disabled={isSavingCard}>
                    ✕
                  </button>
                </div>

                <form className="sales-modal-form" onSubmit={handleSaveCard}>
                  <label htmlFor="card-title" className="form-label section-header">Title</label>
                  <input
                    id="card-title"
                    type="text"
                    className="rr-input"
                    value={cardForm.title}
                    onChange={(event) => setCardForm((prev) => ({ ...prev, title: event.target.value }))}
                    required
                    disabled={isSavingCard || blockedByPolicy}
                  />

                  <label htmlFor="card-category" className="form-label section-header">Category</label>
                  <select
                    id="card-category"
                    className="rr-input"
                    value={cardForm.category}
                    onChange={(event) => {
                      const nextCategory = event.target.value;
                      setCardForm((prev) => ({
                        ...prev,
                        category: nextCategory,
                        allowView: isFlowchartsCategory(nextCategory) ? true : prev.allowView,
                        allowCopyPrompt: isFlowchartsCategory(nextCategory) ? false : prev.allowCopyPrompt
                      }));
                    }}
                    required
                    disabled={isSavingCard || blockedByPolicy}
                  >
                    {CATEGORY_OPTIONS.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>

                  <div className="sales-permissions-panel">
                    <span className="sales-meta-label">Permissions</span>

                    <label className="sales-permissions-option">
                      <input
                        type="checkbox"
                        checked={isFlowchartsCategory(cardForm.category) ? false : cardForm.allowCopyPrompt}
                        onChange={(event) =>
                          setCardForm((prev) => ({ ...prev, allowCopyPrompt: event.target.checked }))
                        }
                        disabled={isSavingCard || blockedByPolicy || isFlowchartsCategory(cardForm.category)}
                      />
                      <span>Allow Copy Prompt</span>
                    </label>

                    <label className="sales-permissions-option">
                      <input
                        type="checkbox"
                        checked={cardForm.allowDownloadHtml}
                        onChange={(event) =>
                          setCardForm((prev) => ({ ...prev, allowDownloadHtml: event.target.checked }))
                        }
                        disabled={isSavingCard || blockedByPolicy}
                      />
                      <span>Allow Download HTML</span>
                    </label>

                    <label className="sales-permissions-option">
                      <input
                        type="checkbox"
                        checked={cardForm.allowView || isFlowchartsCategory(cardForm.category)}
                        onChange={(event) =>
                          setCardForm((prev) => ({
                            ...prev,
                            allowView: event.target.checked,
                            category: event.target.checked ? 'Flowcharts' : prev.category,
                            allowCopyPrompt: event.target.checked ? false : prev.allowCopyPrompt
                          }))
                        }
                        disabled={isSavingCard || blockedByPolicy}
                      />
                      <span>Allow View (Flowcharts)</span>
                    </label>
                  </div>

                  <label htmlFor="card-description" className="form-label section-header">Description</label>
                  <textarea
                    id="card-description"
                    className="rr-input sales-suggestion-textarea"
                    value={cardForm.description}
                    onChange={(event) => setCardForm((prev) => ({ ...prev, description: event.target.value }))}
                    rows={3}
                    required
                    disabled={isSavingCard || blockedByPolicy}
                  />

                  <label htmlFor="card-usecase" className="form-label section-header">Use Case (Optional)</label>
                  <input
                    id="card-usecase"
                    type="text"
                    className="rr-input"
                    value={cardForm.useCase}
                    onChange={(event) => setCardForm((prev) => ({ ...prev, useCase: event.target.value }))}
                    disabled={isSavingCard || blockedByPolicy}
                  />

                  <label htmlFor="card-target-audience" className="form-label section-header">Target Audience (Optional)</label>
                  <input
                    id="card-target-audience"
                    type="text"
                    className="rr-input"
                    value={cardForm.targetAudience}
                    onChange={(event) => setCardForm((prev) => ({ ...prev, targetAudience: event.target.value }))}
                    disabled={isSavingCard || blockedByPolicy}
                  />

                  <label htmlFor="card-prompt-text" className="form-label section-header">Prompt Text</label>
                  <textarea
                    id="card-prompt-text"
                    className="rr-input sales-suggestion-textarea"
                    value={cardForm.promptText}
                    onChange={(event) => setCardForm((prev) => ({ ...prev, promptText: event.target.value }))}
                    rows={5}
                    required={cardForm.allowCopyPrompt && !isFlowchartsCategory(cardForm.category)}
                    disabled={isSavingCard || blockedByPolicy}
                  />

                  <label htmlFor="card-html" className="form-label section-header">HTML</label>
                  <textarea
                    id="card-html"
                    className="rr-input sales-suggestion-textarea"
                    value={cardForm.html}
                    onChange={(event) => setCardForm((prev) => ({ ...prev, html: event.target.value }))}
                    rows={6}
                    required={cardForm.allowDownloadHtml}
                    disabled={isSavingCard || blockedByPolicy}
                  />

                  <label htmlFor="card-badge" className="form-label section-header">Badge (Optional)</label>
                  <input
                    id="card-badge"
                    type="text"
                    className="rr-input"
                    value={cardForm.badge}
                    onChange={(event) => setCardForm((prev) => ({ ...prev, badge: event.target.value }))}
                    disabled={isSavingCard || blockedByPolicy}
                  />

                  <div className="sales-modal-actions">
                    <button type="button" className="rr-btn btn-outline" onClick={closeEditorModal} disabled={isSavingCard}>
                      Cancel
                    </button>
                    <button type="submit" className="rr-btn rr-btn-primary" disabled={isSavingCard || blockedByPolicy}>
                      {isSavingCard ? 'Saving...' : editingCardId ? 'Save Changes' : 'Upload Card'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      </DashboardLayout>
    </AppBackground>
  );
}
