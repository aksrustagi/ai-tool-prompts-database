-- Create a table to store AI tool prompts
CREATE TABLE IF NOT EXISTS ai_tool_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_name TEXT NOT NULL,
  application_category TEXT,
  prompt_title TEXT,
  prompt_text TEXT NOT NULL,
  prompt_text_secondary TEXT,
  model_name TEXT,
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  likes INTEGER DEFAULT 0,
  dislikes INTEGER DEFAULT 0,
  uses INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create an index on application_name for faster searches
CREATE INDEX IF NOT EXISTS idx_ai_tool_prompts_application_name ON ai_tool_prompts(application_name);

-- Create an index on tags for faster tag-based searches
CREATE INDEX IF NOT EXISTS idx_ai_tool_prompts_tags ON ai_tool_prompts USING GIN(tags);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_ai_tool_prompts_updated_at
BEFORE UPDATE ON ai_tool_prompts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create a view for popular prompts
CREATE OR REPLACE VIEW popular_prompts AS
SELECT *
FROM ai_tool_prompts
ORDER BY (likes - dislikes) DESC, uses DESC
LIMIT 100;

-- Create a function to increment the uses counter
CREATE OR REPLACE FUNCTION increment_prompt_uses(prompt_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE ai_tool_prompts
  SET uses = uses + 1
  WHERE id = prompt_id;
END;
$$ LANGUAGE plpgsql;

-- Create a function to like a prompt
CREATE OR REPLACE FUNCTION like_prompt(prompt_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE ai_tool_prompts
  SET likes = likes + 1
  WHERE id = prompt_id;
END;
$$ LANGUAGE plpgsql;

-- Create a function to dislike a prompt
CREATE OR REPLACE FUNCTION dislike_prompt(prompt_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE ai_tool_prompts
  SET dislikes = dislikes + 1
  WHERE id = prompt_id;
END;
$$ LANGUAGE plpgsql;

-- Create a table for user interactions with prompts
CREATE TABLE IF NOT EXISTS user_prompt_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  prompt_id UUID NOT NULL REFERENCES ai_tool_prompts(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('like', 'dislike', 'use')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, prompt_id, interaction_type)
);

-- Create an index on user_id and prompt_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_prompt_interactions_user_prompt ON user_prompt_interactions(user_id, prompt_id);

-- Create a table for prompt versions to track changes over time
CREATE TABLE IF NOT EXISTS prompt_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_id UUID NOT NULL REFERENCES ai_tool_prompts(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  prompt_text_secondary TEXT,
  version_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  change_notes TEXT,
  UNIQUE(prompt_id, version_number)
);

-- Create an index on prompt_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt_id ON prompt_versions(prompt_id);

-- Create a function to add a new prompt version
CREATE OR REPLACE FUNCTION add_prompt_version()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  -- Get the next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
  FROM prompt_versions
  WHERE prompt_id = NEW.id;
  
  -- Insert the new version
  INSERT INTO prompt_versions (
    prompt_id,
    prompt_text,
    prompt_text_secondary,
    version_number,
    created_at,
    change_notes
  ) VALUES (
    NEW.id,
    NEW.prompt_text,
    NEW.prompt_text_secondary,
    next_version,
    NOW(),
    'Initial version'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically add a version when a new prompt is created
CREATE TRIGGER add_initial_prompt_version
AFTER INSERT ON ai_tool_prompts
FOR EACH ROW
EXECUTE FUNCTION add_prompt_version();

-- Create a function to update prompt version when prompt is updated
CREATE OR REPLACE FUNCTION update_prompt_version()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
  text_changed BOOLEAN;
BEGIN
  -- Check if prompt text has changed
  text_changed := (NEW.prompt_text <> OLD.prompt_text) OR (NEW.prompt_text_secondary <> OLD.prompt_text_secondary);
  
  -- Only create a new version if the text has changed
  IF text_changed THEN
    -- Get the next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
    FROM prompt_versions
    WHERE prompt_id = NEW.id;
    
    -- Insert the new version
    INSERT INTO prompt_versions (
      prompt_id,
      prompt_text,
      prompt_text_secondary,
      version_number,
      created_at,
      change_notes
    ) VALUES (
      NEW.id,
      NEW.prompt_text,
      NEW.prompt_text_secondary,
      next_version,
      NOW(),
      'Updated version'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically add a version when a prompt is updated
CREATE TRIGGER update_prompt_version
AFTER UPDATE ON ai_tool_prompts
FOR EACH ROW
WHEN (NEW.prompt_text <> OLD.prompt_text OR NEW.prompt_text_secondary <> OLD.prompt_text_secondary)
EXECUTE FUNCTION update_prompt_version();

-- Create a table for comments on prompts
CREATE TABLE IF NOT EXISTS prompt_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_id UUID NOT NULL REFERENCES ai_tool_prompts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on prompt_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_prompt_comments_prompt_id ON prompt_comments(prompt_id);

-- Create a trigger to automatically update the updated_at column for comments
CREATE TRIGGER update_prompt_comments_updated_at
BEFORE UPDATE ON prompt_comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();