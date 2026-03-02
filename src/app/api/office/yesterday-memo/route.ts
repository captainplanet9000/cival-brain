import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

/**
 * GET /api/office/yesterday-memo
 * Returns yesterday's memory file from clawd/memory/
 */
export async function GET() {
  try {
    const memoryDir = 'C:\\Users\\Anthony\\clawd\\memory';
    
    // Get yesterday's date in YYYY-MM-DD format
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    
    const memoPath = path.join(memoryDir, `${dateStr}.md`);

    try {
      const content = await fs.readFile(memoPath, 'utf-8');
      
      // Extract first 500 chars for display
      const snippet = content.substring(0, 500).trim();
      
      return NextResponse.json({
        success: true,
        date: dateStr,
        memo: snippet
      });
    } catch (fileError: any) {
      // If yesterday's file doesn't exist, try to find the most recent file
      try {
        const files = await fs.readdir(memoryDir);
        const mdFiles = files
          .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.md$/))
          .sort()
          .reverse();

        if (mdFiles.length > 0) {
          const recentFile = mdFiles[0];
          const content = await fs.readFile(path.join(memoryDir, recentFile), 'utf-8');
          const snippet = content.substring(0, 500).trim();
          const fileDate = recentFile.replace('.md', '');

          return NextResponse.json({
            success: true,
            date: fileDate,
            memo: snippet
          });
        }
      } catch (fallbackError) {
        console.error('Fallback memo read error:', fallbackError);
      }

      return NextResponse.json({
        success: false,
        date: dateStr,
        memo: 'No recent memory entries found'
      });
    }
  } catch (error) {
    console.error('Error reading yesterday memo:', error);
    return NextResponse.json({
      success: false,
      date: '',
      memo: 'Failed to load memo'
    }, { status: 500 });
  }
}
