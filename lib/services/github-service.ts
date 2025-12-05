/**
 * GitHub Service for Document Management
 * Adapted from Flowency Portal's GitHub-backed collaboration architecture
 */

const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_TOKEN;
const GITHUB_OWNER = 'flowency-live';
const GITHUB_REPO = 'client-docs';
const DOCS_PATH = 'durdle/admin';

export interface GitHubFile {
  content: string;
  sha: string;
  name: string;
  path: string;
}

export interface GitHubError {
  error: string;
  message: string;
  status?: number;
}

/**
 * Fetch a document from GitHub
 */
export async function getDocument(slug: string): Promise<GitHubFile | GitHubError> {
  if (!GITHUB_TOKEN) {
    return {
      error: 'CONFIGURATION_ERROR',
      message: 'GitHub token not configured'
    };
  }

  const filename = `${slug}.md`;
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DOCS_PATH}/${filename}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          error: 'NOT_FOUND',
          message: 'Document not found',
          status: 404
        };
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      content: atob(data.content),
      sha: data.sha,
      name: data.name,
      path: data.path
    };
  } catch (error) {
    console.error('Failed to fetch document from GitHub:', error);
    return {
      error: 'FETCH_ERROR',
      message: error instanceof Error ? error.message : 'Failed to fetch document'
    };
  }
}

/**
 * Update a document in GitHub
 */
export async function updateDocument(
  slug: string,
  content: string,
  sha: string,
  commitMessage?: string
): Promise<GitHubFile | GitHubError> {
  if (!GITHUB_TOKEN) {
    return {
      error: 'CONFIGURATION_ERROR',
      message: 'GitHub token not configured'
    };
  }

  const filename = `${slug}.md`;
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DOCS_PATH}/${filename}`;

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: commitMessage || `Update ${filename}`,
        content: btoa(content),
        sha: sha
      })
    });

    if (!response.ok) {
      if (response.status === 409) {
        return {
          error: 'CONFLICT',
          message: 'Document was modified by someone else. Please refresh and try again.',
          status: 409
        };
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      content: content,
      sha: data.content.sha,
      name: filename,
      path: data.content.path
    };
  } catch (error) {
    console.error('Failed to update document in GitHub:', error);
    return {
      error: 'UPDATE_ERROR',
      message: error instanceof Error ? error.message : 'Failed to update document'
    };
  }
}

/**
 * Create a new document in GitHub
 */
export async function createDocument(
  slug: string,
  content: string,
  commitMessage?: string
): Promise<GitHubFile | GitHubError> {
  if (!GITHUB_TOKEN) {
    return {
      error: 'CONFIGURATION_ERROR',
      message: 'GitHub token not configured'
    };
  }

  const filename = `${slug}.md`;
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DOCS_PATH}/${filename}`;

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: commitMessage || `Create ${filename}`,
        content: btoa(content)
      })
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      content: content,
      sha: data.content.sha,
      name: filename,
      path: data.content.path
    };
  } catch (error) {
    console.error('Failed to create document in GitHub:', error);
    return {
      error: 'CREATE_ERROR',
      message: error instanceof Error ? error.message : 'Failed to create document'
    };
  }
}

/**
 * List all documents in the repository
 */
export async function listDocuments(): Promise<Array<{slug: string, name: string, path: string}> | GitHubError> {
  if (!GITHUB_TOKEN) {
    return {
      error: 'CONFIGURATION_ERROR',
      message: 'GitHub token not configured'
    };
  }

  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DOCS_PATH}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .filter((item: any) => item.type === 'file' && item.name.endsWith('.md'))
      .map((item: any) => ({
        slug: item.name.replace('.md', ''),
        name: item.name,
        path: item.path
      }));
  } catch (error) {
    console.error('Failed to list documents from GitHub:', error);
    return {
      error: 'LIST_ERROR',
      message: error instanceof Error ? error.message : 'Failed to list documents'
    };
  }
}

/**
 * Type guard to check if result is an error
 */
export function isGitHubError(result: any): result is GitHubError {
  return result && typeof result === 'object' && 'error' in result;
}
