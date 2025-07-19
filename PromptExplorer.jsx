import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const PromptExplorer = () => {
  const [prompts, setPrompts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [applications, setApplications] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedApp, setSelectedApp] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPrompts, setTotalPrompts] = useState(0);
  const limit = 10;
  
  // Selected prompt for detail view
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  
  // Fetch prompts with filters
  const fetchPrompts = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('ai_tool_prompts')
        .select('*', { count: 'exact' });
      
      // Apply filters
      if (selectedCategory) {
        query = query.eq('application_category', selectedCategory);
      }
      
      if (selectedApp) {
        query = query.eq('application_name', selectedApp);
      }
      
      if (selectedTag) {
        query = query.contains('tags', [selectedTag]);
      }
      
      if (searchQuery) {
        query = query.or(`prompt_text.ilike.%${searchQuery}%,prompt_title.ilike.%${searchQuery}%,application_name.ilike.%${searchQuery}%`);
      }
      
      // Apply sorting
      if (sortBy === 'popular') {
        query = query.order('likes', { ascending: false });
      } else if (sortBy === 'newest') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'most_used') {
        query = query.order('uses', { ascending: false });
      }
      
      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      const { data, error, count } = await query
        .range(from, to);
      
      if (error) throw error;
      
      setPrompts(data);
      setTotalPrompts(count);
      setTotalPages(Math.ceil(count / limit));
      
    } catch (err) {
      console.error('Error fetching prompts:', err);
      setError('Failed to fetch prompts');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch categories
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_tool_prompts')
        .select('application_category')
        .distinct();
      
      if (error) throw error;
      
      setCategories(data.map(item => item.application_category).filter(Boolean));
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };
  
  // Fetch applications
  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_tool_prompts')
        .select('application_name')
        .distinct();
      
      if (error) throw error;
      
      setApplications(data.map(item => item.application_name).filter(Boolean));
    } catch (err) {
      console.error('Error fetching applications:', err);
    }
  };
  
  // Fetch tags
  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_tool_prompts')
        .select('tags');
      
      if (error) throw error;
      
      // Flatten the array of tags and count occurrences
      const tagCounts = {};
      data.forEach(item => {
        if (item.tags) {
          item.tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      });
      
      // Convert to array of objects with tag and count
      const tagsArray = Object.entries(tagCounts).map(([tag, count]) => ({
        tag,
        count
      })).sort((a, b) => b.count - a.count);
      
      setTags(tagsArray);
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  };
  
  // Like a prompt
  const likePrompt = async (promptId) => {
    try {
      // In a real app, you would get the user ID from authentication
      const userId = 'test-user-id';
      
      const { error } = await supabase.rpc('like_prompt', { prompt_id: promptId });
      
      if (error) throw error;
      
      // Record the user interaction
      await supabase
        .from('user_prompt_interactions')
        .insert({
          user_id: userId,
          prompt_id: promptId,
          interaction_type: 'like'
        });
      
      // Update the prompts list
      setPrompts(prompts.map(prompt => {
        if (prompt.id === promptId) {
          return { ...prompt, likes: (prompt.likes || 0) + 1 };
        }
        return prompt;
      }));
      
    } catch (err) {
      console.error('Error liking prompt:', err);
    }
  };
  
  // Dislike a prompt
  const dislikePrompt = async (promptId) => {
    try {
      // In a real app, you would get the user ID from authentication
      const userId = 'test-user-id';
      
      const { error } = await supabase.rpc('dislike_prompt', { prompt_id: promptId });
      
      if (error) throw error;
      
      // Record the user interaction
      await supabase
        .from('user_prompt_interactions')
        .insert({
          user_id: userId,
          prompt_id: promptId,
          interaction_type: 'dislike'
        });
      
      // Update the prompts list
      setPrompts(prompts.map(prompt => {
        if (prompt.id === promptId) {
          return { ...prompt, dislikes: (prompt.dislikes || 0) + 1 };
        }
        return prompt;
      }));
      
    } catch (err) {
      console.error('Error disliking prompt:', err);
    }
  };
  
  // Use a prompt
  const usePrompt = async (promptId) => {
    try {
      // In a real app, you would get the user ID from authentication
      const userId = 'test-user-id';
      
      const { error } = await supabase.rpc('increment_prompt_uses', { prompt_id: promptId });
      
      if (error) throw error;
      
      // Record the user interaction
      await supabase
        .from('user_prompt_interactions')
        .insert({
          user_id: userId,
          prompt_id: promptId,
          interaction_type: 'use'
        });
      
      // Update the prompts list
      setPrompts(prompts.map(prompt => {
        if (prompt.id === promptId) {
          return { ...prompt, uses: (prompt.uses || 0) + 1 };
        }
        return prompt;
      }));
      
      // Copy the prompt text to clipboard
      const prompt = prompts.find(p => p.id === promptId);
      if (prompt) {
        navigator.clipboard.writeText(prompt.prompt_text);
        alert('Prompt copied to clipboard!');
      }
      
    } catch (err) {
      console.error('Error using prompt:', err);
    }
  };
  
  // Reset filters
  const resetFilters = () => {
    setSelectedCategory('');
    setSelectedApp('');
    setSelectedTag('');
    setSearchQuery('');
    setSortBy('popular');
    setPage(1);
  };
  
  // Load data on component mount
  useEffect(() => {
    fetchCategories();
    fetchApplications();
    fetchTags();
  }, []);
  
  // Fetch prompts when filters change
  useEffect(() => {
    fetchPrompts();
  }, [selectedCategory, selectedApp, selectedTag, searchQuery, sortBy, page]);
  
  // Render loading state
  if (loading && page === 1) {
    return <div className="loading">Loading prompts...</div>;
  }
  
  // Render error state
  if (error) {
    return <div className="error">{error}</div>;
  }
  
  return (
    <div className="prompt-explorer">
      <h1>AI Tool Prompts Explorer</h1>
      
      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <label>Category:</label>
          <select 
            value={selectedCategory} 
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label>Application:</label>
          <select 
            value={selectedApp} 
            onChange={(e) => {
              setSelectedApp(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Applications</option>
            {applications.map(app => (
              <option key={app} value={app}>{app}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label>Tag:</label>
          <select 
            value={selectedTag} 
            onChange={(e) => {
              setSelectedTag(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Tags</option>
            {tags.map(({ tag, count }) => (
              <option key={tag} value={tag}>{tag} ({count})</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label>Sort By:</label>
          <select 
            value={sortBy} 
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
          >
            <option value="popular">Most Popular</option>
            <option value="newest">Newest</option>
            <option value="most_used">Most Used</option>
          </select>
        </div>
        
        <div className="filter-group search">
          <input
            type="text"
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                setPage(1);
                fetchPrompts();
              }
            }}
          />
          <button onClick={() => {
            setPage(1);
            fetchPrompts();
          }}>Search</button>
        </div>
        
        <button className="reset-button" onClick={resetFilters}>Reset Filters</button>
      </div>
      
      {/* Prompts List */}
      <div className="prompts-list">
        <h2>Prompts ({totalPrompts})</h2>
        
        {prompts.length === 0 ? (
          <div className="no-prompts">No prompts found matching your filters.</div>
        ) : (
          prompts.map(prompt => (
            <div key={prompt.id} className="prompt-card">
              <div className="prompt-header">
                <h3>{prompt.prompt_title || prompt.application_name}</h3>
                <span className="app-name">{prompt.application_name}</span>
                {prompt.application_category && (
                  <span className="category-badge">{prompt.application_category}</span>
                )}
              </div>
              
              <div className="prompt-preview">
                {prompt.prompt_text.length > 200 
                  ? `${prompt.prompt_text.substring(0, 200)}...` 
                  : prompt.prompt_text}
              </div>
              
              {prompt.tags && prompt.tags.length > 0 && (
                <div className="prompt-tags">
                  {prompt.tags.map(tag => (
                    <span key={tag} className="tag" onClick={() => {
                      setSelectedTag(tag);
                      setPage(1);
                    }}>{tag}</span>
                  ))}
                </div>
              )}
              
              <div className="prompt-actions">
                <button onClick={() => setSelectedPrompt(prompt)}>View Details</button>
                <button onClick={() => usePrompt(prompt.id)}>Use Prompt ({prompt.uses || 0})</button>
                <button onClick={() => likePrompt(prompt.id)}>👍 ({prompt.likes || 0})</button>
                <button onClick={() => dislikePrompt(prompt.id)}>👎 ({prompt.dislikes || 0})</button>
              </div>
            </div>
          ))
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            
            <span>Page {page} of {totalPages}</span>
            
            <button 
              disabled={page === totalPages} 
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
      
      {/* Prompt Detail Modal */}
      {selectedPrompt && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{selectedPrompt.prompt_title || selectedPrompt.application_name}</h2>
              <button onClick={() => setSelectedPrompt(null)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="prompt-info">
                <p><strong>Application:</strong> {selectedPrompt.application_name}</p>
                {selectedPrompt.application_category && (
                  <p><strong>Category:</strong> {selectedPrompt.application_category}</p>
                )}
                {selectedPrompt.model_name && (
                  <p><strong>Model:</strong> {selectedPrompt.model_name}</p>
                )}
                <p><strong>Created:</strong> {new Date(selectedPrompt.created_at).toLocaleDateString()}</p>
                <p><strong>Stats:</strong> {selectedPrompt.likes || 0} likes, {selectedPrompt.dislikes || 0} dislikes, {selectedPrompt.uses || 0} uses</p>
              </div>
              
              <div className="prompt-content">
                <h3>Prompt Text:</h3>
                <pre>{selectedPrompt.prompt_text}</pre>
                
                {selectedPrompt.prompt_text_secondary && (
                  <>
                    <h3>Secondary Prompt Text:</h3>
                    <pre>{selectedPrompt.prompt_text_secondary}</pre>
                  </>
                )}
              </div>
              
              {selectedPrompt.tags && selectedPrompt.tags.length > 0 && (
                <div className="prompt-tags">
                  <h3>Tags:</h3>
                  <div>
                    {selectedPrompt.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedPrompt.source_url && (
                <div className="prompt-source">
                  <h3>Source:</h3>
                  <a href={selectedPrompt.source_url} target="_blank" rel="noopener noreferrer">
                    View on GitHub
                  </a>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button onClick={() => usePrompt(selectedPrompt.id)}>Copy & Use Prompt</button>
              <button onClick={() => likePrompt(selectedPrompt.id)}>👍 Like</button>
              <button onClick={() => dislikePrompt(selectedPrompt.id)}>👎 Dislike</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptExplorer;