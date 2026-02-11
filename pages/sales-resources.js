import React, { useMemo, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import AppBackground from '../components/ui/AppBackground';

const RESOURCE_LIBRARY = [
  {
    id: 'cold-openers',
    title: 'Cold Call Openers',
    category: 'scripts',
    description: 'Concise opening frameworks for first-touch shipper calls.',
    tags: ['Phone', 'Outbound', 'First Touch'],
    cta: 'Open Script'
  },
  {
    id: 'objection-pricing',
    title: 'Rate Objection Handling',
    category: 'battlecards',
    description: 'Response angles for “your rate is too high” and capacity pushback.',
    tags: ['Pricing', 'Negotiation', 'Retention'],
    cta: 'View Battle Card'
  },
  {
    id: 'follow-up-sequences',
    title: 'Follow-Up Sequence Templates',
    category: 'templates',
    description: 'Multi-touch cadence templates for warm leads and stalled opportunities.',
    tags: ['Email', 'Follow-Up', 'Cadence'],
    cta: 'Use Template'
  },
  {
    id: 'lane-intel-brief',
    title: 'Weekly Lane Intel Brief',
    category: 'intel',
    description: 'Snapshot format for presenting market shifts to shippers each week.',
    tags: ['Market', 'Briefing', 'Insights'],
    cta: 'View Brief'
  },
  {
    id: 'renewal-talktrack',
    title: 'Contract Renewal Talk Track',
    category: 'scripts',
    description: 'Position value and secure renewal with confidence under rate pressure.',
    tags: ['Renewal', 'Strategy', 'Retention'],
    cta: 'Open Script'
  },
  {
    id: 'email-reengage',
    title: 'Re-Engagement Email Pack',
    category: 'templates',
    description: 'Three-step reactivation messaging for dormant shipper accounts.',
    tags: ['Email', 'Reactivation', 'Pipeline'],
    cta: 'Use Template'
  }
];

const CATEGORY_OPTIONS = [
  { id: 'all', label: 'All Resources' },
  { id: 'scripts', label: 'Scripts' },
  { id: 'battlecards', label: 'Battle Cards' },
  { id: 'templates', label: 'Templates' },
  { id: 'intel', label: 'Market Intel' }
];

const QUICK_PROMPTS = [
  'Draft a concise cold-call opener for a food shipper with late-pickup pain.',
  'Give me 3 pricing objection responses that keep tone collaborative.',
  'Create a short follow-up email after no reply for 5 days.',
  'Summarize why lane volatility justifies proactive communication this week.'
];

const INITIAL_CHAT = [
  {
    role: 'assistant',
    content: 'I can help you draft sales scripts, objection responses, and follow-ups. Ask for a concise output and target shipper context.'
  }
];

export default function SalesResources() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [messages, setMessages] = useState(INITIAL_CHAT);
  const [draftMessage, setDraftMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState('');

  const filteredResources = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return RESOURCE_LIBRARY.filter((resource) => {
      const categoryMatch = activeCategory === 'all' || resource.category === activeCategory;
      const queryMatch =
        query.length === 0 ||
        resource.title.toLowerCase().includes(query) ||
        resource.description.toLowerCase().includes(query) ||
        resource.tags.some((tag) => tag.toLowerCase().includes(query));

      return categoryMatch && queryMatch;
    });
  }, [activeCategory, searchQuery]);

  async function handleSendMessage(event) {
    event.preventDefault();

    const nextUserMessage = draftMessage.trim();
    if (!nextUserMessage || isSending) return;

    const nextConversation = [...messages, { role: 'user', content: nextUserMessage }];
    setMessages(nextConversation);
    setDraftMessage('');
    setChatError('');
    setIsSending(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextConversation })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to get AI response right now.');
      }

      const assistantMessage = typeof payload?.message === 'string' ? payload.message.trim() : '';
      if (!assistantMessage) {
        throw new Error('AI response was empty. Please try again.');
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to get AI response right now.';
      setChatError(message);
    } finally {
      setIsSending(false);
    }
  }

  function startNewChat() {
    setMessages(INITIAL_CHAT);
    setDraftMessage('');
    setChatError('');
  }

  return (
    <AppBackground>
      <DashboardLayout title="Sales Resources | RapidRoutes">
        <section className="sales-page">
          <header className="sales-header">
            <div className="sales-header-copy">
              <h1 className="sales-title">Sales Resources</h1>
              <p className="sales-subtitle">Scripts, battle cards, and an AI copilot for rapid outbound prep</p>
            </div>
          </header>

          <div className="sales-grid">
            <section className="sales-library rr-card-elevated">
              <div className="sales-library-header">
                <div>
                  <h2>Resource Library</h2>
                  <p>Stub content for Phase 4 UI. Local files can replace these cards later.</p>
                </div>
                <div className="sales-library-search-wrap">
                  <label htmlFor="resource-search" className="form-label section-header">Search</label>
                  <input
                    id="resource-search"
                    type="search"
                    className="rr-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Find scripts, templates, or battle cards"
                  />
                </div>
              </div>

              <div className="sales-category-list" role="tablist" aria-label="Resource categories">
                {CATEGORY_OPTIONS.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`sales-category-btn ${activeCategory === category.id ? 'active' : ''}`}
                    onClick={() => setActiveCategory(category.id)}
                  >
                    {category.label}
                  </button>
                ))}
              </div>

              <div className="sales-resource-grid">
                {filteredResources.map((resource) => (
                  <article key={resource.id} className="sales-resource-card rr-card">
                    <div className="sales-resource-card-head">
                      <span className="sales-resource-category">{resource.category}</span>
                      <button type="button" className="btn-icon sales-resource-pin" aria-label={`Pin ${resource.title}`}>
                        ★
                      </button>
                    </div>
                    <h3>{resource.title}</h3>
                    <p>{resource.description}</p>
                    <div className="sales-resource-tags">
                      {resource.tags.map((tag) => (
                        <span key={`${resource.id}-${tag}`}>{tag}</span>
                      ))}
                    </div>
                    <button type="button" className="rr-btn btn-outline sales-resource-action">
                      {resource.cta}
                    </button>
                  </article>
                ))}
              </div>

              {filteredResources.length === 0 && (
                <div className="sales-empty-state rr-card">
                  <h3>No resources found</h3>
                  <p>Try another search term or category filter.</p>
                </div>
              )}
            </section>

            <aside className="sales-chat-panel rr-card-elevated">
              <div className="sales-chat-header">
                <div>
                  <h2>AI Sales Copilot</h2>
                  <p>Ephemeral chat only. Nothing is stored.</p>
                </div>
                <button type="button" className="rr-btn btn-outline" onClick={startNewChat}>
                  New Chat
                </button>
              </div>

              <div className="sales-chat-messages" aria-live="polite">
                {messages.map((message, index) => (
                  <div key={`chat-${index}`} className={`sales-chat-message ${message.role === 'assistant' ? 'assistant' : 'user'}`}>
                    <span className="sales-chat-role">{message.role === 'assistant' ? 'Copilot' : 'You'}</span>
                    <p>{message.content}</p>
                  </div>
                ))}
                {isSending && (
                  <div className="sales-chat-message assistant pending">
                    <span className="sales-chat-role">Copilot</span>
                    <p>Thinking…</p>
                  </div>
                )}
              </div>

              <div className="sales-chat-prompts">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={`prompt-${idx}`}
                    type="button"
                    className="sales-prompt-chip"
                    onClick={() => setDraftMessage(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <form className="sales-chat-form" onSubmit={handleSendMessage}>
                <label htmlFor="sales-chat-input" className="form-label section-header">Message</label>
                <textarea
                  id="sales-chat-input"
                  className="rr-input sales-chat-input"
                  value={draftMessage}
                  onChange={(e) => setDraftMessage(e.target.value)}
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
        </section>
      </DashboardLayout>
    </AppBackground>
  );
}
