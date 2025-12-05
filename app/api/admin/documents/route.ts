import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

const DOCS_DIR = join(process.cwd(), '.documentation', 'WorkingDocuments');

export async function GET() {
  try {
    const files = await readdir(DOCS_DIR);

    const mdFiles = files.filter(file => file.endsWith('.md'));

    const documents = await Promise.all(
      mdFiles.map(async (filename) => {
        const filePath = join(DOCS_DIR, filename);
        const stats = await stat(filePath);
        const slug = filename.replace('.md', '');

        return {
          filename,
          slug,
          lastModified: stats.mtime.toISOString(),
        };
      })
    );

    documents.sort((a, b) =>
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error reading documents directory:', error);
    return NextResponse.json(
      { error: 'Failed to read documents' },
      { status: 500 }
    );
  }
}
