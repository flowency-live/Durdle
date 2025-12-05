import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, stat } from 'fs/promises';
import { join } from 'path';

const DOCS_DIR = join(process.cwd(), '.documentation', 'WorkingDocuments');

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    if (!slug || slug.includes('..') || slug.includes('/') || slug.includes('\\')) {
      return NextResponse.json(
        { error: 'Invalid document name' },
        { status: 400 }
      );
    }

    const filename = `${slug}.md`;
    const filePath = join(DOCS_DIR, filename);

    const [content, stats] = await Promise.all([
      readFile(filePath, 'utf-8'),
      stat(filePath),
    ]);

    return NextResponse.json({
      filename,
      content,
      lastModified: stats.mtime.toISOString(),
    });
  } catch (error) {
    console.error('Error reading document:', error);
    return NextResponse.json(
      { error: 'Document not found' },
      { status: 404 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    if (!slug || slug.includes('..') || slug.includes('/') || slug.includes('\\')) {
      return NextResponse.json(
        { error: 'Invalid document name' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { content } = body;

    if (typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content must be a string' },
        { status: 400 }
      );
    }

    const filename = `${slug}.md`;
    const filePath = join(DOCS_DIR, filename);

    await writeFile(filePath, content, 'utf-8');

    const stats = await stat(filePath);

    return NextResponse.json({
      filename,
      content,
      lastModified: stats.mtime.toISOString(),
    });
  } catch (error) {
    console.error('Error saving document:', error);
    return NextResponse.json(
      { error: 'Failed to save document' },
      { status: 500 }
    );
  }
}
