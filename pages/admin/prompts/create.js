// pages/admin/prompts/create.js
import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../../../lib/supabaseClient';

function Section({ title, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      <div className="card-header">
        <h2 style={{ margin: 0 }}>{title}</h2>
      </div>
      <div className="card-body">{children}</div>
    </section>
  );
}

function CreatePrompt() {
  const router = useRouter();
  const { loading, isAuthenticated, user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);
  
  useEffect(() => {
    async function checkAdmin() {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (error) {
          console.error('Error fetching profile:', error);
        } else if (data) {
          setIsAdmin(data.role === 'Admin');
        }
      }
    }
    checkAdmin();
  }, [user]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from('ai_prompts')
      .insert([{ title, description, category, html_content: htmlContent, created_by_user_id: user.id }]);
    if (error) {
      console.error('Error creating prompt:', error);
    } else {
      router.push('/prompts/library');
    }
  };

  if (loading || !isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 16px' }}></div>
          <p style={{ fontSize: '18px' }}>Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 className="text-2xl font-bold">Unauthorized</h1>
          <p>You must be an admin to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Create AI Prompt | RapidRoutes</title>
      </Head>
      
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Create New AI Prompt</h1>
          <p className="page-subtitle">Add a new prompt to the AI Prompt Library.</p>
        </div>

        <Section title="New Prompt Details">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="title">Title</label>
              <input
                id="title"
                className="form-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="description">Description</label>
              <textarea
                id="description"
                className="form-input"
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="category">Category</label>
              <input
                id="category"
                className="form-input"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="html-content">Raw HTML Content</label>
              <textarea
                id="html-content"
                className="form-input"
                rows="10"
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                required
              ></textarea>
            </div>
            <button type="submit" className="btn btn-primary mt-4">Create Prompt</button>
          </form>
        </Section>
      </div>
    </>
  );
}

export default CreatePrompt;
