import os
import json
import glob
import time
from datetime import datetime
import supabase
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
client = supabase.create_client(supabase_url, supabase_key)

# Base directory containing the prompts
BASE_DIR = "/workspace/system-prompts-and-models-of-ai-tools"

def extract_prompt_title(filename):
    """Extract a title from the filename."""
    base = os.path.basename(filename)
    name, _ = os.path.splitext(base)
    return name

def determine_category(app_name):
    """Determine the category of the application based on its name or other factors."""
    categories = {
        "Cursor Prompts": "Development",
        "Devin AI": "Development",
        "VSCode Agent": "Development",
        "Warp.dev": "Development",
        "Xcode": "Development",
        "Replit": "Development",
        "Same.dev": "Development",
        "Cluely": "Productivity",
        "Perplexity": "Search",
        "dia": "Browser",
        "Lovable": "Productivity",
        "Spawn": "Game Development",
        "Trae": "Productivity",
        "Windsurf": "Productivity",
        "Manus Agent Tools & Prompt": "Development",
        "v0 Prompts and Tools": "Development",
        "Junie": "Productivity"
    }
    
    return categories.get(app_name, "Other")

def extract_model_name(content):
    """Try to extract the model name from the prompt content."""
    model_indicators = [
        "GPT-4", "GPT4", "GPT-3.5", "GPT3.5", "Claude", "Claude 2", "Claude 3", 
        "Gemini", "Llama", "Mistral", "Mixtral", "Anthropic", "OpenAI"
    ]
    
    for indicator in model_indicators:
        if indicator.lower() in content.lower():
            return indicator
    
    return None

def process_text_file(file_path, app_name):
    """Process a text file containing a prompt."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Split content if it seems to have multiple parts
        parts = content.split("\n\n\n")
        primary_text = parts[0]
        secondary_text = "\n\n\n".join(parts[1:]) if len(parts) > 1 else None
        
        # Extract other metadata
        title = extract_prompt_title(file_path)
        model = extract_model_name(content)
        category = determine_category(app_name)
        
        # Create tags based on content keywords
        tags = []
        if "code" in content.lower() or "programming" in content.lower():
            tags.append("coding")
        if "write" in content.lower() or "writing" in content.lower():
            tags.append("writing")
        if "analyze" in content.lower() or "analysis" in content.lower():
            tags.append("analysis")
        if "summarize" in content.lower() or "summary" in content.lower():
            tags.append("summarization")
        if "translate" in content.lower() or "translation" in content.lower():
            tags.append("translation")
        
        # Add app name as a tag
        tags.append(app_name.lower().replace(" ", "-"))
        
        # Add category as a tag
        tags.append(category.lower())
        
        # Create metadata
        metadata = {
            "file_path": file_path,
            "file_size": os.path.getsize(file_path),
            "word_count": len(content.split()),
            "character_count": len(content),
            "imported_at": datetime.now().isoformat()
        }
        
        # Return the structured data
        return {
            "application_name": app_name,
            "application_category": category,
            "prompt_title": title,
            "prompt_text": primary_text,
            "prompt_text_secondary": secondary_text,
            "model_name": model,
            "source_url": f"https://github.com/ABoringBusiness/system-prompts-and-models-of-ai-tools/blob/main/{os.path.relpath(file_path, BASE_DIR).replace(os.sep, '/')}",
            "tags": tags,
            "metadata": metadata
        }
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return None

def process_json_file(file_path, app_name):
    """Process a JSON file containing prompt data."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Extract prompt text from JSON structure
        # This is a simplified approach; actual implementation would depend on JSON structure
        if isinstance(data, dict):
            if "prompt" in data:
                prompt_text = data["prompt"]
            elif "system" in data:
                prompt_text = data["system"]
            elif "description" in data:
                prompt_text = data["description"]
            else:
                prompt_text = json.dumps(data, indent=2)
                
            # Try to find secondary text
            secondary_text = None
            for key in ["context", "examples", "additional", "secondary"]:
                if key in data:
                    secondary_text = json.dumps(data[key], indent=2)
                    break
        else:
            prompt_text = json.dumps(data, indent=2)
            secondary_text = None
        
        # Extract other metadata
        title = extract_prompt_title(file_path)
        model = extract_model_name(str(data))
        category = determine_category(app_name)
        
        # Create tags based on JSON keys
        tags = []
        if isinstance(data, dict):
            for key in data.keys():
                if key not in ["id", "created_at", "updated_at"]:
                    tags.append(key.lower().replace(" ", "-"))
        
        # Add app name as a tag
        tags.append(app_name.lower().replace(" ", "-"))
        
        # Add category as a tag
        tags.append(category.lower())
        
        # Create metadata
        metadata = {
            "file_path": file_path,
            "file_size": os.path.getsize(file_path),
            "json_keys": list(data.keys()) if isinstance(data, dict) else [],
            "imported_at": datetime.now().isoformat()
        }
        
        # Return the structured data
        return {
            "application_name": app_name,
            "application_category": category,
            "prompt_title": title,
            "prompt_text": prompt_text,
            "prompt_text_secondary": secondary_text,
            "model_name": model,
            "source_url": f"https://github.com/ABoringBusiness/system-prompts-and-models-of-ai-tools/blob/main/{os.path.relpath(file_path, BASE_DIR).replace(os.sep, '/')}",
            "tags": tags,
            "metadata": metadata
        }
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return None

def import_prompts():
    """Import all prompts from the repository into Supabase."""
    # Get all directories (each representing an application)
    app_dirs = [d for d in os.listdir(BASE_DIR) if os.path.isdir(os.path.join(BASE_DIR, d)) and not d.startswith('.')]
    
    prompts_data = []
    
    for app_name in app_dirs:
        app_dir = os.path.join(BASE_DIR, app_name)
        
        # Process text files
        for txt_file in glob.glob(os.path.join(app_dir, "**", "*.txt"), recursive=True):
            prompt_data = process_text_file(txt_file, app_name)
            if prompt_data:
                prompts_data.append(prompt_data)
        
        # Process JSON files
        for json_file in glob.glob(os.path.join(app_dir, "**", "*.json"), recursive=True):
            prompt_data = process_json_file(json_file, app_name)
            if prompt_data:
                prompts_data.append(prompt_data)
    
    # Insert data into Supabase
    for prompt in prompts_data:
        try:
            response = client.table("ai_tool_prompts").insert(prompt).execute()
            print(f"Inserted prompt: {prompt['prompt_title']} for {prompt['application_name']}")
            # Add a small delay to avoid rate limiting
            time.sleep(0.1)
        except Exception as e:
            print(f"Error inserting prompt {prompt['prompt_title']}: {e}")
    
    print(f"Imported {len(prompts_data)} prompts into Supabase")

if __name__ == "__main__":
    print("Starting import of AI tool prompts...")
    import_prompts()
    print("Import completed successfully!")