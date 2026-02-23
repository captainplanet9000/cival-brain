import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Whitelist of safe commands
const SAFE_COMMANDS = [
  'git', 'npm', 'node', 'cat', 'ls', 'dir', 'type', 'echo',
  'pwd', 'cd', 'whoami', 'date', 'Get-ChildItem', 'Get-Content',
  'Get-Location', 'Write-Output', 'python', 'pip', 'curl', 'wget'
];

// Blacklist of dangerous patterns
const DANGEROUS_PATTERNS = [
  /rm\s+-rf/i,
  /del\s+\/[sf]/i,
  /format/i,
  /mkfs/i,
  /dd\s+if=/i,
  />\/dev\//i,
  /shutdown/i,
  /reboot/i,
  /systemctl\s+stop/i,
];

function isSafeCommand(command: string): { safe: boolean; reason?: string } {
  const trimmed = command.trim();
  
  // Check if command starts with a safe command
  const firstWord = trimmed.split(/\s+/)[0];
  const isSafe = SAFE_COMMANDS.some(safe => 
    firstWord === safe || firstWord.endsWith(`\\${safe}`) || firstWord.endsWith(`/${safe}`)
  );

  if (!isSafe) {
    return { safe: false, reason: `Command '${firstWord}' is not whitelisted` };
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { safe: false, reason: 'Command contains dangerous pattern' };
    }
  }

  return { safe: true };
}

export async function POST(request: Request) {
  try {
    const { command, workdir } = await request.json();

    if (!command || typeof command !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Invalid command',
      }, { status: 400 });
    }

    // Security check
    const safety = isSafeCommand(command);
    if (!safety.safe) {
      return NextResponse.json({
        success: false,
        error: `Blocked: ${safety.reason}`,
        blocked: true,
      }, { status: 403 });
    }

    // Execute command
    const options: any = { 
      timeout: 30000, // 30 second timeout
      maxBuffer: 1024 * 1024, // 1MB buffer
    };
    
    if (workdir) {
      options.cwd = workdir;
    }

    const { stdout, stderr } = await execAsync(command, options);

    return NextResponse.json({
      success: true,
      stdout: stdout || '',
      stderr: stderr || '',
      command,
    });
  } catch (error: any) {
    console.error('Execute error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Execution failed',
      stdout: error.stdout || '',
      stderr: error.stderr || '',
    }, { status: 500 });
  }
}
