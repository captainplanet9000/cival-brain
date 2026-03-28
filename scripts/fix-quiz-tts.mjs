// Fix all quiz scripts: regenerate TTS content from script_content
// Ensures every question reads: question → all 4 options → pause → answer reveal

import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://eglvktbuuhlyjpnoukkm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnbHZrdGJ1dWhseWpwbm91a2ttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTYwODM1NiwiZXhwIjoyMDg1MTg0MzU2fQ.GdLH1BfMBeIPcH7IoXD1RednLDOXKJhFUDK5xiVSH30'
);

const FRAMEWORK_ID = '73b4fbe2-f5bf-4179-8b71-bea9ebbc2d4e';

function generateTtsFromScript(script) {
  const content = script.script_content || '';
  
  // Extract title
  const titleMatch = content.match(/\*\*([^*]+)\*\*/);
  const title = titleMatch ? titleMatch[1].replace(/[!?]*$/, '') : script.title;
  
  // Parse questions - handle both Q1. and ### QUESTION formats
  const questions = [];
  
  // Try Q1. format first
  const qBlocks = content.split(/(?:^|\n)\s*Q(\d+)\.\s*/i);
  if (qBlocks.length > 1) {
    for (let i = 1; i < qBlocks.length; i += 2) {
      const num = parseInt(qBlocks[i]);
      const block = qBlocks[i + 1] || '';
      
      // Stop at answer key section
      if (block.match(/^=== ANSWER/i)) break;
      
      const q = parseQuestion(block, num);
      if (q) questions.push(q);
    }
  }
  
  // Try ### QUESTION N or [QUESTION N] format
  if (questions.length === 0) {
    const questionBlocks = content.split(/(?:^|\n)\s*(?:#{0,4}\s*|\[)(?:QUESTION|Question)\s*(\d+)\s*[\]:\-. ]/gi);
    if (questionBlocks.length > 1) {
      for (let i = 1; i < questionBlocks.length; i += 2) {
        const num = parseInt(questionBlocks[i]);
        const block = questionBlocks[i + 1] || '';
        if (block.match(/^=== /)) break;
        const q = parseQuestion(block, num);
        if (q) questions.push(q);
      }
    }
  }
  
  // Try "Question N:" or numbered "1." with question marks
  if (questions.length === 0) {
    const lines = content.split('\n');
    let currentQ = null;
    for (const line of lines) {
      if (line.match(/^===\s*(?:ANSWER|INWORLD|MUSIC|VISUAL)/i)) break;
      const qMatch = line.match(/(?:^|\*\*)"?(.+\?)"?\*?\*?$/);
      if (qMatch && qMatch[1].length > 15) {
        if (currentQ) questions.push(currentQ);
        currentQ = { question: qMatch[1].replace(/^\*\*|\*\*$/g, '').trim(), options: [] };
      }
      if (currentQ) {
        // A) or A: options
        const optMatch = line.replace(/^[-*•]\s+/, '').match(/^([A-D])\)\s*(.+)/);
        if (optMatch) currentQ.options.push(optMatch[2].replace(/[✅✓]+/g, '').trim());
        // Would You Rather style: "A)" or "B)" at start
        const wyrMatch = line.match(/^([AB])\)\s*(.+)/);
        if (wyrMatch && !optMatch) currentQ.options.push(wyrMatch[2].replace(/[✅✓]+/g, '').trim());
      }
    }
    if (currentQ) questions.push(currentQ);
  }
  
  // Parse answer key
  const answerKeyMatch = content.match(/=== ANSWER KEY ===([\s\S]*?)(?:===|$)/i);
  const answers = {};
  if (answerKeyMatch) {
    const lines = answerKeyMatch[1].trim().split('\n');
    for (const line of lines) {
      const m = line.match(/Q(\d+)\s*:\s*\*?\*?\s*([A-Da-d])\s*[-–—]\s*(.+)/i);
      if (m) {
        const fullText = m[3].replace(/\*+/g, '').trim();
        // Split answer name from explanation at first period or exclamation
        const splitMatch = fullText.match(/^([^.!]+[.!])\s*(.*)/);
        const answerName = splitMatch ? splitMatch[1].replace(/[.!]+$/, '').trim() : fullText.replace(/[.!]+$/, '').trim();
        const explanation = splitMatch && splitMatch[2] ? splitMatch[2].replace(/[.!]+$/, '').trim() : '';
        answers[parseInt(m[1])] = {
          letter: m[2].toUpperCase(),
          text: answerName,
          explanation: explanation
        };
      }
    }
  }
  
  if (questions.length === 0) return null;
  
  // Build TTS narration
  let tts = `[surprised]\n`;
  tts += `${title}! Let's see how many you can get right.\n\n`;
  
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const num = i + 1;
    const ans = answers[num];
    
    tts += `[breathe] Question ${numberToWord(num)}. ${q.question}\n`;
    
    if (q.options.length >= 4) {
      tts += `Is it A, ${q.options[0]}... B, ${q.options[1]}... C, ${q.options[2]}... or D, ${q.options[3]}?\n`;
    } else if (q.options.length === 2) {
      tts += `Option A, ${q.options[0]}... or option B, ${q.options[1]}?\n`;
    } else if (q.options.length === 3) {
      tts += `Is it A, ${q.options[0]}... B, ${q.options[1]}... or C, ${q.options[2]}?\n`;
    }
    
    tts += `\n[breathe] [breathe] [breathe]\n\n`;
    
    if (ans) {
      tts += `The answer is... ${ans.letter}! *${ans.text}!*`;
      if (ans.explanation) {
        tts += ` ${ans.explanation}`;
      }
      tts += `\n\n`;
    }
  }
  
  tts += `So how did you do? Drop your score in the comments!\n`;
  
  return tts.trim();
}

function parseQuestion(block, num) {
  const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  
  let question = '';
  const options = [];
  
  // Find question text (line with ?)
  for (const line of lines) {
    const cleaned = line.replace(/^\*\*|\*\*$/g, '').replace(/^["']|["']$/g, '').replace(/^#+\s*/, '').trim();
    if (cleaned.includes('?') && cleaned.length > 10 && !cleaned.match(/^(?:REVEAL|Answer|Correct)/i)) {
      question = cleaned;
      break;
    }
  }
  if (!question) question = lines[0].replace(/^\*\*|\*\*$/g, '').trim();
  
  // Find options - handle inline: "A) text   B) text   C) text   D) text"
  for (const rawLine of lines) {
    const line = rawLine.replace(/^[-*•]\s+/, '').trim();
    
    // Inline options
    if (line.match(/[A-D]\)\s+\S+.*\s{2,}[A-D]\)/)) {
      const parts = line.split(/(?=\s*[A-D]\)\s*)/g).filter(s => s.trim());
      for (const part of parts) {
        const m = part.trim().match(/^([A-D])\)\s*(.+)/);
        if (m) options.push(m[2].replace(/[✅✓]+/g, '').trim());
      }
      break;
    }
    
    // Single option per line
    const optMatch = line.match(/^(?:[-*•]\s+)?([A-D])\)\s*(.+)/);
    if (optMatch) {
      options.push(optMatch[2].replace(/[✅✓]+/g, '').trim());
    }
  }
  
  if (!question) return null;
  return { question, options };
}

function numberToWord(n) {
  const words = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  return words[n] || String(n);
}

async function main() {
  // Get all quiz scripts
  let allScripts = [];
  let offset = 0;
  while (true) {
    const { data, error } = await sb.from('scripts')
      .select('id, title, script_content, tts_content')
      .eq('framework_id', FRAMEWORK_ID)
      .range(offset, offset + 999);
    if (error) { console.error('Fetch error:', error.message); break; }
    allScripts = [...allScripts, ...(data || [])];
    if (!data || data.length < 1000) break;
    offset += 1000;
  }
  
  console.log(`Found ${allScripts.length} quiz scripts to fix`);
  
  let fixed = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const script of allScripts) {
    const newTts = generateTtsFromScript(script);
    
    if (!newTts) {
      console.log(`SKIP: ${script.title} - couldn't parse questions`);
      skipped++;
      continue;
    }
    
    const { error } = await sb.from('scripts')
      .update({ 
        tts_content: newTts,
        updated_at: new Date().toISOString()
      })
      .eq('id', script.id);
    
    if (error) {
      console.log(`FAIL: ${script.title} - ${error.message}`);
      failed++;
    } else {
      fixed++;
      if (fixed % 10 === 0) console.log(`Fixed ${fixed}/${allScripts.length}...`);
    }
  }
  
  console.log(`\nDone! Fixed: ${fixed} | Skipped: ${skipped} | Failed: ${failed}`);
}

main();
