// Supabase Edge Functions for AI Tool Prompts

// Get all prompts with pagination
// Example: /api/prompts?page=1&limit=10
export async function getPrompts(req, res, supabase) {
  try {
    const { page = 1, limit = 10, category, app, tag, sort = 'popular' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('ai_tool_prompts')
      .select('*', { count: 'exact' });
    
    // Apply filters
    if (category) {
      query = query.eq('application_category', category);
    }
    
    if (app) {
      query = query.eq('application_name', app);
    }
    
    if (tag) {
      query = query.contains('tags', [tag]);
    }
    
    // Apply sorting
    if (sort === 'popular') {
      query = query.order('likes', { ascending: false });
    } else if (sort === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sort === 'most_used') {
      query = query.order('uses', { ascending: false });
    }
    
    // Apply pagination
    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .execute();
    
    if (error) throw error;
    
    return res.status(200).json({
      data,
      meta: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// Get a single prompt by ID
export async function getPromptById(req, res, supabase) {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('ai_tool_prompts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// Create a new prompt
export async function createPrompt(req, res, supabase) {
  try {
    const {
      application_name,
      application_category,
      prompt_title,
      prompt_text,
      prompt_text_secondary,
      model_name,
      source_url,
      tags
    } = req.body;
    
    // Validate required fields
    if (!application_name || !prompt_text) {
      return res.status(400).json({ error: 'application_name and prompt_text are required' });
    }
    
    const { data, error } = await supabase
      .from('ai_tool_prompts')
      .insert({
        application_name,
        application_category,
        prompt_title,
        prompt_text,
        prompt_text_secondary,
        model_name,
        source_url,
        tags
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return res.status(201).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// Update a prompt
export async function updatePrompt(req, res, supabase) {
  try {
    const { id } = req.params;
    const {
      application_name,
      application_category,
      prompt_title,
      prompt_text,
      prompt_text_secondary,
      model_name,
      source_url,
      tags
    } = req.body;
    
    const { data, error } = await supabase
      .from('ai_tool_prompts')
      .update({
        application_name,
        application_category,
        prompt_title,
        prompt_text,
        prompt_text_secondary,
        model_name,
        source_url,
        tags,
        updated_at: new Date()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// Delete a prompt
export async function deletePrompt(req, res, supabase) {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('ai_tool_prompts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// Like a prompt
export async function likePrompt(req, res, supabase) {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    
    // Check if the user has already liked this prompt
    const { data: existingLike, error: likeError } = await supabase
      .from('user_prompt_interactions')
      .select('*')
      .eq('user_id', user_id)
      .eq('prompt_id', id)
      .eq('interaction_type', 'like')
      .single();
    
    if (likeError && likeError.code !== 'PGRST116') {
      throw likeError;
    }
    
    if (existingLike) {
      return res.status(400).json({ error: 'User has already liked this prompt' });
    }
    
    // Begin a transaction
    const { error: functionError } = await supabase.rpc('like_prompt', { prompt_id: id });
    
    if (functionError) throw functionError;
    
    // Record the user interaction
    const { error: interactionError } = await supabase
      .from('user_prompt_interactions')
      .insert({
        user_id,
        prompt_id: id,
        interaction_type: 'like'
      });
    
    if (interactionError) throw interactionError;
    
    // Get the updated prompt
    const { data: updatedPrompt, error: promptError } = await supabase
      .from('ai_tool_prompts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (promptError) throw promptError;
    
    return res.status(200).json(updatedPrompt);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// Dislike a prompt
export async function dislikePrompt(req, res, supabase) {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    
    // Check if the user has already disliked this prompt
    const { data: existingDislike, error: dislikeError } = await supabase
      .from('user_prompt_interactions')
      .select('*')
      .eq('user_id', user_id)
      .eq('prompt_id', id)
      .eq('interaction_type', 'dislike')
      .single();
    
    if (dislikeError && dislikeError.code !== 'PGRST116') {
      throw dislikeError;
    }
    
    if (existingDislike) {
      return res.status(400).json({ error: 'User has already disliked this prompt' });
    }
    
    // Begin a transaction
    const { error: functionError } = await supabase.rpc('dislike_prompt', { prompt_id: id });
    
    if (functionError) throw functionError;
    
    // Record the user interaction
    const { error: interactionError } = await supabase
      .from('user_prompt_interactions')
      .insert({
        user_id,
        prompt_id: id,
        interaction_type: 'dislike'
      });
    
    if (interactionError) throw interactionError;
    
    // Get the updated prompt
    const { data: updatedPrompt, error: promptError } = await supabase
      .from('ai_tool_prompts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (promptError) throw promptError;
    
    return res.status(200).json(updatedPrompt);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// Record a prompt use
export async function usePrompt(req, res, supabase) {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    
    // Increment the uses counter
    const { error: functionError } = await supabase.rpc('increment_prompt_uses', { prompt_id: id });
    
    if (functionError) throw functionError;
    
    // Record the user interaction if a user_id is provided
    if (user_id) {
      const { error: interactionError } = await supabase
        .from('user_prompt_interactions')
        .insert({
          user_id,
          prompt_id: id,
          interaction_type: 'use'
        });
      
      if (interactionError && interactionError.code !== '23505') {
        // Ignore unique constraint violations (user might use the same prompt multiple times)
        throw interactionError;
      }
    }
    
    // Get the updated prompt
    const { data: updatedPrompt, error: promptError } = await supabase
      .from('ai_tool_prompts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (promptError) throw promptError;
    
    return res.status(200).json(updatedPrompt);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// Get prompt versions
export async function getPromptVersions(req, res, supabase) {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('prompt_versions')
      .select('*')
      .eq('prompt_id', id)
      .order('version_number', { ascending: false });
    
    if (error) throw error;
    
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// Add a comment to a prompt
export async function addComment(req, res, supabase) {
  try {
    const { id } = req.params;
    const { user_id, comment_text } = req.body;
    
    if (!user_id || !comment_text) {
      return res.status(400).json({ error: 'user_id and comment_text are required' });
    }
    
    const { data, error } = await supabase
      .from('prompt_comments')
      .insert({
        prompt_id: id,
        user_id,
        comment_text
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return res.status(201).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// Get comments for a prompt
export async function getComments(req, res, supabase) {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('prompt_comments')
      .select('*')
      .eq('prompt_id', id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// Get application categories
export async function getCategories(req, res, supabase) {
  try {
    const { data, error } = await supabase
      .from('ai_tool_prompts')
      .select('application_category')
      .distinct();
    
    if (error) throw error;
    
    const categories = data.map(item => item.application_category).filter(Boolean);
    
    return res.status(200).json(categories);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// Get application names
export async function getApplications(req, res, supabase) {
  try {
    const { data, error } = await supabase
      .from('ai_tool_prompts')
      .select('application_name')
      .distinct();
    
    if (error) throw error;
    
    const applications = data.map(item => item.application_name).filter(Boolean);
    
    return res.status(200).json(applications);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// Get all tags
export async function getTags(req, res, supabase) {
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
    const tags = Object.entries(tagCounts).map(([tag, count]) => ({
      tag,
      count
    })).sort((a, b) => b.count - a.count);
    
    return res.status(200).json(tags);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// Search prompts
export async function searchPrompts(req, res, supabase) {
  try {
    const { query, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const { data, error, count } = await supabase
      .from('ai_tool_prompts')
      .select('*', { count: 'exact' })
      .or(`prompt_text.ilike.%${query}%,prompt_title.ilike.%${query}%,application_name.ilike.%${query}%`)
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    
    return res.status(200).json({
      data,
      meta: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}