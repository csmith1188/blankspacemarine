/**
 * Deterministic Python whitespace, indentation, and PEP 8 blank-line validator.
 * Zero DOM dependencies — portable to a future Node.js authoritative server.
 */

const BLOCK_OPENERS = /^(def|if|elif|else|for|while|try|except|finally|with|class)\b/;
const BRANCH_KEYWORDS = /^(elif|else|except|finally)\b/;

export const POWERUP_CHAR = '✦';
export const BONUS_POINTS_CHAR = '◆';

function normalizeNewlines(text) {
  return String(text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function stripPowerupChars(text) {
  return String(text ?? '')
    .split(POWERUP_CHAR).join('')
    .split(BONUS_POINTS_CHAR).join('');
}

function getLeadingWhitespace(line) {
  const match = line.match(/^[ \t]*/);
  return match ? match[0] : '';
}

function getTrailingWhitespace(line) {
  const match = line.match(/[ \t]+$/);
  return match ? match[0] : '';
}

function getCoreContent(line) {
  return line.trim();
}

function stripAllWhitespace(line) {
  return line.replace(/[ \t]/g, '');
}

function extractKeyword(trimmedLine) {
  const match = trimmedLine.match(/^([a-zA-Z_]+)/);
  return match ? match[1] : 'block';
}

/**
 * Extracts non-empty code lines along with their 1-based line numbers
 * and how many blank lines appear before each code line (and after the last).
 */
function analyzeStructure(lines) {
  const codeLines = [];
  let blankRun = 0;
  let blankRunStartLine = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = getCoreContent(line);
    if (trimmed === '') {
      if (blankRun === 0) blankRunStartLine = i + 1;
      blankRun++;
    } else {
      codeLines.push({
        lineNum: i + 1,
        raw: line,
        trimmed,
        blanksBefore: blankRun,
        blankStartLine: blankRun > 0 ? blankRunStartLine : i + 1
      });
      blankRun = 0;
    }
  }

  return {
    codeLines,
    trailingBlanks: blankRun,
    trailingBlankStartLine: blankRun > 0 ? blankRunStartLine : lines.length
  };
}

/**
 * Validates a player's submitted code against a puzzle's rules and canonical solution(s).
 * Returns a plain JSON-serializable verdict DTO.
 */
export function validateSubmission(puzzle, submittedCode) {
  const normalizedSubmitted = normalizeNewlines(stripPowerupChars(submittedCode));
  const acceptedSolutions = Array.isArray(puzzle.acceptedSolutions) && puzzle.acceptedSolutions.length > 0
    ? puzzle.acceptedSolutions.map(normalizeNewlines)
    : [normalizeNewlines(puzzle.solution)];

  // Fast path: exact match with any accepted solution
  if (acceptedSolutions.includes(normalizedSubmitted)) {
    return {
      valid: true,
      issues: [],
      summary: 'All whitespace, indentation, and blank-line rules verified!'
    };
  }

  const canonical = acceptedSolutions[0];
  const expectedLines = canonical.split('\n');
  const actualLines = normalizedSubmitted.split('\n');
  const issues = [];

  const expectedStruct = analyzeStructure(expectedLines);
  const actualStruct = analyzeStructure(actualLines);

  // Guard 1: anti-tamper check on the sequence of non-empty Python code lines
  if (actualStruct.codeLines.length !== expectedStruct.codeLines.length) {
    issues.push({
      line: 1,
      column: 1,
      errorType: 'SyntaxError',
      pythonMessage: `SyntaxError: expected ${expectedStruct.codeLines.length} Python code lines, found ${actualStruct.codeLines.length}`,
      explanation: 'Only whitespace and blank lines may be added or removed. Keep all Python statements intact.',
      concept: 'alignment'
    });
    return {
      valid: false,
      issues,
      summary: issues[0].pythonMessage
    };
  }

  for (let i = 0; i < expectedStruct.codeLines.length; i++) {
    const exp = expectedStruct.codeLines[i];
    const act = actualStruct.codeLines[i];
    if (stripAllWhitespace(act.raw) !== stripAllWhitespace(exp.raw)) {
      issues.push({
        line: act.lineNum,
        column: 1,
        errorType: 'SyntaxError',
        pythonMessage: `SyntaxError: Python statement on line ${act.lineNum} is out of order or modified`,
        explanation: 'Keep the original Python statements in their proper order (use Alt+Up/Down if you shifted a line).',
        concept: 'alignment'
      });
      return {
        valid: false,
        issues,
        summary: issues[0].pythonMessage
      };
    }
  }

  // Pass 1: Dirty blank lines (whitespace-only lines that contain hidden spaces or tabs)
  for (let i = 0; i < actualLines.length; i++) {
    const line = actualLines[i];
    if (getCoreContent(line) === '' && line.length > 0) {
      const hasTab = line.includes('\t');
      issues.push({
        line: i + 1,
        column: 1,
        errorType: hasTab ? 'TabError' : 'WhitespaceError',
        pythonMessage: hasTab
          ? `TabError: blank line ${i + 1} contains hidden tab character(s)`
          : `WhitespaceError: blank line ${i + 1} contains ${line.length} hidden space(s)`,
        explanation: 'Empty lines must be completely blank (or deleted if no blank line belongs here).',
        concept: hasTab ? 'no_tabs' : 'trailing_whitespace'
      });
    }
  }

  // Pass 2: Leading / trailing blank lines at file boundaries
  if (actualStruct.codeLines.length > 0 && actualStruct.codeLines[0].blanksBefore > 0 && expectedStruct.codeLines[0].blanksBefore === 0) {
    issues.push({
      line: 1,
      column: 1,
      errorType: 'BlankLineError',
      pythonMessage: 'BlankLineError: unexpected blank line at start of script (line 1)',
      explanation: 'PEP 8: Start the file cleanly on line 1 with no leading blank lines.',
      concept: 'blank_lines'
    });
  }

  if (actualStruct.trailingBlanks > 0 && expectedStruct.trailingBlanks === 0) {
    issues.push({
      line: actualStruct.trailingBlankStartLine,
      column: 1,
      errorType: 'BlankLineError',
      pythonMessage: `BlankLineError: unnecessary trailing blank line at end of script (line ${actualStruct.trailingBlankStartLine})`,
      explanation: 'Remove extra blank lines at the very end of the script.',
      concept: 'blank_lines'
    });
  }

  // Pass 3: Code-line-by-code-line indentation, tabs, trailing spaces, and blank-line conventions
  let prevExpectedIndent = 0;
  let prevActualIndent = 0;
  let prevTrimmed = '';
  let prevActualLineNum = 0;

  for (let i = 0; i < expectedStruct.codeLines.length; i++) {
    const exp = expectedStruct.codeLines[i];
    const act = actualStruct.codeLines[i];
    const lineNum = act.lineNum;

    // A. Blank-line convention check between previous code line and this code line
    if (i > 0) {
      const prevOpenedBlock = prevTrimmed.endsWith(':') && BLOCK_OPENERS.test(prevTrimmed);

      if (prevOpenedBlock && act.blanksBefore > 0) {
        issues.push({
          line: act.blankStartLine,
          column: 1,
          errorType: 'BlankLineError',
          pythonMessage: `BlankLineError: unexpected blank line immediately after ':' on line ${prevActualLineNum}`,
          explanation: `PEP 8: Never leave a blank line immediately after a colon (:). Delete line ${act.blankStartLine} so the block starts right below.`,
          concept: 'blank_lines'
        });
      } else if (act.blanksBefore < exp.blanksBefore) {
        issues.push({
          line: lineNum,
          column: 1,
          errorType: 'BlankLineError',
          pythonMessage: `BlankLineError: missing blank line before line ${lineNum}`,
          explanation: 'PEP 8: Insert a blank line (Enter / Ctrl+Shift+Enter) to cleanly separate top-level functions and code sections.',
          concept: 'blank_lines'
        });
      } else if (act.blanksBefore > exp.blanksBefore) {
        issues.push({
          line: act.blankStartLine,
          column: 1,
          errorType: 'BlankLineError',
          pythonMessage: exp.blanksBefore === 0
            ? `BlankLineError: unexpected blank line on line ${act.blankStartLine}`
            : `BlankLineError: too many blank lines before line ${lineNum} (expected ${exp.blanksBefore}, found ${act.blanksBefore})`,
          explanation: exp.blanksBefore === 0
            ? 'Remove this extra blank line to keep statements in the same section together.'
            : `Use exactly ${exp.blanksBefore} blank line here to separate sections cleanly.`,
          concept: 'blank_lines'
        });
      }
    }

    // B. Tab characters anywhere on the line
    const tabIdx = act.raw.indexOf('\t');
    if (tabIdx !== -1) {
      issues.push({
        line: lineNum,
        column: tabIdx + 1,
        errorType: 'TabError',
        pythonMessage: `TabError: inconsistent use of tabs and spaces in indentation (line ${lineNum})`,
        explanation: 'Python PEP 8 forbids mixing tabs with spaces. Delete the tab (->) and use 4 spaces per indent level.',
        concept: 'no_tabs'
      });
    }

    // C. Internal token spacing check
    if (act.trimmed !== exp.trimmed) {
      issues.push({
        line: lineNum,
        column: getLeadingWhitespace(act.raw).length + 1,
        errorType: 'SyntaxError',
        pythonMessage: `SyntaxError: invalid spacing inside statement on line ${lineNum}`,
        explanation: 'Check the spaces inside the code statement itself — keep single spaces between Python keywords and expressions.',
        concept: 'alignment'
      });
    }

    // D. Trailing whitespace
    const trailing = getTrailingWhitespace(act.raw);
    if (trailing.length > 0) {
      issues.push({
        line: lineNum,
        column: act.raw.length - trailing.length + 1,
        errorType: 'WhitespaceError',
        pythonMessage: `WhitespaceError: ${trailing.length} rogue trailing space(s) at end of line ${lineNum}`,
        explanation: 'Remove extra spaces after the end of the code on this line.',
        concept: 'trailing_whitespace'
      });
    }

    // E. Leading indentation check
    const expectedLeading = getLeadingWhitespace(exp.raw);
    const actualLeading = getLeadingWhitespace(act.raw);
    const expectedSpaces = expectedLeading.length;
    const actualSpaces = actualLeading.length;

    if (!actualLeading.includes('\t') && actualSpaces !== expectedSpaces) {
      const prevOpenedBlock = prevTrimmed.endsWith(':') && BLOCK_OPENERS.test(prevTrimmed);
      const isBranch = BRANCH_KEYWORDS.test(act.trimmed);

      if (prevOpenedBlock && actualSpaces <= prevActualIndent && expectedSpaces > prevExpectedIndent) {
        const kw = extractKeyword(prevTrimmed);
        issues.push({
          line: lineNum,
          column: 1,
          errorType: 'IndentationError',
          pythonMessage: `IndentationError: expected an indented block after '${kw}' statement on line ${prevActualLineNum}`,
          explanation: `Because line ${prevActualLineNum} ends with a colon (:), line ${lineNum} must be indented ${expectedSpaces} spaces.`,
          concept: expectedSpaces > 4 ? 'nesting' : 'block_indent'
        });
      } else if (isBranch) {
        const kw = extractKeyword(act.trimmed);
        issues.push({
          line: lineNum,
          column: 1,
          errorType: 'IndentationError',
          pythonMessage: `IndentationError: '${kw}' on line ${lineNum} does not align with its matching block header`,
          explanation: `Align '${kw}' at ${expectedSpaces} spaces so it matches its opening statement.`,
          concept: 'branch_alignment'
        });
      } else if (expectedSpaces === 0 && actualSpaces > 0 && prevExpectedIndent === 0) {
        issues.push({
          line: lineNum,
          column: 1,
          errorType: 'IndentationError',
          pythonMessage: `IndentationError: unexpected indent on line ${lineNum}`,
          explanation: 'This line is at the top level (not inside any block), so it must start at 0 spaces.',
          concept: 'unexpected_indent'
        });
      } else if (actualSpaces % 4 !== 0) {
        issues.push({
          line: lineNum,
          column: 1,
          errorType: 'IndentationError',
          pythonMessage: `IndentationError: misaligned indent (${actualSpaces} spaces) on line ${lineNum}`,
          explanation: `Python uses 4 spaces per indent level. Adjust line ${lineNum} from ${actualSpaces} spaces to ${expectedSpaces} spaces.`,
          concept: 'alignment'
        });
      } else if (actualSpaces > expectedSpaces) {
        issues.push({
          line: lineNum,
          column: 1,
          errorType: 'IndentationError',
          pythonMessage: `IndentationError: unexpected indent on line ${lineNum} (found ${actualSpaces} spaces, expected ${expectedSpaces})`,
          explanation: `This statement belongs outside the inner block. Dedent line ${lineNum} back to ${expectedSpaces} spaces.`,
          concept: 'dedent_scope'
        });
      } else {
        issues.push({
          line: lineNum,
          column: 1,
          errorType: 'IndentationError',
          pythonMessage: `IndentationError: unindent does not match block level on line ${lineNum} (found ${actualSpaces} spaces, expected ${expectedSpaces})`,
          explanation: `Indent line ${lineNum} to ${expectedSpaces} spaces so it stays inside its block.`,
          concept: expectedSpaces > 4 ? 'nesting' : 'block_indent'
        });
      }
    }

    prevExpectedIndent = expectedSpaces;
    prevActualIndent = actualSpaces;
    prevTrimmed = exp.trimmed;
    prevActualLineNum = lineNum;
  }

  return {
    valid: issues.length === 0,
    issues,
    summary: issues.length > 0
      ? `${issues.length} hazard${issues.length === 1 ? '' : 's'} remaining — ${issues[0].pythonMessage}`
      : 'All whitespace, indentation, and blank-line rules verified!'
  };
}
