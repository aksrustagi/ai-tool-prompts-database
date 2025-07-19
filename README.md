# AI Tool Prompts Database

This project creates a Supabase database to store and manage prompts from various AI tools. It includes scripts to import prompts from the [system-prompts-and-models-of-ai-tools](https://github.com/ABoringBusiness/system-prompts-and-models-of-ai-tools) repository, a database schema, API functions, and a frontend component for displaying and interacting with the prompts.

## Features

- **Comprehensive Database Schema**: Stores prompts with metadata, versioning, user interactions, and comments
- **Import Script**: Parses and imports prompts from the repository
- **API Functions**: Complete set of functions for interacting with the database
- **Frontend Component**: React component for displaying and interacting with prompts
- **Styling**: CSS for the frontend component

## Database Schema

The database includes the following tables:

- `ai_tool_prompts`: Stores the main prompt data
- `prompt_versions`: Tracks changes to prompts over time
- `user_prompt_interactions`: Records user interactions (likes, dislikes, uses)
- `prompt_comments`: Stores user comments on prompts

## Getting Started

### Prerequisites

- Supabase account and project
- Node.js and npm
- Python 3.6+ (for the import script)

### Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/ai-tool-prompts.git
   cd ai-tool-prompts
   ```

2. Create a `.env` file with your Supabase credentials:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   ```

3. Create the database tables:
   ```bash
   # Connect to your Supabase database and run the SQL script
   psql -h your_supabase_host -d postgres -U postgres -f create_prompts_table.sql
   ```

4. Install Python dependencies:
   ```bash
   pip install supabase python-dotenv
   ```

5. Import prompts from the repository:
   ```bash
   python import_prompts.py
   ```

6. Install frontend dependencies:
   ```bash
   npm install supabase react react-dom
   ```

### Usage

#### Backend

The `api_functions.js` file contains all the functions needed to interact with the database. These can be deployed as Supabase Edge Functions or used in your own backend.

#### Frontend

The `PromptExplorer.jsx` component can be imported into your React application:

```jsx
import PromptExplorer from './PromptExplorer';
import './PromptExplorer.css';

function App() {
  return (
    <div className="App">
      <PromptExplorer />
    </div>
  );
}
```

## Database Structure

### ai_tool_prompts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| application_name | TEXT | Name of the AI tool |
| application_category | TEXT | Category of the application |
| prompt_title | TEXT | Title of the prompt |
| prompt_text | TEXT | Main prompt text |
| prompt_text_secondary | TEXT | Secondary prompt text |
| model_name | TEXT | Name of the model the prompt is designed for |
| source_url | TEXT | URL to the source of the prompt |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |
| likes | INTEGER | Number of likes |
| dislikes | INTEGER | Number of dislikes |
| uses | INTEGER | Number of uses |
| is_verified | BOOLEAN | Whether the prompt is verified |
| tags | TEXT[] | Array of tags |
| metadata | JSONB | Additional metadata |

### prompt_versions

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| prompt_id | UUID | Reference to ai_tool_prompts |
| prompt_text | TEXT | Prompt text for this version |
| prompt_text_secondary | TEXT | Secondary prompt text for this version |
| version_number | INTEGER | Version number |
| created_at | TIMESTAMP | Creation timestamp |
| created_by | UUID | User who created this version |
| change_notes | TEXT | Notes about the changes |

### user_prompt_interactions

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | User ID |
| prompt_id | UUID | Reference to ai_tool_prompts |
| interaction_type | TEXT | Type of interaction (like, dislike, use) |
| created_at | TIMESTAMP | Creation timestamp |

### prompt_comments

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| prompt_id | UUID | Reference to ai_tool_prompts |
| user_id | UUID | User ID |
| comment_text | TEXT | Comment text |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

## API Functions

- `getPrompts`: Get all prompts with pagination and filtering
- `getPromptById`: Get a single prompt by ID
- `createPrompt`: Create a new prompt
- `updatePrompt`: Update an existing prompt
- `deletePrompt`: Delete a prompt
- `likePrompt`: Like a prompt
- `dislikePrompt`: Dislike a prompt
- `usePrompt`: Record a prompt use
- `getPromptVersions`: Get all versions of a prompt
- `addComment`: Add a comment to a prompt
- `getComments`: Get all comments for a prompt
- `getCategories`: Get all application categories
- `getApplications`: Get all application names
- `getTags`: Get all tags with counts
- `searchPrompts`: Search prompts by query

## Frontend Component

The `PromptExplorer` component provides a complete interface for:

- Browsing prompts
- Filtering by category, application, and tags
- Searching prompts
- Sorting by popularity, recency, or usage
- Viewing prompt details
- Liking, disliking, and using prompts

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [ABoringBusiness/system-prompts-and-models-of-ai-tools](https://github.com/ABoringBusiness/system-prompts-and-models-of-ai-tools) for the prompt data
- Supabase for the database and backend infrastructure