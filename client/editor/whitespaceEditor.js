/**
 * Keyboard-first locked Python Whitespace Editor with VS Code-style controls.
 *
 * - All non-whitespace Python characters are locked (armored).
 * - Only spaces and tabs can be inserted or destroyed.
 * - Supports VS Code controls:
 *   - Multiple cursors: Ctrl+Alt+Up/Down (or Alt+Shift+Up/Down), Ctrl+D (select duplicate), Alt+Click, Escape to collapse
 *   - Line shifting: Alt+Up / Alt+Down
 *   - Block indent/outdent: Tab / Shift+Tab, Ctrl+] / Ctrl+[
 *   - Selection: Shift+Arrows, Shift+Home/End, Shift+Click, Ctrl+A, Ctrl+L, Ctrl+D
 *   - Word/boundary jump: Ctrl+Left / Ctrl+Right, Ctrl+Home / Ctrl+End
 *   - Undo / Redo: Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z)
 * - Emits callbacks for VFX/SFX hooks (whitespaceDestroyed, whitespaceAdded, blockedEdit, submit, hint).
 */

import { POWERUP_CHAR, BONUS_POINTS_CHAR } from '../../core/validator.js';

const PY_KEYWORDS = new Set([
  'def', 'if', 'elif', 'else', 'for', 'while', 'in', 'return',
  'try', 'except', 'finally', 'with', 'class', 'and', 'or', 'not',
  'True', 'False', 'None', 'pass', 'break', 'continue'
]);

const PY_BUILTINS = new Set([
  'print', 'range', 'len', 'int', 'str', 'float', 'list', 'dict', 'ValueError'
]);

function isWhitespaceChar(ch) {
  return ch === ' ' || ch === '\t';
}

function isDeletableChar(ch) {
  return isWhitespaceChar(ch) || ch === POWERUP_CHAR || ch === BONUS_POINTS_CHAR;
}

function getLeadingLength(line) {
  let i = 0;
  while (i < line.length && isWhitespaceChar(line[i])) i++;
  return i;
}

function getTrailingStart(line) {
  let i = line.length;
  while (i > 0 && isWhitespaceChar(line[i - 1])) i--;
  return i;
}

function isWordChar(ch) {
  return /[a-zA-Z0-9_]/.test(ch);
}

function findPrevBoundary(line, col) {
  if (col <= 0) return 0;
  let i = col - 1;
  if (isWhitespaceChar(line[i])) {
    while (i > 0 && isWhitespaceChar(line[i - 1])) i--;
  } else if (isWordChar(line[i])) {
    while (i > 0 && isWordChar(line[i - 1])) i--;
  } else {
    while (i > 0 && !isWhitespaceChar(line[i - 1]) && !isWordChar(line[i - 1])) i--;
  }
  return i;
}

function findNextBoundary(line, col) {
  if (col >= line.length) return line.length;
  let i = col;
  if (isWhitespaceChar(line[i])) {
    while (i < line.length && isWhitespaceChar(line[i])) i++;
  } else if (isWordChar(line[i])) {
    while (i < line.length && isWordChar(line[i])) i++;
  } else {
    while (i < line.length && !isWhitespaceChar(line[i]) && !isWordChar(line[i])) i++;
  }
  return i;
}

function comparePos(r1, c1, r2, c2) {
  if (r1 !== r2) return r1 - r2;
  return c1 - c2;
}

function getSelectionBounds(cursor) {
  if (comparePos(cursor.anchorRow, cursor.anchorCol, cursor.row, cursor.col) <= 0) {
    return {
      startRow: cursor.anchorRow,
      startCol: cursor.anchorCol,
      endRow: cursor.row,
      endCol: cursor.col
    };
  }
  return {
    startRow: cursor.row,
    startCol: cursor.col,
    endRow: cursor.anchorRow,
    endCol: cursor.anchorCol
  };
}

function cursorHasSelection(cursor) {
  return cursor.anchorRow !== cursor.row || cursor.anchorCol !== cursor.col;
}

function cloneCursors(cursors) {
  return cursors.map((c) => ({ ...c }));
}

/**
 * Computes syntax highlight class per character index for the non-whitespace core of a line.
 */
function classifyLineChars(line) {
  const classes = new Array(line.length).fill('tok-plain');
  let i = 0;
  while (i < line.length) {
    const ch = line[i];

    if (ch === '#') {
      for (let j = i; j < line.length; j++) classes[j] = 'tok-comment';
      break;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      while (j < line.length && line[j] !== quote) {
        if (line[j] === '\\' && j + 1 < line.length) j++;
        j++;
      }
      const end = Math.min(line.length - 1, j);
      for (let k = i; k <= end; k++) classes[k] = 'tok-string';
      i = end + 1;
      continue;
    }

    if (/[0-9]/.test(ch) && (i === 0 || !/[a-zA-Z0-9_]/.test(line[i - 1]))) {
      let j = i;
      while (j < line.length && /[0-9.]/.test(line[j])) j++;
      for (let k = i; k < j; k++) classes[k] = 'tok-number';
      i = j;
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let j = i;
      while (j < line.length && /[a-zA-Z0-9_]/.test(line[j])) j++;
      const word = line.slice(i, j);
      let cls = 'tok-plain';
      if (PY_KEYWORDS.has(word)) cls = 'tok-keyword';
      else if (PY_BUILTINS.has(word)) cls = 'tok-builtin';
      for (let k = i; k < j; k++) classes[k] = cls;
      i = j;
      continue;
    }

    if (ch === ':') {
      classes[i] = 'tok-colon';
    } else if (/[()[\],=+\-*/%<>!]/.test(ch)) {
      classes[i] = 'tok-operator';
    }
    i++;
  }
  return classes;
}

/**
 * Computes syntax highlight class per character index for HTML lines.
 */
function classifyHtmlLineChars(line) {
  const classes = new Array(line.length).fill('tok-plain');
  let i = 0;
  while (i < line.length) {
    if (line.startsWith('<!--', i)) {
      const end = line.indexOf('-->', i + 4);
      const stop = end === -1 ? line.length : end + 3;
      for (let k = i; k < stop; k++) classes[k] = 'tok-comment';
      i = stop;
      continue;
    }

    if (line[i] === '<') {
      classes[i] = 'tok-operator';
      i++;
      if (i < line.length && (line[i] === '/' || line[i] === '!')) {
        classes[i] = 'tok-operator';
        i++;
      }
      // Tag name
      while (i < line.length && /[a-zA-Z0-9_-]/.test(line[i])) {
        classes[i] = 'tok-keyword';
        i++;
      }
      // Attributes until '>'
      while (i < line.length && line[i] !== '>') {
        const ch = line[i];
        if (ch === '"' || ch === "'") {
          const quote = ch;
          let j = i + 1;
          while (j < line.length && line[j] !== quote) j++;
          const end = Math.min(line.length - 1, j);
          for (let k = i; k <= end; k++) classes[k] = 'tok-string';
          i = end + 1;
          continue;
        }
        if (ch === '=' || ch === '/') {
          classes[i] = 'tok-operator';
          i++;
          continue;
        }
        if (/[a-zA-Z_-]/.test(ch)) {
          while (i < line.length && /[a-zA-Z0-9_-]/.test(line[i])) {
            classes[i] = 'tok-builtin';
            i++;
          }
          continue;
        }
        i++;
      }
      if (i < line.length && line[i] === '>') {
        classes[i] = 'tok-operator';
        i++;
      }
      continue;
    }

    i++;
  }
  return classes;
}

export class WhitespaceEditor {
  constructor(containerEl, callbacks = {}) {
    this.containerEl = containerEl;
    this.callbacks = callbacks;

    this.lines = [''];
    this.lineEndings = ['']; // '\n', '\r\n', '\r', or '' for final EOF line
    this.cursors = [{ row: 0, col: 0, anchorRow: 0, anchorCol: 0, preferredCol: 0 }];
    this.undoStack = [];
    this.redoStack = [];
    this.errorLines = new Map(); // 1-based lineNum -> errorType
    this.locked = false;
    this.language = 'python';

    this.containerEl.setAttribute('tabindex', '0');
    this.containerEl.setAttribute('role', 'textbox');
    this.containerEl.setAttribute('aria-multiline', 'true');
    this.containerEl.setAttribute('aria-label', 'Python whitespace mission editor');

    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onClick = this._handleClick.bind(this);
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseUp = this._handleMouseUp.bind(this);
    this.isDragging = false;
    this.containerEl.addEventListener('keydown', this._onKeyDown);
    this.containerEl.addEventListener('mousedown', this._onClick);
  }

  destroy() {
    this.containerEl.removeEventListener('keydown', this._onKeyDown);
    this.containerEl.removeEventListener('mousedown', this._onClick);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup', this._onMouseUp);
  }

  setCode(code) {
    const raw = String(code ?? '');
    const lines = [];
    const endings = [];
    const regex = /([^\r\n]*)(\r\n|\n|\r|$)/g;
    let match;
    while ((match = regex.exec(raw)) !== null) {
      lines.push(match[1]);
      endings.push(match[2]);
      if (match[2] === '') break;
    }
    this.lines = lines.length > 0 ? lines : [''];
    this.lineEndings = endings.length > 0 ? endings : [''];
    this.cursors = [{ row: 0, col: 0, anchorRow: 0, anchorCol: 0, preferredCol: 0 }];
    this.undoStack = [];
    this.redoStack = [];
    this.errorLines.clear();
    this.render();
    this._emitCursorUpdate();
  }

  getCode() {
    let out = '';
    for (let i = 0; i < this.lines.length; i++) {
      const ending = i < this.lines.length - 1 ? (this.lineEndings[i] || '\n') : '';
      out += this.lines[i] + ending;
    }
    return out;
  }

  _syncLineEndings() {
    while (this.lineEndings.length < this.lines.length) {
      this.lineEndings.push('\n');
    }
    if (this.lineEndings.length > this.lines.length) {
      this.lineEndings.length = this.lines.length;
    }
    for (let i = 0; i < this.lines.length - 1; i++) {
      if (!this.lineEndings[i]) this.lineEndings[i] = '\n';
    }
    if (this.lines.length > 0) {
      this.lineEndings[this.lines.length - 1] = '';
    }
  }

  setLocked(isLocked) {
    this.locked = Boolean(isLocked);
    this.containerEl.classList.toggle('is-locked', this.locked);
  }

  setLanguage(lang) {
    this.language = lang === 'html' ? 'html' : 'python';
  }

  setHazardVision(enabled) {
    this.containerEl.classList.toggle('powerup-hazard-vision', Boolean(enabled));
  }

  setErrorHighlights(issues = []) {
    this.errorLines.clear();
    for (const issue of issues) {
      if (issue && typeof issue.line === 'number') {
        this.errorLines.set(issue.line, issue.errorType || 'IndentationError');
      }
    }
    if (issues.length > 0 && typeof issues[0].line === 'number') {
      const targetRow = Math.max(0, Math.min(this.lines.length - 1, issues[0].line - 1));
      const targetCol = Math.max(0, Math.min(this.lines[targetRow].length, (issues[0].column || 1) - 1));
      this.cursors = [{
        row: targetRow,
        col: targetCol,
        anchorRow: targetRow,
        anchorCol: targetCol,
        preferredCol: targetCol
      }];
    }
    this.render();
    this._emitCursorUpdate();
  }

  clearErrorHighlights() {
    if (this.errorLines.size > 0) {
      this.errorLines.clear();
      this.render();
    }
  }

  focus() {
    this.containerEl.focus();
  }

  blur() {
    this.containerEl.blur();
  }

  _normalizeCursors() {
    const maxRow = Math.max(0, this.lines.length - 1);
    const seen = new Set();
    const deduped = [];

    for (const c of this.cursors) {
      const row = Math.max(0, Math.min(maxRow, c.row));
      const col = Math.max(0, Math.min(this.lines[row].length, c.col));
      const anchorRow = Math.max(0, Math.min(maxRow, c.anchorRow));
      const anchorCol = Math.max(0, Math.min(this.lines[anchorRow].length, c.anchorCol));
      const key = `${row}:${col}:${anchorRow}:${anchorCol}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push({
          row,
          col,
          anchorRow,
          anchorCol,
          preferredCol: typeof c.preferredCol === 'number' ? c.preferredCol : col
        });
      }
    }

    this.cursors = deduped.length > 0
      ? deduped
      : [{ row: 0, col: 0, anchorRow: 0, anchorCol: 0, preferredCol: 0 }];
  }

  _getTargetedRows() {
    const rowSet = new Set();
    for (const c of this.cursors) {
      const { startRow, endRow } = getSelectionBounds(c);
      for (let r = startRow; r <= endRow; r++) {
        rowSet.add(r);
      }
    }
    return Array.from(rowSet).sort((a, b) => a - b);
  }

  _hasAnySelection() {
    return this.cursors.some(cursorHasSelection);
  }

  _pushUndo() {
    this.undoStack.push({
      lines: this.lines.slice(),
      lineEndings: this.lineEndings.slice(),
      cursors: cloneCursors(this.cursors)
    });
    if (this.undoStack.length > 100) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  _undo() {
    if (this.undoStack.length === 0) return;
    this.redoStack.push({
      lines: this.lines.slice(),
      lineEndings: this.lineEndings.slice(),
      cursors: cloneCursors(this.cursors)
    });
    const snap = this.undoStack.pop();
    this.lines = snap.lines;
    this.lineEndings = snap.lineEndings || this.lines.map((_, i) => (i < this.lines.length - 1 ? '\n' : ''));
    this.cursors = snap.cursors;
    this._syncLineEndings();
    this._normalizeCursors();
    this.errorLines.clear();
    this.render();
    this._emitCursorUpdate();
  }

  _redo() {
    if (this.redoStack.length === 0) return;
    this.undoStack.push({
      lines: this.lines.slice(),
      lineEndings: this.lineEndings.slice(),
      cursors: cloneCursors(this.cursors)
    });
    const snap = this.redoStack.pop();
    this.lines = snap.lines;
    this.lineEndings = snap.lineEndings || this.lines.map((_, i) => (i < this.lines.length - 1 ? '\n' : ''));
    this.cursors = snap.cursors;
    this._syncLineEndings();
    this._normalizeCursors();
    this.errorLines.clear();
    this.render();
    this._emitCursorUpdate();
  }

  _getCaretScreenPositions() {
    const caretEls = this.containerEl.querySelectorAll('.editor-caret');
    if (caretEls.length > 0) {
      return Array.from(caretEls).map((el) => {
        const rect = el.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      });
    }
    const rect = this.containerEl.getBoundingClientRect();
    return [{ x: rect.left + 80, y: rect.top + 40 }];
  }

  _getRowScreenPosition(rowIdx) {
    const rowEl = this.containerEl.querySelector(`[data-line-row="${rowIdx}"] .editor-content`);
    if (rowEl) {
      const rect = rowEl.getBoundingClientRect();
      return { x: rect.left + 20, y: rect.top + rect.height / 2 };
    }
    return this._getCaretScreenPositions()[0];
  }

  _emitCursorUpdate(userMoved = false) {
    if (typeof this.callbacks.onCursorChange === 'function') {
      const primary = this.cursors[0];
      const line = this.lines[primary.row] || '';
      const leading = getLeadingLength(line);
      this.callbacks.onCursorChange({
        line: primary.row + 1,
        column: primary.col + 1,
        leadingSpaces: leading,
        cursorCount: this.cursors.length,
        userMoved
      });
    }
  }

  _emitBlocked(reason) {
    this.containerEl.classList.remove('blocked-shake');
    void this.containerEl.offsetWidth;
    this.containerEl.classList.add('blocked-shake');
    if (typeof this.callbacks.onBlockedEdit === 'function') {
      const positions = this._getCaretScreenPositions();
      this.callbacks.onBlockedEdit({
        reason,
        position: positions[0]
      });
    }
  }

  _getPositionFromEvent(event) {
    const targetEl = document.elementFromPoint
      ? document.elementFromPoint(event.clientX, event.clientY)
      : event.target;

    const charEl = targetEl && targetEl.closest ? targetEl.closest('[data-row][data-col]') : null;
    if (charEl && this.containerEl.contains(charEl)) {
      const row = Number(charEl.dataset.row);
      const col = Number(charEl.dataset.col);
      if (!Number.isNaN(row) && !Number.isNaN(col)) {
        const clampedRow = Math.max(0, Math.min(this.lines.length - 1, row));
        const maxCol = this.lines[clampedRow].length;
        let resolvedCol = Math.max(0, Math.min(maxCol, col));
        // If pointer is in the right half of a character span (not EOL), place caret after it
        if (!charEl.classList.contains('editor-eol') && resolvedCol < maxCol) {
          const rect = charEl.getBoundingClientRect();
          if (event.clientX >= rect.left + rect.width / 2) {
            resolvedCol += 1;
          }
        }
        return { row: clampedRow, col: resolvedCol };
      }
    }

    const lineEl = targetEl && targetEl.closest ? targetEl.closest('[data-line-row]') : null;
    let resolvedRow = null;
    let resolvedLineEl = null;

    if (lineEl && this.containerEl.contains(lineEl)) {
      const row = Number(lineEl.dataset.lineRow);
      if (!Number.isNaN(row)) {
        resolvedRow = Math.max(0, Math.min(this.lines.length - 1, row));
        resolvedLineEl = lineEl;
      }
    } else {
      // Pointer dragged outside lines (above/below/side): snap to nearest row vertically
      const lineEls = this.containerEl.querySelectorAll('[data-line-row]');
      let bestDist = Infinity;
      for (const el of lineEls) {
        const rect = el.getBoundingClientRect();
        const midY = (rect.top + rect.bottom) / 2;
        const dist = Math.abs(event.clientY - midY);
        if (dist < bestDist) {
          bestDist = dist;
          resolvedRow = Number(el.dataset.lineRow);
          resolvedLineEl = el;
        }
      }
    }

    if (resolvedRow === null || Number.isNaN(resolvedRow)) return null;
    resolvedRow = Math.max(0, Math.min(this.lines.length - 1, resolvedRow));

    if (resolvedLineEl) {
      const contentEl = resolvedLineEl.querySelector('.editor-content');
      if (contentEl) {
        const contentRect = contentEl.getBoundingClientRect();
        if (event.clientX <= contentRect.left) {
          return { row: resolvedRow, col: 0 };
        }
      }
    }

    return { row: resolvedRow, col: this.lines[resolvedRow].length };
  }

  _handleClick(event) {
    if (this.locked || event.button !== 0) return;

    const pos = this._getPositionFromEvent(event);
    if (!pos) return;

    const { row: targetRow, col: targetCol } = pos;
    event.preventDefault();
    this.containerEl.focus();

    const clickedEol = Boolean(event.target.closest('.editor-eol'));
    if (clickedEol && event.detail >= 2 && targetRow < this.lines.length - 1 && !event.altKey && !event.shiftKey) {
      // Double-click on LF/CRLF selects that line ending
      this.cursors = [{
        row: targetRow + 1,
        col: 0,
        anchorRow: targetRow,
        anchorCol: this.lines[targetRow].length,
        preferredCol: 0
      }];
      this._normalizeCursors();
      this.render();
      this._emitCursorUpdate(true);
      return;
    }

    if (event.altKey) {
      // VS Code Alt+Click: toggle/add cursor
      const existingIdx = this.cursors.findIndex(
        (c) => c.row === targetRow && c.col === targetCol
      );
      if (existingIdx !== -1 && this.cursors.length > 1) {
        this.cursors.splice(existingIdx, 1);
      } else {
        this.cursors.push({
          row: targetRow,
          col: targetCol,
          anchorRow: targetRow,
          anchorCol: targetCol,
          preferredCol: targetCol
        });
      }
    } else if (event.shiftKey) {
      // Shift+Click: extend primary selection
      const primary = this.cursors[0];
      this.cursors = [{
        row: targetRow,
        col: targetCol,
        anchorRow: primary.anchorRow,
        anchorCol: primary.anchorCol,
        preferredCol: targetCol
      }];
      this._startDrag();
    } else {
      this.cursors = [{
        row: targetRow,
        col: targetCol,
        anchorRow: targetRow,
        anchorCol: targetCol,
        preferredCol: targetCol
      }];
      this._startDrag();
    }

    this._normalizeCursors();
    this.render();
    this._emitCursorUpdate(true);
  }

  _startDrag() {
    this.isDragging = true;
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup', this._onMouseUp);
  }

  _handleMouseMove(event) {
    if (!this.isDragging || this.locked) {
      this._handleMouseUp();
      return;
    }
    if ((event.buttons & 1) === 0) {
      this._handleMouseUp();
      return;
    }

    const pos = this._getPositionFromEvent(event);
    if (!pos) return;

    const primary = this.cursors[0];
    if (!primary || (primary.row === pos.row && primary.col === pos.col)) return;

    this.cursors = [{
      row: pos.row,
      col: pos.col,
      anchorRow: primary.anchorRow,
      anchorCol: primary.anchorCol,
      preferredCol: pos.col
    }];
    this._normalizeCursors();
    this.render();
    this._emitCursorUpdate(false);
  }

  _handleMouseUp() {
    if (!this.isDragging) return;
    this.isDragging = false;
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup', this._onMouseUp);
  }

  _addCursorVertical(direction) {
    const sorted = this.cursors.slice().sort((a, b) => a.row - b.row);
    const edge = direction < 0 ? sorted[0] : sorted[sorted.length - 1];
    const nextRow = edge.row + direction;
    if (nextRow < 0 || nextRow >= this.lines.length) return;

    const pref = edge.preferredCol;
    const nextCol = Math.min(pref, this.lines[nextRow].length);
    this.cursors.push({
      row: nextRow,
      col: nextCol,
      anchorRow: nextRow,
      anchorCol: nextCol,
      preferredCol: pref
    });
    this._normalizeCursors();
    this.render();
    this._emitCursorUpdate(true);
  }

  _hasOverlappingSelection(row, startCol, endCol) {
    for (const c of this.cursors) {
      const b = getSelectionBounds(c);
      if (b.startRow !== row || b.endRow !== row) continue;
      if (startCol < b.endCol && endCol > b.startCol) {
        return true;
      }
      if (startCol === b.startCol && endCol === b.endCol) {
        return true;
      }
    }
    return false;
  }

  _selectNextDuplicate() {
    const last = this.cursors[this.cursors.length - 1];
    if (!last) return;

    // Step 1: If the active cursor has no selection yet, select the token/whitespace run under it
    if (!cursorHasSelection(last)) {
      const line = this.lines[last.row] || '';
      if (line.length === 0) return;

      let idx = last.col;
      if (idx >= line.length) idx = line.length - 1;
      else if (!isWordChar(line[idx]) && idx > 0 && isWordChar(line[idx - 1])) {
        idx = idx - 1;
      }

      let start = idx;
      let end = idx + 1;

      if (isWordChar(line[idx])) {
        while (start > 0 && isWordChar(line[start - 1])) start--;
        while (end < line.length && isWordChar(line[end])) end++;
      } else if (line[idx] === '\t') {
        start = idx;
        end = idx + 1;
      } else if (line[idx] === ' ') {
        while (start > 0 && line[start - 1] === ' ') start--;
        while (end < line.length && line[end] === ' ') end++;
      }

      last.anchorRow = last.row;
      last.anchorCol = start;
      last.col = end;
      last.preferredCol = end;
      this._normalizeCursors();
      this.render();
      this._emitCursorUpdate(true);
      return;
    }

    // Step 2: Find the next occurrence of the selected text and add a cursor selection there
    const bounds = getSelectionBounds(last);
    if (bounds.startRow !== bounds.endRow) return;

    const srcLine = this.lines[bounds.startRow] || '';
    const needle = srcLine.slice(bounds.startCol, bounds.endCol);
    if (!needle) return;

    const isPureWord = /^[a-zA-Z0-9_]+$/.test(needle);
    const wholeWord =
      isPureWord &&
      (bounds.startCol === 0 || !isWordChar(srcLine[bounds.startCol - 1])) &&
      (bounds.endCol >= srcLine.length || !isWordChar(srcLine[bounds.endCol]));

    const matchesAt = (line, pos) => {
      if (!wholeWord) return true;
      const beforeOk = pos === 0 || !isWordChar(line[pos - 1]);
      const afterPos = pos + needle.length;
      const afterOk = afterPos >= line.length || !isWordChar(line[afterPos]);
      return beforeOk && afterOk;
    };

    const totalRows = this.lines.length;
    for (let step = 0; step <= totalRows; step++) {
      const row = (bounds.endRow + step) % totalRows;
      const line = this.lines[row];
      let searchFrom = step === 0 ? bounds.endCol : 0;
      const maxStart = step === totalRows ? bounds.startCol : line.length;

      while (searchFrom <= line.length - needle.length) {
        const found = line.indexOf(needle, searchFrom);
        if (found === -1 || found >= maxStart) break;
        const foundEnd = found + needle.length;
        if (matchesAt(line, found) && !this._hasOverlappingSelection(row, found, foundEnd)) {
          this.cursors.push({
            row,
            col: foundEnd,
            anchorRow: row,
            anchorCol: found,
            preferredCol: foundEnd
          });
          this._normalizeCursors();
          this.render();
          this._emitCursorUpdate(true);
          return;
        }
        searchFrom = found + 1;
      }
    }
  }

  _shiftLines(direction) {
    const targeted = this._getTargetedRows();
    if (targeted.length === 0) return;

    if (direction < 0 && targeted[0] === 0) return;
    if (direction > 0 && targeted[targeted.length - 1] >= this.lines.length - 1) return;

    this._pushUndo();

    if (direction < 0) {
      for (const r of targeted) {
        const tmp = this.lines[r - 1];
        this.lines[r - 1] = this.lines[r];
        this.lines[r] = tmp;
      }
    } else {
      for (let i = targeted.length - 1; i >= 0; i--) {
        const r = targeted[i];
        const tmp = this.lines[r + 1];
        this.lines[r + 1] = this.lines[r];
        this.lines[r] = tmp;
      }
    }

    for (const c of this.cursors) {
      c.row += direction;
      c.anchorRow += direction;
    }

    this._normalizeCursors();
    this.errorLines.clear();
    this.render();
    this._emitCursorUpdate();
  }

  _indentTargetedRows() {
    const rows = this._getTargetedRows();
    if (rows.length === 0) return;

    const positions = rows.map((r) => this._getRowScreenPosition(r));
    this._pushUndo();

    for (const r of rows) {
      this.lines[r] = '    ' + this.lines[r];
      this.errorLines.delete(r + 1);
    }

    const rowSet = new Set(rows);
    for (const c of this.cursors) {
      if (rowSet.has(c.row)) {
        c.col += 4;
        c.preferredCol = c.col;
      }
      if (rowSet.has(c.anchorRow)) {
        c.anchorCol += 4;
      }
    }

    this._normalizeCursors();
    this.render();
    this._emitCursorUpdate();

    if (typeof this.callbacks.onWhitespaceAdded === 'function') {
      this.callbacks.onWhitespaceAdded({
        count: rows.length * 4,
        position: positions[0],
        positions
      });
    }
  }

  _dedentTargetedRows() {
    const rows = this._getTargetedRows();
    if (rows.length === 0) return;

    const changes = [];
    for (const r of rows) {
      const line = this.lines[r];
      if (line.length === 0 || !isWhitespaceChar(line[0])) continue;

      let removedCount = 0;
      let removedChar = ' ';
      if (line[0] === '\t') {
        removedCount = 1;
        removedChar = '\t';
      } else {
        const leadingLen = getLeadingLength(line);
        let leadingSpaces = 0;
        while (leadingSpaces < line.length && line[leadingSpaces] === ' ') leadingSpaces++;
        const rem = leadingSpaces % 4;
        removedCount = rem !== 0 ? rem : Math.min(4, leadingSpaces);
        if (removedCount === 0 && leadingLen > 0) removedCount = 1;
      }
      if (removedCount > 0) {
        changes.push({ row: r, removedCount, removedChar, pos: this._getRowScreenPosition(r) });
      }
    }

    if (changes.length === 0) {
      this._emitBlocked('No leading whitespace left to purge on selected line(s).');
      return;
    }

    this._pushUndo();
    const removedByRow = new Map();
    let totalRemoved = 0;
    let hasTab = false;

    for (const ch of changes) {
      this.lines[ch.row] = this.lines[ch.row].slice(ch.removedCount);
      this.errorLines.delete(ch.row + 1);
      removedByRow.set(ch.row, ch.removedCount);
      totalRemoved += ch.removedCount;
      if (ch.removedChar === '\t') hasTab = true;
    }

    for (const c of this.cursors) {
      if (removedByRow.has(c.row)) {
        c.col = Math.max(0, c.col - removedByRow.get(c.row));
        c.preferredCol = c.col;
      }
      if (removedByRow.has(c.anchorRow)) {
        c.anchorCol = Math.max(0, c.anchorCol - removedByRow.get(c.anchorRow));
      }
    }

    this._normalizeCursors();
    this.render();
    this._emitCursorUpdate();

    if (typeof this.callbacks.onWhitespaceDestroyed === 'function') {
      const positions = changes.map((ch) => ch.pos);
      this.callbacks.onWhitespaceDestroyed({
        count: totalRemoved,
        char: hasTab ? '\t' : ' ',
        position: positions[0],
        positions
      });
    }
  }

  _hasMultiLineSelection() {
    return this.cursors.some((c) => c.anchorRow !== c.row);
  }

  _insertWhitespaceAtCursors(text) {
    const len = text.length;
    const positions = this._getCaretScreenPositions();
    this._pushUndo();

    // Group cursors by row and apply right-to-left so earlier column offsets stay valid
    const indexed = this.cursors.map((c, idx) => ({ c, idx }));
    indexed.sort((a, b) => (b.c.row - a.c.row) || (b.c.col - a.c.col));

    for (const { c } of indexed) {
      const line = this.lines[c.row];
      this.lines[c.row] = line.slice(0, c.col) + text + line.slice(c.col);
      this.errorLines.delete(c.row + 1);
      // Shift any cursors on the same row at or to the right of c.col
      for (const other of this.cursors) {
        if (other.row === c.row && other.col >= c.col) {
          other.col += len;
          other.preferredCol = other.col;
        }
        if (other.anchorRow === c.row && other.anchorCol >= c.col) {
          other.anchorCol += len;
        }
      }
      c.anchorRow = c.row;
      c.anchorCol = c.col;
    }

    this._normalizeCursors();
    this.render();
    this._emitCursorUpdate();

    if (typeof this.callbacks.onWhitespaceAdded === 'function') {
      this.callbacks.onWhitespaceAdded({
        count: this.cursors.length * len,
        position: positions[0],
        positions
      });
    }
  }

  _deleteWhitespace(direction) {
    // direction: -1 for Backspace, +1 for Delete
    const positions = this._getCaretScreenPositions();
    const edits = [];

    // First check active selections (single-line or multi-line including LF)
    const hasSel = this._hasAnySelection();
    if (hasSel) {
      const hasMultiLineSel = this.cursors.some((c) => c.anchorRow !== c.row);
      if (hasMultiLineSel) {
        this._deleteMultiLineSelections(positions);
        return;
      }

      for (let idx = 0; idx < this.cursors.length; idx++) {
        const c = this.cursors[idx];
        if (!cursorHasSelection(c)) continue;
        const b = getSelectionBounds(c);
        const slice = this.lines[b.startRow].slice(b.startCol, b.endCol);
        const allDeletable = Array.from(slice).every(isDeletableChar);
        if (!allDeletable) {
          this._emitBlocked('Armored Python code in selection! Only whitespace or power-ups can be vaporized.');
          return;
        }
        edits.push({
          row: b.startRow,
          startCol: b.startCol,
          endCol: b.endCol,
          hasTab: slice.includes('\t'),
          hasPowerup: slice.includes(POWERUP_CHAR),
          hasBonusPoints: slice.includes(BONUS_POINTS_CHAR),
          pos: positions[idx] || positions[0]
        });
      }
    } else {
      for (let idx = 0; idx < this.cursors.length; idx++) {
        const c = this.cursors[idx];
        const line = this.lines[c.row];
        if (direction < 0) {
          if (c.col === 0) continue;
          const ch = line[c.col - 1];
          if (!isDeletableChar(ch)) continue;
          edits.push({
            row: c.row,
            startCol: c.col - 1,
            endCol: c.col,
            hasTab: ch === '\t',
            hasPowerup: ch === POWERUP_CHAR,
            hasBonusPoints: ch === BONUS_POINTS_CHAR,
            pos: positions[idx] || positions[0]
          });
        } else {
          if (c.col >= line.length) continue;
          const ch = line[c.col];
          if (!isDeletableChar(ch)) continue;
          edits.push({
            row: c.row,
            startCol: c.col,
            endCol: c.col + 1,
            hasTab: ch === '\t',
            hasPowerup: ch === POWERUP_CHAR,
            hasBonusPoints: ch === BONUS_POINTS_CHAR,
            pos: positions[idx] || positions[0]
          });
        }
      }
    }

    if (edits.length === 0) {
      // Check if we can safely delete an empty/blank line without merging armored code lines
      const blankRowsToDelete = new Set();
      const deletePositions = [];

      for (let idx = 0; idx < this.cursors.length; idx++) {
        const c = this.cursors[idx];
        const line = this.lines[c.row];
        if (direction < 0 && c.col === 0) {
          if (line.trim() === '' && this.lines.length > 1) {
            blankRowsToDelete.add(c.row);
            deletePositions.push(positions[idx] || positions[0]);
          } else if (c.row > 0 && this.lines[c.row - 1].trim() === '') {
            blankRowsToDelete.add(c.row - 1);
            deletePositions.push(this._getRowScreenPosition(c.row - 1));
          }
        } else if (direction > 0 && c.col >= line.length) {
          if (line.trim() === '' && this.lines.length > 1) {
            blankRowsToDelete.add(c.row);
            deletePositions.push(positions[idx] || positions[0]);
          } else if (c.row < this.lines.length - 1 && this.lines[c.row + 1].trim() === '') {
            blankRowsToDelete.add(c.row + 1);
            deletePositions.push(this._getRowScreenPosition(c.row + 1));
          }
        }
      }

      if (blankRowsToDelete.size > 0 && blankRowsToDelete.size < this.lines.length) {
        this._removeBlankRows(Array.from(blankRowsToDelete), deletePositions, direction);
        return;
      }

      const primary = this.cursors[0];
      const line = this.lines[primary.row];
      if ((direction < 0 && primary.col === 0) || (direction > 0 && primary.col >= line.length)) {
        this._emitBlocked('Cannot merge two Python code lines — only blank lines can be deleted.');
      } else {
        this._emitBlocked('Armored Python code! Only whitespace can be vaporized.');
      }
      return;
    }

    this._pushUndo();

    // Sort edits right-to-left per row and deduplicate identical spans
    edits.sort((a, b) => (b.row - a.row) || (b.startCol - a.startCol));
    const appliedPositions = [];
    let totalRemoved = 0;
    let anyTab = false;
    let powerupPosition = null;
    let bonusPointsPosition = null;
    const seenSpan = new Set();

    for (const e of edits) {
      const key = `${e.row}:${e.startCol}:${e.endCol}`;
      if (seenSpan.has(key)) continue;
      seenSpan.add(key);

      const len = e.endCol - e.startCol;
      const line = this.lines[e.row];
      this.lines[e.row] = line.slice(0, e.startCol) + line.slice(e.endCol);
      this.errorLines.delete(e.row + 1);
      totalRemoved += len;
      if (e.hasTab) anyTab = true;
      if (e.hasPowerup) powerupPosition = e.pos;
      if (e.hasBonusPoints) bonusPointsPosition = e.pos;
      appliedPositions.push(e.pos);

      for (const c of this.cursors) {
        if (c.row === e.row) {
          if (c.col > e.endCol) c.col -= len;
          else if (c.col >= e.startCol) c.col = e.startCol;
          c.preferredCol = c.col;
        }
        if (c.anchorRow === e.row) {
          if (c.anchorCol > e.endCol) c.anchorCol -= len;
          else if (c.anchorCol >= e.startCol) c.anchorCol = e.startCol;
        }
        c.anchorRow = c.row;
        c.anchorCol = c.col;
      }
    }

    this._normalizeCursors();
    this.render();
    this._emitCursorUpdate();

    if (powerupPosition && typeof this.callbacks.onPowerupCollected === 'function') {
      this.callbacks.onPowerupCollected({ position: powerupPosition });
    }
    if (bonusPointsPosition && typeof this.callbacks.onBonusPointsCollected === 'function') {
      this.callbacks.onBonusPointsCollected({ position: bonusPointsPosition });
    }
    if (!powerupPosition && !bonusPointsPosition && typeof this.callbacks.onWhitespaceDestroyed === 'function') {
      this.callbacks.onWhitespaceDestroyed({
        count: totalRemoved,
        char: anyTab ? '\t' : ' ',
        position: appliedPositions[0],
        positions: appliedPositions
      });
    }
  }

  _deleteMultiLineSelections(positions) {
    // Validate every selection: all selected chars must be deletable AND merging start/end must not merge two non-empty code lines
    const ranges = [];
    for (let idx = 0; idx < this.cursors.length; idx++) {
      const c = this.cursors[idx];
      if (!cursorHasSelection(c)) continue;
      const b = getSelectionBounds(c);
      if (b.startRow === b.endRow) {
        const slice = this.lines[b.startRow].slice(b.startCol, b.endCol);
        if (!Array.from(slice).every(isDeletableChar)) {
          this._emitBlocked('Armored Python code in selection! Only whitespace, blank lines, or power-ups can be vaporized.');
          return;
        }
        ranges.push({ ...b, pos: positions[idx] || positions[0], hasTab: slice.includes('\t'), hasPowerup: slice.includes(POWERUP_CHAR), hasBonusPoints: slice.includes(BONUS_POINTS_CHAR) });
        continue;
      }

      // Check all selected text across startRow..endRow
      let combinedSelected = this.lines[b.startRow].slice(b.startCol);
      for (let r = b.startRow + 1; r < b.endRow; r++) {
        combinedSelected += this.lines[r];
      }
      combinedSelected += this.lines[b.endRow].slice(0, b.endCol);

      if (!Array.from(combinedSelected).every(isDeletableChar)) {
        this._emitBlocked('Armored Python code in selection! Only whitespace, blank lines, or power-ups can be vaporized.');
        return;
      }

      // Check that joining the surviving prefix of startRow with the surviving suffix of endRow won't merge two code lines
      const survivingPrefix = this.lines[b.startRow].slice(0, b.startCol);
      const survivingSuffix = this.lines[b.endRow].slice(b.endCol);
      if (survivingPrefix.trim() !== '' && survivingSuffix.trim() !== '') {
        this._emitBlocked('Cannot merge two Python code lines — only blank lines can be deleted.');
        return;
      }

      ranges.push({
        ...b,
        pos: positions[idx] || positions[0],
        hasTab: combinedSelected.includes('\t'),
        hasPowerup: combinedSelected.includes(POWERUP_CHAR),
        hasBonusPoints: combinedSelected.includes(BONUS_POINTS_CHAR)
      });
    }

    if (ranges.length === 0) return;

    this._pushUndo();
    // Apply bottom-to-top so earlier row indices remain valid
    ranges.sort((a, b) => (b.startRow - a.startRow) || (b.startCol - a.startCol));

    let powerupPosition = null;
    let bonusPointsPosition = null;
    let anyTab = false;
    const appliedPositions = [];

    for (const r of ranges) {
      if (r.hasPowerup) powerupPosition = r.pos;
      if (r.hasBonusPoints) bonusPointsPosition = r.pos;
      if (r.hasTab) anyTab = true;
      appliedPositions.push(r.pos);

      const merged = this.lines[r.startRow].slice(0, r.startCol) + this.lines[r.endRow].slice(r.endCol);
      const removedLineCount = r.endRow - r.startRow;
      this.lines.splice(r.startRow, removedLineCount + 1, merged);
      if (removedLineCount > 0) {
        this.lineEndings.splice(r.startRow, removedLineCount);
      }
    }

    // Collapse cursors to the start of the top-most remaining range
    const primary = ranges[ranges.length - 1];
    const safeRow = Math.max(0, Math.min(this.lines.length - 1, primary.startRow));
    const safeCol = Math.max(0, Math.min(this.lines[safeRow].length, primary.startCol));
    this.cursors = [{
      row: safeRow,
      col: safeCol,
      anchorRow: safeRow,
      anchorCol: safeCol,
      preferredCol: safeCol
    }];

    this._syncLineEndings();
    this._normalizeCursors();
    this.errorLines.clear();
    this.render();
    this._emitCursorUpdate();

    if (powerupPosition && typeof this.callbacks.onPowerupCollected === 'function') {
      this.callbacks.onPowerupCollected({ position: powerupPosition });
    }
    if (bonusPointsPosition && typeof this.callbacks.onBonusPointsCollected === 'function') {
      this.callbacks.onBonusPointsCollected({ position: bonusPointsPosition });
    }
    if (!powerupPosition && !bonusPointsPosition && typeof this.callbacks.onWhitespaceDestroyed === 'function') {
      this.callbacks.onWhitespaceDestroyed({
        count: ranges.length,
        char: anyTab ? '\t' : '\n',
        position: appliedPositions[0],
        positions: appliedPositions
      });
    }
  }

  _removeBlankRows(rowsToRemove, positions, direction = -1) {
    const sortedDesc = Array.from(new Set(rowsToRemove)).sort((a, b) => b - a);
    if (sortedDesc.length === 0 || sortedDesc.length >= this.lines.length) return;

    this._pushUndo();
    for (const r of sortedDesc) {
      this.lines.splice(r, 1);
      this.lineEndings.splice(r, 1);
      for (const c of this.cursors) {
        if (c.row > r) {
          c.row -= 1;
        } else if (c.row === r) {
          if (direction < 0 && r > 0) {
            c.row = r - 1;
            c.col = this.lines[c.row].length;
          } else {
            c.row = Math.min(r, this.lines.length - 1);
            c.col = 0;
          }
          c.preferredCol = c.col;
        }
        c.anchorRow = c.row;
        c.anchorCol = c.col;
      }
    }

    this._syncLineEndings();
    this._normalizeCursors();
    this.errorLines.clear();
    this.render();
    this._emitCursorUpdate();

    if (typeof this.callbacks.onWhitespaceDestroyed === 'function') {
      this.callbacks.onWhitespaceDestroyed({
        count: sortedDesc.length,
        char: '\n',
        position: positions[0],
        positions
      });
    }
  }

  _insertBlankLines(mode = 'smart') {
    const positions = this._getCaretScreenPositions();

    if (mode === 'below' || mode === 'above') {
      const rows = this._getTargetedRows().sort((a, b) => b - a);
      if (rows.length === 0) return;

      this._pushUndo();
      for (const r of rows) {
        const insertAt = mode === 'below' ? r + 1 : r;
        this.lines.splice(insertAt, 0, '');
        this.lineEndings.splice(insertAt, 0, '\n');
        for (const c of this.cursors) {
          if (mode === 'below') {
            if (c.row > r) c.row += 1;
            else if (c.row === r) {
              c.row = r + 1;
              c.col = 0;
              c.preferredCol = 0;
            }
          } else {
            if (c.row > r) c.row += 1;
            else if (c.row === r) {
              c.row = r;
              c.col = 0;
              c.preferredCol = 0;
            }
          }
          c.anchorRow = c.row;
          c.anchorCol = c.col;
        }
      }

      this._normalizeCursors();
      this.errorLines.clear();
      this.render();
      this._emitCursorUpdate();

      if (typeof this.callbacks.onWhitespaceAdded === 'function') {
        this.callbacks.onWhitespaceAdded({
          count: rows.length,
          position: positions[0],
          positions
        });
      }
      return;
    }

    // Smart Enter: allowed on blank lines, before leading code, or after trailing code
    const actions = [];
    for (let idx = 0; idx < this.cursors.length; idx++) {
      const c = this.cursors[idx];
      const line = this.lines[c.row];
      const isBlank = line.trim() === '';
      const leadingLen = getLeadingLength(line);
      const trailingStart = getTrailingStart(line);

      if (!isBlank && c.col > leadingLen && c.col < trailingStart) {
        this._emitBlocked('Armored code! Move to line start/end or press Shift+Enter to insert a blank line.');
        return;
      }

      const placeAbove = !isBlank && c.col <= leadingLen;
      actions.push({ cursor: c, row: c.row, placeAbove });
    }

    this._pushUndo();
    // Apply bottom-to-top by unique row
    const seenRows = new Set();
    actions.sort((a, b) => b.row - a.row);

    for (const act of actions) {
      if (seenRows.has(act.row)) continue;
      seenRows.add(act.row);

      const insertAt = act.placeAbove ? act.row : act.row + 1;
      this.lines.splice(insertAt, 0, '');
      this.lineEndings.splice(insertAt, 0, '\n');

      for (const c of this.cursors) {
        if (act.placeAbove) {
          if (c.row >= act.row) c.row += 1;
        } else {
          if (c.row > act.row) c.row += 1;
          else if (c.row === act.row) {
            c.row = act.row + 1;
            c.col = 0;
            c.preferredCol = 0;
          }
        }
        c.anchorRow = c.row;
        c.anchorCol = c.col;
      }
    }

    this._syncLineEndings();
    this._normalizeCursors();
    this.errorLines.clear();
    this.render();
    this._emitCursorUpdate();

    if (typeof this.callbacks.onWhitespaceAdded === 'function') {
      this.callbacks.onWhitespaceAdded({
        count: seenRows.size,
        position: positions[0],
        positions
      });
    }
  }

  _deleteTargetedBlankLines() {
    const targeted = this._getTargetedRows();
    const blankRows = targeted.filter((r) => this.lines[r].trim() === '');
    if (blankRows.length === 0 || blankRows.length >= this.lines.length) {
      this._emitBlocked('Only blank lines can be deleted — Python code lines are armored!');
      return;
    }
    const positions = blankRows.map((r) => this._getRowScreenPosition(r));
    this._removeBlankRows(blankRows, positions, 1);
  }

  _moveCursors(key, { shiftKey, mod }) {
    for (const c of this.cursors) {
      const line = this.lines[c.row];

      if (key === 'ArrowUp') {
        if (c.row > 0) {
          c.row -= 1;
          c.col = Math.min(c.preferredCol, this.lines[c.row].length);
        } else if (!shiftKey) {
          c.col = 0;
          c.preferredCol = 0;
        }
      } else if (key === 'ArrowDown') {
        if (c.row < this.lines.length - 1) {
          c.row += 1;
          c.col = Math.min(c.preferredCol, this.lines[c.row].length);
        } else if (!shiftKey) {
          c.col = this.lines[c.row].length;
          c.preferredCol = c.col;
        }
      } else if (key === 'ArrowLeft') {
        if (mod) {
          if (c.col > 0) {
            c.col = findPrevBoundary(line, c.col);
          } else if (c.row > 0) {
            c.row -= 1;
            c.col = this.lines[c.row].length;
          }
        } else if (c.col > 0) {
          c.col -= 1;
        } else if (c.row > 0) {
          c.row -= 1;
          c.col = this.lines[c.row].length;
        }
        c.preferredCol = c.col;
      } else if (key === 'ArrowRight') {
        if (mod) {
          if (c.col < line.length) {
            c.col = findNextBoundary(line, c.col);
          } else if (c.row < this.lines.length - 1) {
            c.row += 1;
            c.col = 0;
          }
        } else if (c.col < line.length) {
          c.col += 1;
        } else if (c.row < this.lines.length - 1) {
          c.row += 1;
          c.col = 0;
        }
        c.preferredCol = c.col;
      } else if (key === 'Home') {
        const firstCode = getLeadingLength(line);
        c.col = c.col === firstCode ? 0 : firstCode;
        c.preferredCol = c.col;
      } else if (key === 'End') {
        c.col = line.length;
        c.preferredCol = c.col;
      }

      if (!shiftKey) {
        c.anchorRow = c.row;
        c.anchorCol = c.col;
      }
    }

    this._normalizeCursors();
    this.render();
    this._emitCursorUpdate(true);
  }

  _handleKeyDown(event) {
    const { key, ctrlKey, metaKey, shiftKey, altKey } = event;
    const mod = ctrlKey || metaKey;
    const lower = key.length === 1 ? key.toLowerCase() : key;

    const claim = () => {
      event.preventDefault();
      event.stopPropagation();
    };

    // Always override browser hotkeys for game controls while the code editor is focused,
    // even during brief locked mission transitions.
    if (this.locked) {
      const isGameChord =
        key === 'F1' ||
        key === 'Tab' ||
        key === ' ' ||
        key === 'Enter' ||
        key === 'Backspace' ||
        key === 'Delete' ||
        key === 'Escape' ||
        key === 'Home' ||
        key === 'End' ||
        key === 'PageUp' ||
        key === 'PageDown' ||
        key.startsWith('Arrow') ||
        (mod && !altKey && (
          lower === 'd' || lower === 'l' || lower === 'a' || lower === 's' ||
          lower === 'z' || lower === 'y' || lower === 'k' ||
          key === ']' || key === '[' || key === 'Enter'
        )) ||
        (altKey && key.startsWith('Arrow'));
      if (isGameChord) claim();
      return;
    }

    // Insert blank line above: Ctrl+Shift+Enter / Cmd+Shift+Enter
    if (mod && shiftKey && !altKey && key === 'Enter') {
      claim();
      this._insertBlankLines('above');
      return;
    }

    // Submit shortcut: Ctrl+Enter / Cmd+Enter
    if (mod && !shiftKey && key === 'Enter') {
      claim();
      if (typeof this.callbacks.onSubmit === 'function') {
        this.callbacks.onSubmit();
      }
      return;
    }

    // VS Code Select Duplicate / Next Match: Ctrl+D (overrides browser Bookmark)
    if (mod && !altKey && !shiftKey && lower === 'd') {
      claim();
      this._selectNextDuplicate();
      return;
    }

    // Prevent browser Save Page dialog if user instinctively hits Ctrl+S in the editor
    if (mod && !altKey && !shiftKey && lower === 's') {
      claim();
      return;
    }

    // VS Code Delete Line (blank lines only): Ctrl+Shift+K
    if (mod && shiftKey && !altKey && lower === 'k') {
      claim();
      this._deleteTargetedBlankLines();
      return;
    }

    // Hint shortcut: F1 (overrides browser Help)
    if (key === 'F1') {
      claim();
      if (typeof this.callbacks.onHint === 'function') {
        this.callbacks.onHint();
      }
      return;
    }

    // Escape: collapse multiple cursors & clear selection
    if (key === 'Escape') {
      claim();
      const p = this.cursors[0];
      this.cursors = [{
        row: p.row,
        col: p.col,
        anchorRow: p.row,
        anchorCol: p.col,
        preferredCol: p.col
      }];
      this.render();
      this._emitCursorUpdate();
      return;
    }

    // VS Code Multi-Cursor above/below: Ctrl+Alt+Up/Down OR Alt+Shift+Up/Down
    if ((altKey && (mod || shiftKey)) && (key === 'ArrowUp' || key === 'ArrowDown')) {
      claim();
      this._addCursorVertical(key === 'ArrowUp' ? -1 : 1);
      return;
    }

    // VS Code Shift Line Up/Down: Alt+Up / Alt+Down
    if (altKey && !mod && !shiftKey && (key === 'ArrowUp' || key === 'ArrowDown')) {
      claim();
      this._shiftLines(key === 'ArrowUp' ? -1 : 1);
      return;
    }

    // Prevent Alt+Left / Alt+Right browser Back/Forward navigation while editing
    if (altKey && !mod && (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'Home')) {
      claim();
      return;
    }

    // Undo / Redo (overrides browser undo/history)
    if (mod && !altKey && lower === 'z') {
      claim();
      if (shiftKey) this._redo();
      else this._undo();
      return;
    }
    if (mod && !altKey && lower === 'y') {
      claim();
      this._redo();
      return;
    }

    // VS Code Select All (Ctrl+A)
    if (mod && !altKey && lower === 'a') {
      claim();
      const lastRow = this.lines.length - 1;
      const lastCol = this.lines[lastRow].length;
      this.cursors = [{
        row: lastRow,
        col: lastCol,
        anchorRow: 0,
        anchorCol: 0,
        preferredCol: lastCol
      }];
      this.render();
      this._emitCursorUpdate();
      return;
    }

    // VS Code Select Line (Ctrl+L — overrides browser address bar focus)
    if (mod && !altKey && lower === 'l') {
      claim();
      for (const c of this.cursors) {
        c.anchorRow = c.row;
        c.anchorCol = 0;
        c.col = this.lines[c.row].length;
        c.preferredCol = c.col;
      }
      this._normalizeCursors();
      this.render();
      this._emitCursorUpdate();
      return;
    }

    // VS Code Indent / Outdent Line(s): Ctrl+] and Ctrl+[
    if (mod && !altKey && (key === ']' || key === '[')) {
      claim();
      if (key === ']') this._indentTargetedRows();
      else this._dedentTargetedRows();
      return;
    }

    // Document start/end jump: Ctrl+Home / Ctrl+End (with optional Shift)
    if (mod && !altKey && (key === 'Home' || key === 'End')) {
      claim();
      const targetRow = key === 'Home' ? 0 : this.lines.length - 1;
      const targetCol = key === 'Home' ? 0 : this.lines[targetRow].length;
      const primary = this.cursors[0];
      this.cursors = [{
        row: targetRow,
        col: targetCol,
        anchorRow: shiftKey ? primary.anchorRow : targetRow,
        anchorCol: shiftKey ? primary.anchorCol : targetCol,
        preferredCol: targetCol
      }];
      this.render();
      this._emitCursorUpdate(true);
      return;
    }

    // Word jump navigation: Ctrl+ArrowLeft / Ctrl+ArrowRight (with optional Shift)
    if (mod && !altKey && (key === 'ArrowLeft' || key === 'ArrowRight')) {
      claim();
      this._moveCursors(key, { shiftKey, mod: true });
      return;
    }

    // Allow browser shortcuts like Ctrl+R, Ctrl+Shift+I
    if (mod || altKey) return;

    // Standard + Shift-selection navigation keys
    if (
      key === 'ArrowUp' ||
      key === 'ArrowDown' ||
      key === 'ArrowLeft' ||
      key === 'ArrowRight' ||
      key === 'Home' ||
      key === 'End'
    ) {
      claim();
      this._moveCursors(key, { shiftKey, mod: false });
      return;
    }

    // PageUp / PageDown: jump to top / bottom of code window (with optional Shift selection)
    if (key === 'PageUp' || key === 'PageDown') {
      claim();
      const targetRow = key === 'PageUp' ? 0 : this.lines.length - 1;
      const targetCol = key === 'PageUp' ? 0 : this.lines[targetRow].length;
      const primary = this.cursors[0];
      this.cursors = [{
        row: targetRow,
        col: targetCol,
        anchorRow: shiftKey ? primary.anchorRow : targetRow,
        anchorCol: shiftKey ? primary.anchorCol : targetCol,
        preferredCol: targetCol
      }];
      this.render();
      this._emitCursorUpdate(true);
      return;
    }

    // Tab / Shift+Tab (VS Code behavior: Tab inserts 4 spaces at cursor, or indents multi-line selection)
    if (key === 'Tab') {
      claim();
      if (shiftKey) {
        this._dedentTargetedRows();
      } else if (this._hasMultiLineSelection()) {
        this._indentTargetedRows();
      } else {
        this._insertWhitespaceAtCursors('    ');
      }
      return;
    }

    // Spacebar: deploy 1 clean space at every cursor
    if (key === ' ') {
      claim();
      this._insertWhitespaceAtCursors(' ');
      return;
    }

    // Backspace / Delete: vaporize whitespace at every cursor
    if (key === 'Backspace') {
      claim();
      this._deleteWhitespace(-1);
      return;
    }

    if (key === 'Delete') {
      claim();
      this._deleteWhitespace(1);
      return;
    }

    // Enter / Shift+Enter: insert clean blank line without splitting Python code
    if (key === 'Enter') {
      claim();
      this._insertBlankLines(shiftKey ? 'below' : 'smart');
      return;
    }

    if (key.length === 1) {
      claim();
      this._emitBlocked('Code text is locked! Use Space, Tab, Shift+Tab, Backspace, or Delete.');
    }
  }

  _isCharSelected(rowIdx, colIdx) {
    for (const c of this.cursors) {
      if (!cursorHasSelection(c)) continue;
      const b = getSelectionBounds(c);
      if (rowIdx < b.startRow || rowIdx > b.endRow) continue;
      if (rowIdx === b.startRow && colIdx < b.startCol) continue;
      if (rowIdx === b.endRow && colIdx >= b.endCol) continue;
      return true;
    }
    return false;
  }

  _isEolSelected(rowIdx) {
    if (rowIdx >= this.lines.length - 1) return false;
    for (const c of this.cursors) {
      if (!cursorHasSelection(c)) continue;
      const b = getSelectionBounds(c);
      if (rowIdx >= b.startRow && rowIdx < b.endRow) return true;
    }
    return false;
  }

  render() {
    const frag = document.createDocumentFragment();

    // Map carets by row -> col -> isPrimary
    const caretsByRow = new Map();
    const activeRows = new Set();
    this.cursors.forEach((c, idx) => {
      activeRows.add(c.row);
      if (!caretsByRow.has(c.row)) caretsByRow.set(c.row, new Map());
      caretsByRow.get(c.row).set(c.col, idx === 0);
    });

    this.lines.forEach((line, rowIdx) => {
      const lineNum = rowIdx + 1;
      const isActiveRow = activeRows.has(rowIdx);
      const rowCarets = caretsByRow.get(rowIdx);
      const errorType = this.errorLines.get(lineNum);

      const rowEl = document.createElement('div');
      rowEl.className = 'editor-line';
      rowEl.dataset.lineRow = String(rowIdx);
      if (isActiveRow) rowEl.classList.add('is-active');
      if (errorType) rowEl.classList.add('has-error');

      const gutterEl = document.createElement('span');
      gutterEl.className = 'editor-gutter';
      gutterEl.textContent = String(lineNum).padStart(2, ' ');
      rowEl.appendChild(gutterEl);

      const contentEl = document.createElement('div');
      contentEl.className = 'editor-content';

      const leadingLen = getLeadingLength(line);
      const trailingStart = getTrailingStart(line);
      const isBlankDirty = line.trim() === '' && line.length > 0;
      const tokenClasses = this.language === 'html'
        ? classifyHtmlLineChars(line)
        : classifyLineChars(line);

      for (let colIdx = 0; colIdx < line.length; colIdx++) {
        if (rowCarets && rowCarets.has(colIdx)) {
          contentEl.appendChild(this._createCaret(rowCarets.get(colIdx)));
        }

        const ch = line[colIdx];
        const span = document.createElement('span');
        span.dataset.row = String(rowIdx);
        span.dataset.col = String(colIdx);

        if (ch === POWERUP_CHAR) {
          span.className = 'ws-glyph ws-powerup';
          span.textContent = POWERUP_CHAR;
          span.title = 'Tactical Power-Up: Delete to activate Hazard Vision (optional — can be skipped)';
        } else if (ch === BONUS_POINTS_CHAR) {
          span.className = 'ws-glyph ws-bonus';
          span.textContent = BONUS_POINTS_CHAR;
          span.title = 'Bonus Points Power-Up (+250 pts): Delete to collect (optional — can be skipped)';
        } else if (ch === '\t') {
          span.className = 'ws-glyph ws-tab';
          span.textContent = '→';
          span.title = 'Rogue Tab character (TabError hazard)';
        } else if (ch === ' ') {
          const isTrailing = isBlankDirty || colIdx >= trailingStart;
          const isLeading = colIdx < leadingLen;
          if (isTrailing) {
            span.className = 'ws-glyph ws-trailing';
            span.textContent = '·';
            span.title = 'Rogue trailing/blank-line space';
          } else if (isLeading) {
            span.className = 'ws-glyph ws-leading';
            span.textContent = '·';
          } else {
            span.className = 'ws-glyph ws-inline';
            span.textContent = '·';
          }
        } else {
          span.className = `code-char ${tokenClasses[colIdx]}`;
          span.textContent = ch;
        }

        if (this._isCharSelected(rowIdx, colIdx)) {
          span.classList.add('is-selected');
        }

        contentEl.appendChild(span);
      }

      if (rowCarets && rowCarets.has(line.length)) {
        contentEl.appendChild(this._createCaret(rowCarets.get(line.length)));
      }

      const eolEl = document.createElement('span');
      eolEl.className = 'editor-eol';
      eolEl.dataset.row = String(rowIdx);
      eolEl.dataset.col = String(line.length);

      const ending = rowIdx < this.lines.length - 1 ? (this.lineEndings[rowIdx] || '\n') : '';
      if (ending === '\r\n') {
        eolEl.classList.add('eol-glyph', 'eol-crlf');
        eolEl.textContent = '␍↵ CRLF';
        eolEl.title = 'Carriage Return + New Line (\\r\\n) — Double-click or Shift+Right to select';
      } else if (ending === '\r') {
        eolEl.classList.add('eol-glyph', 'eol-crlf');
        eolEl.textContent = '␍ CR';
        eolEl.title = 'Carriage Return (\\r) — Double-click or Shift+Right to select';
      } else if (ending === '\n') {
        eolEl.classList.add('eol-glyph', 'eol-lf');
        eolEl.textContent = '↵ LF';
        eolEl.title = 'New Line (\\n) — Double-click or Shift+Right to select';
      } else {
        eolEl.classList.add('eol-glyph', 'eol-eof');
        eolEl.textContent = 'EOF';
        eolEl.title = 'End of File';
      }
      if (this._isEolSelected(rowIdx)) {
        eolEl.classList.add('is-selected');
      }
      contentEl.appendChild(eolEl);

      rowEl.appendChild(contentEl);
      frag.appendChild(rowEl);
    });

    this.containerEl.innerHTML = '';
    this.containerEl.appendChild(frag);
  }

  _createCaret(isPrimary = true) {
    const caret = document.createElement('span');
    caret.className = isPrimary ? 'editor-caret is-primary' : 'editor-caret is-secondary';
    caret.setAttribute('aria-hidden', 'true');
    return caret;
  }
}
