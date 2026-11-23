/**
 * Portable puzzle catalog for Blank Space Marine.
 * Pure ES module (zero DOM/browser APIs) so it can be shared with a future authoritative server.
 */

import { BEGINNER_CONDITIONAL_PUZZLES } from './conditionalsCampaign.js';
import { HTML_FORMATTING_PUZZLES } from './htmlCampaign.js';

export const CONCEPT_METADATA = {
  unexpected_indent: {
    id: 'unexpected_indent',
    label: 'No Unexpected Indents',
    description: 'Top-level Python statements must start at column 0 with zero leading spaces.'
  },
  block_indent: {
    id: 'block_indent',
    label: '4-Space Block Indentation',
    description: 'Code inside if, for, while, def, or try blocks must be indented by 4 spaces.'
  },
  no_tabs: {
    id: 'no_tabs',
    label: 'Spaces Over Tabs (PEP 8)',
    description: 'Never mix tab characters with spaces in Python; always use 4 spaces per indent level.'
  },
  alignment: {
    id: 'alignment',
    label: 'Consistent 4-Space Alignment',
    description: 'All statements in the same block must line up at the exact same multiple of 4 spaces.'
  },
  trailing_whitespace: {
    id: 'trailing_whitespace',
    label: 'Clean Trailing & Blank Lines',
    description: 'Remove hidden spaces at the end of lines and on empty lines to keep code clean.'
  },
  branch_alignment: {
    id: 'branch_alignment',
    label: 'Branch Alignment (if/elif/else)',
    description: 'elif, else, and except must line up directly underneath their matching if or try.'
  },
  nesting: {
    id: 'nesting',
    label: 'Nested Block Depth',
    description: 'Each nested block adds another 4 spaces (4 -> 8 -> 12 spaces).'
  },
  dedent_scope: {
    id: 'dedent_scope',
    label: 'Dedenting Out of Blocks',
    description: 'Dedent back to the outer level when a loop or block finishes so statements run at the right time.'
  },
  blank_lines: {
    id: 'blank_lines',
    label: 'PEP 8 Blank Line Discipline',
    description: 'Put a blank line between functions/sections, and never leave a blank line immediately after a colon (:).'
  },
  vscode_hotkeys: {
    id: 'vscode_hotkeys',
    label: 'VS Code Multi-Cursor & Line Hotkeys',
    description: 'Use Ctrl+Alt+Up/Down (multi-cursor), Ctrl+D, Shift+Arrows + Tab, and End to edit whole blocks at speed.'
  },
  html_nesting: {
    id: 'html_nesting',
    label: 'HTML Tag Nesting (4-Space Steps)',
    description: 'Indent child HTML elements 4 spaces deeper than their parent opening tag.'
  },
  html_closing_tag: {
    id: 'html_closing_tag',
    label: 'HTML Closing Tag Alignment',
    description: 'Align every closing tag (</div>, </section>, </html>) directly beneath its matching opening tag.'
  }
};

export const SECTORS = [
  {
    id: 1,
    name: 'Sector 1: Boot Camp',
    subtitle: '4-Space Discipline',
    description: 'Master top-level alignment and 4-space block indentation after colons.'
  },
  {
    id: 2,
    name: 'Sector 2: Rogue Tabs & Drift',
    subtitle: 'Mixed Whitespace Threats',
    description: 'Eliminate forbidden tab characters, off-by-one space drift, and trailing space mines.'
  },
  {
    id: 3,
    name: 'Sector 3: Block Command',
    subtitle: 'Control Flow & Nesting',
    description: 'Align elif/else branches, nest loops properly, and dedent return statements out of loops.'
  },
  {
    id: 4,
    name: 'Sector 4: Blank Space Siege',
    subtitle: 'Multi-Bug Missions',
    description: 'Combine all Python whitespace rules under speed-run pressure.'
  }
];

export const PUZZLES = [
  // ======================== SECTOR 1: BOOT CAMP ========================
  {
    id: 's1-unexpected-indent',
    sector: 1,
    sectorName: 'Sector 1: Boot Camp',
    title: 'Rogue Leading Spaces',
    briefing: 'Purge the unexpected leading spaces so this top-level launch script starts cleanly at column 0.',
    parTimeMs: 14000,
    concepts: ['unexpected_indent'],
    hint: 'None of these lines are inside a block. Remove the leading spaces on lines 2 and 3 so every line starts at column 0.',
    brokenCode: [
      'ship_name = "Vanguard"',
      '  fuel_level = 100',
      '   print(ship_name, fuel_level)'
    ].join('\n'),
    solution: [
      'ship_name = "Vanguard"',
      'fuel_level = 100',
      'print(ship_name, fuel_level)'
    ].join('\n')
  },
  {
    id: 's1-if-block',
    sector: 1,
    sectorName: 'Sector 1: Boot Camp',
    title: 'Shields Up Conditional',
    briefing: 'Indent the lines inside the if statement by 4 spaces so Python knows they belong to the condition.',
    parTimeMs: 15000,
    concepts: ['block_indent'],
    hint: 'After a colon (:) on an if statement, the statements inside it must be indented by 4 spaces (press Tab).',
    brokenCode: [
      'shields = 25',
      '',
      'if shields < 50:',
      'print("Warning: Shields low!")',
      'shields = 100'
    ].join('\n'),
    solution: [
      'shields = 25',
      '',
      'if shields < 50:',
      '    print("Warning: Shields low!")',
      '    shields = 100'
    ].join('\n')
  },
  {
    id: 's1-for-loop',
    sector: 1,
    sectorName: 'Sector 1: Boot Camp',
    title: 'Countdown Thrusters',
    briefing: 'Fix the for loop body so the countdown prints inside the loop with 4-space indentation.',
    parTimeMs: 16000,
    concepts: ['block_indent', 'unexpected_indent'],
    hint: 'Line 1 should have 0 leading spaces. Lines 4 and 5 belong inside the for loop, so give them 4 spaces each.',
    brokenCode: [
      '  steps = 3',
      '',
      'for count in range(steps):',
      'print("Ignition step:", count)',
      '  print("Checking thrusters...")'
    ].join('\n'),
    solution: [
      'steps = 3',
      '',
      'for count in range(steps):',
      '    print("Ignition step:", count)',
      '    print("Checking thrusters...")'
    ].join('\n')
  },
  {
    id: 's1-def-function',
    sector: 1,
    sectorName: 'Sector 1: Boot Camp',
    title: 'Laser Calibration Function',
    briefing: 'Indent the function body cleanly by 4 spaces, keeping the function call at column 0.',
    parTimeMs: 18000,
    concepts: ['block_indent', 'dedent_scope'],
    hint: 'Lines 2 and 3 belong inside def boost_power(level): (4 spaces). Line 5 calls the function at the top level (0 spaces).',
    brokenCode: [
      'def boost_power(level):',
      'new_level = level * 2',
      'return new_level',
      '',
      '  print(boost_power(15))'
    ].join('\n'),
    solution: [
      'def boost_power(level):',
      '    new_level = level * 2',
      '    return new_level',
      '',
      'print(boost_power(15))'
    ].join('\n')
  },
  {
    id: 's1-multi-indent-volley',
    sector: 1,
    sectorName: 'Sector 1: Boot Camp',
    title: 'VS Code Drill: Block Indent Volley',
    briefing: 'All 5 lines inside launch_sequence() need 4-space indentation. Pro move: select them with Shift+Down and press Tab (or Ctrl+])!',
    parTimeMs: 12000,
    concepts: ['block_indent', 'vscode_hotkeys'],
    hint: 'Put your cursor on line 2, hold Shift and press Down 4 times to select lines 2-6, then press Tab once to indent the whole block!',
    brokenCode: [
      'def launch_sequence():',
      'print("Fuel locked")',
      'print("Nav online")',
      'print("Shields armed")',
      'print("Thrusters hot")',
      'print("Liftoff!")'
    ].join('\n'),
    solution: [
      'def launch_sequence():',
      '    print("Fuel locked")',
      '    print("Nav online")',
      '    print("Shields armed")',
      '    print("Thrusters hot")',
      '    print("Liftoff!")'
    ].join('\n')
  },

  // ======================== SECTOR 2: ROGUE TABS & DRIFT ========================
  {
    id: 's2-tab-infiltration',
    sector: 2,
    sectorName: 'Sector 2: Rogue Tabs & Drift',
    title: 'TabError Ambush',
    briefing: 'Destroy the alien tab characters (->) and replace them with 4 spaces to eliminate the TabError.',
    parTimeMs: 18000,
    concepts: ['no_tabs', 'block_indent'],
    hint: 'Look for the -> tab glyphs on lines 4 and 5. Delete them and press Tab (which deploys 4 clean spaces).',
    brokenCode: [
      'oxygen = 80',
      '',
      'if oxygen >= 50:',
      '\tprint("Cabin air nominal")',
      '\tstatus = "SAFE"'
    ].join('\n'),
    solution: [
      'oxygen = 80',
      '',
      'if oxygen >= 50:',
      '    print("Cabin air nominal")',
      '    status = "SAFE"'
    ].join('\n')
  },
  {
    id: 's2-three-space-drift',
    sector: 2,
    sectorName: 'Sector 2: Rogue Tabs & Drift',
    title: 'Orbital Drift Alignment',
    briefing: 'These loop statements drifted to 3 and 5 spaces. Snap every block line to exact 4-space discipline.',
    parTimeMs: 20000,
    concepts: ['alignment'],
    hint: 'Python requires every line in the same block to have the exact same indentation (4 spaces). Fix lines 4, 5, and 6.',
    brokenCode: [
      'targets = ["space", "tab", "drift"]',
      '',
      'for t in targets:',
      '   print("Locking onto:", t)',
      '     print("Firing plasma!")',
      '  print("Target cleared")'
    ].join('\n'),
    solution: [
      'targets = ["space", "tab", "drift"]',
      '',
      'for t in targets:',
      '    print("Locking onto:", t)',
      '    print("Firing plasma!")',
      '    print("Target cleared")'
    ].join('\n')
  },
  {
    id: 's2-trailing-mines',
    sector: 2,
    sectorName: 'Sector 2: Rogue Tabs & Drift',
    title: 'Trailing Space Mines',
    briefing: 'Vaporize every trailing space at the end of lines and delete the dirty blank line after the colon.',
    parTimeMs: 22000,
    concepts: ['trailing_whitespace', 'blank_lines'],
    hint: 'Use End + Backspace to destroy trailing spaces. Also delete line 4 completely — never leave a blank line right after while ...:',
    brokenCode: [
      'ammo = 12   ',
      '',
      'while ammo > 0:  ',
      '    ',
      '    ammo = ammo - 1  ',
      '    print("Remaining:", ammo) '
    ].join('\n'),
    solution: [
      'ammo = 12',
      '',
      'while ammo > 0:',
      '    ammo = ammo - 1',
      '    print("Remaining:", ammo)'
    ].join('\n')
  },
  {
    id: 's2-colon-gap',
    sector: 2,
    sectorName: 'Sector 2: Rogue Tabs & Drift',
    title: 'No Gap After Colon',
    briefing: 'PEP 8 forbids blank lines immediately after a colon (:). Delete the rogue gaps after if: and for:!',
    parTimeMs: 18000,
    concepts: ['blank_lines'],
    hint: 'Move onto each blank line immediately below a colon (:) and press Backspace, Delete, or Ctrl+Shift+K to vaporize the line.',
    brokenCode: [
      'active = True',
      '',
      'if active:',
      '',
      '    for pulse in range(3):',
      '',
      '        print("Pulse", pulse)'
    ].join('\n'),
    solution: [
      'active = True',
      '',
      'if active:',
      '    for pulse in range(3):',
      '        print("Pulse", pulse)'
    ].join('\n')
  },
  {
    id: 's2-multi-tab-purge',
    sector: 2,
    sectorName: 'Sector 2: Rogue Tabs & Drift',
    title: 'VS Code Drill: Multi-Cursor Tab Purge',
    briefing: 'Five consecutive lines are infected with alien tabs (->). Stack cursors with Ctrl+Alt+Down and purge them all in one volley!',
    parTimeMs: 15000,
    concepts: ['no_tabs', 'vscode_hotkeys'],
    hint: 'Move to line 2 col 1, press Ctrl+Alt+Down 4 times to place 5 cursors, then press Delete (to vaporize all 5 tabs) and Tab (to deploy 4 spaces on every line)!',
    brokenCode: [
      'def load_arsenal():',
      '\tlaser = 100',
      '\tplasma = 80',
      '\tshields = 100',
      '\tthrusters = 90',
      '\treturn laser + plasma'
    ].join('\n'),
    solution: [
      'def load_arsenal():',
      '    laser = 100',
      '    plasma = 80',
      '    shields = 100',
      '    thrusters = 90',
      '    return laser + plasma'
    ].join('\n')
  },
  {
    id: 's2-end-line-sweep',
    sector: 2,
    sectorName: 'Sector 2: Rogue Tabs & Drift',
    title: 'VS Code Drill: End-of-Line Sweep',
    briefing: 'Every line has 2 trailing space mines at the end. Stack cursors with Ctrl+Alt+Down, hit End, and vaporize all 10 mines at once!',
    parTimeMs: 14000,
    concepts: ['trailing_whitespace', 'vscode_hotkeys'],
    hint: 'Start on line 1, press Ctrl+Alt+Down 4 times for 5 cursors, press End to jump to the end of every line, then press Backspace twice!',
    brokenCode: [
      'hull = 100  ',
      'power = 95  ',
      'oxygen = 88  ',
      'radar = "ON"  ',
      'print(hull, power, oxygen, radar)  '
    ].join('\n'),
    solution: [
      'hull = 100',
      'power = 95',
      'oxygen = 88',
      'radar = "ON"',
      'print(hull, power, oxygen, radar)'
    ].join('\n')
  },
  {
    id: 's2-mixed-func',
    sector: 2,
    sectorName: 'Sector 2: Rogue Tabs & Drift',
    title: 'Contaminated Subroutine',
    briefing: 'Clean out mixed tabs, 2-space drift, and trailing whitespace inside this telemetry function.',
    parTimeMs: 24000,
    concepts: ['no_tabs', 'alignment', 'trailing_whitespace'],
    hint: 'Replace the tab on line 2 and the 2-space indent on line 3 with 4 spaces, and delete trailing spaces on lines 1 and 4.',
    brokenCode: [
      'def report_speed(km_s):  ',
      '\tdoubled = km_s * 2',
      '  print("Hyper speed:", doubled)',
      '    return doubled   '
    ].join('\n'),
    solution: [
      'def report_speed(km_s):',
      '    doubled = km_s * 2',
      '    print("Hyper speed:", doubled)',
      '    return doubled'
    ].join('\n')
  },

  // ======================== SECTOR 3: BLOCK COMMAND ========================
  {
    id: 's3-if-elif-else',
    sector: 3,
    sectorName: 'Sector 3: Block Command',
    title: 'Rank Classifier',
    briefing: 'Align the if, elif, and else headers at column 0 and indent each branch body by 4 spaces.',
    parTimeMs: 24000,
    concepts: ['branch_alignment', 'block_indent'],
    hint: 'if, elif, and else must all start at 0 spaces. Each print(...) statement underneath them must be at 4 spaces.',
    brokenCode: [
      'score = 88',
      '',
      'if score >= 90:',
      '    print("Commander")',
      '  elif score >= 75:',
      '  print("Lieutenant")',
      '    else:',
      'print("Cadet")'
    ].join('\n'),
    solution: [
      'score = 88',
      '',
      'if score >= 90:',
      '    print("Commander")',
      'elif score >= 75:',
      '    print("Lieutenant")',
      'else:',
      '    print("Cadet")'
    ].join('\n')
  },
  {
    id: 's3-nested-loop-if',
    sector: 3,
    sectorName: 'Sector 3: Block Command',
    title: 'Nested Radar Filter',
    briefing: 'Fix the nested indentation: the if goes at 4 spaces inside the for loop, and print goes at 8 spaces.',
    parTimeMs: 24000,
    concepts: ['nesting', 'alignment'],
    hint: 'Inside for num in readings: use 4 spaces for the if line, and 8 spaces (two Tabs) for the print line inside the if.',
    brokenCode: [
      'readings = [10, 15, 22, 31]',
      '',
      'for num in readings:',
      '  if num % 2 == 0:',
      '    print("Even signal:", num)',
      '      print("Signal locked")'
    ].join('\n'),
    solution: [
      'readings = [10, 15, 22, 31]',
      '',
      'for num in readings:',
      '    if num % 2 == 0:',
      '        print("Even signal:", num)',
      '        print("Signal locked")'
    ].join('\n')
  },
  {
    id: 's3-while-dedent',
    sector: 3,
    sectorName: 'Sector 3: Block Command',
    title: 'Escape the Loop',
    briefing: 'The final launch message is trapped inside the while loop! Dedent it to column 0 so it runs once after the loop.',
    parTimeMs: 20000,
    concepts: ['dedent_scope', 'alignment'],
    hint: 'Keep a blank line before and after the while loop. Lines inside while stay at 4 spaces, and print("Liftoff!") belongs outside at 0 spaces.',
    brokenCode: [
      'timer = 3',
      '',
      'while timer > 0:',
      '   print(timer)',
      '    timer -= 1',
      '    print("Liftoff!")'
    ].join('\n'),
    solution: [
      'timer = 3',
      '',
      'while timer > 0:',
      '    print(timer)',
      '    timer -= 1',
      '',
      'print("Liftoff!")'
    ].join('\n')
  },
  {
    id: 's3-return-scope',
    sector: 3,
    sectorName: 'Sector 3: Block Command',
    title: 'Premature Return Trap',
    briefing: 'Classic bug! return total is indented inside the for loop, exiting early. Dedent it to 4 spaces inside def.',
    parTimeMs: 22000,
    concepts: ['dedent_scope', 'nesting'],
    hint: 'total += n must be at 8 spaces (inside for). return total must be at 4 spaces (inside def, after the loop finishes).',
    brokenCode: [
      'def sum_cells(cells):',
      '    total = 0',
      '    for n in cells:',
      '      total += n',
      '        return total'
    ].join('\n'),
    solution: [
      'def sum_cells(cells):',
      '    total = 0',
      '    for n in cells:',
      '        total += n',
      '    return total'
    ].join('\n')
  },
  {
    id: 's3-section-breaks',
    sector: 3,
    sectorName: 'Sector 3: Block Command',
    title: 'Section Separation Protocol',
    briefing: 'Delete the blank line right after def, and insert clean blank lines between the functions and the main call.',
    parTimeMs: 24000,
    concepts: ['blank_lines', 'block_indent'],
    hint: 'Remove the blank line after def shield_ok(hp):, then press Enter at the end of each function (or Shift+Enter) to separate the two functions and the final print.',
    brokenCode: [
      'def shield_ok(hp):',
      '',
      '    return hp >= 50',
      'def status_msg(hp):',
      '    return "READY" if shield_ok(hp) else "LOW"',
      'print(status_msg(75))'
    ].join('\n'),
    solution: [
      'def shield_ok(hp):',
      '    return hp >= 50',
      '',
      'def status_msg(hp):',
      '    return "READY" if shield_ok(hp) else "LOW"',
      '',
      'print(status_msg(75))'
    ].join('\n')
  },
  // ======================== SECTOR 4: BLANK SPACE SIEGE ========================
  {
    id: 's4-list-accumulator',
    sector: 4,
    sectorName: 'Sector 4: Blank Space Siege',
    title: 'High-Threat Scanner',
    briefing: 'Purge tabs, fix 8-space nesting, remove trailing spaces, and dedent return alerts out of the loop.',
    parTimeMs: 30000,
    concepts: ['no_tabs', 'nesting', 'dedent_scope', 'trailing_whitespace'],
    hint: 'def body = 4 spaces, if inside for = 8 spaces, alerts.append = 12 spaces, return alerts = 4 spaces. Destroy all tabs and trailing spaces.',
    brokenCode: [
      'def find_threats(levels):  ',
      '\talerts = []',
      '    for lvl in levels:',
      '      if lvl > 70: ',
      '\t\talerts.append(lvl)',
      '        return alerts'
    ].join('\n'),
    solution: [
      'def find_threats(levels):',
      '    alerts = []',
      '    for lvl in levels:',
      '        if lvl > 70:',
      '            alerts.append(lvl)',
      '    return alerts'
    ].join('\n')
  },
  {
    id: 's4-try-except',
    sector: 4,
    sectorName: 'Sector 4: Blank Space Siege',
    title: 'Safe Docking Parser',
    briefing: 'Align try and except at 4 spaces inside the function and indent their bodies to 8 spaces.',
    parTimeMs: 28000,
    concepts: ['branch_alignment', 'nesting', 'no_tabs'],
    hint: 'Inside def parse_bay(text): both try: and except ValueError: sit at 4 spaces. Their return lines sit at 8 spaces.',
    brokenCode: [
      'def parse_bay(text):',
      '    try:',
      '    return int(text)',
      '        except ValueError:',
      '\t\treturn -1'
    ].join('\n'),
    solution: [
      'def parse_bay(text):',
      '    try:',
      '        return int(text)',
      '    except ValueError:',
      '        return -1'
    ].join('\n')
  },
  {
    id: 's4-nested-grid',
    sector: 4,
    sectorName: 'Sector 4: Blank Space Siege',
    title: 'Sector Grid Sweep',
    briefing: 'Fix the double for-loop nesting (4 and 8 spaces), clear the dirty blank line, and vaporize trailing spaces.',
    parTimeMs: 30000,
    concepts: ['nesting', 'no_tabs', 'trailing_whitespace', 'dedent_scope'],
    hint: 'Inner for loop is at 4 spaces; print inside it is at 8 spaces. Clear spaces on line 5, and put print("Sweep done") at 0 spaces.',
    brokenCode: [
      'for row in range(2): ',
      '\tfor col in range(2):',
      '      print(row, col)  ',
      '   ',
      '    print("Sweep done")'
    ].join('\n'),
    solution: [
      'for row in range(2):',
      '    for col in range(2):',
      '        print(row, col)',
      '',
      'print("Sweep done")'
    ].join('\n')
  },
  {
    id: 's4-boss-purge',
    sector: 4,
    sectorName: 'Sector 4: Blank Space Siege',
    title: 'Orbital Defense Core',
    briefing: 'Purge every tab, drift, misaligned else, dirty blank line, and trailing space to restore orbital defense.',
    parTimeMs: 38000,
    concepts: ['no_tabs', 'nesting', 'branch_alignment', 'dedent_scope', 'trailing_whitespace'],
    hint: 'Inside def count_ready(squad): ready = 0, for, and return sit at 4 spaces; if/else at 8 spaces; their bodies at 12 spaces. Final print sits at 0 spaces.',
    brokenCode: [
      'def count_ready(squad):  ',
      '\tready = 0',
      '    for power in squad:',
      '      if power >= 50:',
      '          ready += 1 ',
      '    else:',
      '\t\t\tprint("Recharging")',
      '        return ready',
      '    ',
      '  print(count_ready([80, 30, 95])) '
    ].join('\n'),
    solution: [
      'def count_ready(squad):',
      '    ready = 0',
      '    for power in squad:',
      '        if power >= 50:',
      '            ready += 1',
      '        else:',
      '            print("Recharging")',
      '    return ready',
      '',
      'print(count_ready([80, 30, 95]))'
    ].join('\n')
  },
  {
    id: 's4-telemetry-gauntlet',
    sector: 4,
    sectorName: 'Sector 4: Blank Space Siege',
    title: 'Gauntlet I: Telemetry Reactor',
    briefing: 'Full hazard mix! Fix section blank lines, delete the gap after def:, purge tabs, align if/elif/else, and clear trailing spaces.',
    parTimeMs: 42000,
    concepts: ['blank_lines', 'no_tabs', 'branch_alignment', 'nesting', 'trailing_whitespace', 'dedent_scope'],
    hint: 'Add a blank line before def classify(vals): and before the final print. Delete the blank line after def:, replace tabs/drift with 4/8/12 spaces, and dedent return labels to 4 spaces.',
    brokenCode: [
      '  limit = 75  ',
      'def classify(vals):',
      '',
      '\tlabels = []',
      '    for v in vals: ',
      '      if v >= limit:',
      '\t\t\tlabels.append("HIGH")',
      '    elif v >= 40:',
      '          labels.append("MID")  ',
      '        else:',
      '              labels.append("LOW")',
      '        return labels',
      'print(classify([90, 55, 20])) '
    ].join('\n'),
    solution: [
      'limit = 75',
      '',
      'def classify(vals):',
      '    labels = []',
      '    for v in vals:',
      '        if v >= limit:',
      '            labels.append("HIGH")',
      '        elif v >= 40:',
      '            labels.append("MID")',
      '        else:',
      '            labels.append("LOW")',
      '    return labels',
      '',
      'print(classify([90, 55, 20]))'
    ].join('\n')
  },
  {
    id: 's4-squad-sync-siege',
    sector: 4,
    sectorName: 'Sector 4: Blank Space Siege',
    title: 'Gauntlet II: Squad Sync Siege',
    briefing: 'Two functions under attack! Use multi-cursor to purge tabs, fix try/except alignment, and enforce blank-line rules.',
    parTimeMs: 44000,
    concepts: ['vscode_hotkeys', 'blank_lines', 'no_tabs', 'branch_alignment', 'dedent_scope', 'trailing_whitespace'],
    hint: 'Separate both defs and the final print with blank lines. Inside safe_int, align try/except at 4 spaces and bodies at 8. Inside total_power, align total = 0 and for at 4 spaces, remove the gap after for:, and dedent return total to 4 spaces.',
    brokenCode: [
      'def safe_int(raw):  ',
      '\ttry:',
      '      return int(raw)',
      '        except ValueError:',
      '\t\treturn 0 ',
      'def total_power(items):',
      '  total = 0',
      '\tfor item in items:',
      '',
      '      total += safe_int(item)  ',
      '        return total',
      '   ',
      '  print(total_power(["40", "bad", "60"]))'
    ].join('\n'),
    solution: [
      'def safe_int(raw):',
      '    try:',
      '        return int(raw)',
      '    except ValueError:',
      '        return 0',
      '',
      'def total_power(items):',
      '    total = 0',
      '    for item in items:',
      '        total += safe_int(item)',
      '    return total',
      '',
      'print(total_power(["40", "bad", "60"]))'
    ].join('\n')
  },
  {
    id: 's4-final-omega-purge',
    sector: 4,
    sectorName: 'Sector 4: Blank Space Siege',
    title: 'FINAL BOSS: Omega Core Purge',
    briefing: 'Mission 25 finale! Every Python whitespace hazard is active: tabs, drift, trailing mines, colon gaps, section spacing, nesting, and dedent scope.',
    parTimeMs: 55000,
    concepts: ['unexpected_indent', 'block_indent', 'no_tabs', 'alignment', 'trailing_whitespace', 'branch_alignment', 'nesting', 'dedent_scope', 'blank_lines', 'vscode_hotkeys'],
    hint: 'Keep 1 blank line before/after top-level def and while blocks, and 0 blank lines after colons (:). Inside scan_core: ok = 0, for, and return at 4 spaces; if/elif/else at 8; bodies at 12. Inside while: 4 spaces. Final print at 0 spaces.',
    brokenCode: [
      '  cores = [95, 50, 15] ',
      'def scan_core(levels):  ',
      '',
      '\tok = 0',
      '   for lvl in levels:',
      '      if lvl >= 80:',
      '\t\t\tok += 1 ',
      '    elif lvl >= 40:',
      '          print("Warm:", lvl)',
      '        else:',
      '             print("Cold:", lvl)  ',
      '        return ok',
      '   ',
      'countdown = 2  ',
      'while countdown > 0:',
      '',
      '\tprint("T-minus", countdown)',
      '   countdown -= 1 ',
      '    print("Ready cores:", scan_core(cores))  '
    ].join('\n'),
    solution: [
      'cores = [95, 50, 15]',
      '',
      'def scan_core(levels):',
      '    ok = 0',
      '    for lvl in levels:',
      '        if lvl >= 80:',
      '            ok += 1',
      '        elif lvl >= 40:',
      '            print("Warm:", lvl)',
      '        else:',
      '            print("Cold:", lvl)',
      '    return ok',
      '',
      'countdown = 2',
      '',
      'while countdown > 0:',
      '    print("T-minus", countdown)',
      '    countdown -= 1',
      '',
      'print("Ready cores:", scan_core(cores))'
    ].join('\n')
  }
];

export const CAMPAIGNS = [
  {
    id: 'beginner',
    name: 'Beginner Campaign: Conditional Command',
    subtitle: 'Exclusively Conditionals (if / elif / else)',
    puzzles: BEGINNER_CONDITIONAL_PUZZLES
  },
  {
    id: 'main',
    name: 'Main Campaign: Orbital Purge',
    subtitle: 'All 4 Sectors — Loops, Functions & Conditionals',
    puzzles: PUZZLES
  },
  {
    id: 'html',
    name: 'HTML Campaign: Markup Formatter',
    subtitle: 'Clean 4-Space HTML Tag Nesting & Alignment',
    puzzles: HTML_FORMATTING_PUZZLES
  }
];

export function getPuzzleById(puzzleId) {
  return (
    PUZZLES.find((p) => p.id === puzzleId) ||
    BEGINNER_CONDITIONAL_PUZZLES.find((p) => p.id === puzzleId) ||
    HTML_FORMATTING_PUZZLES.find((p) => p.id === puzzleId) ||
    null
  );
}

export function getPuzzlesForSector(sectorId) {
  const key = String(sectorId || 'all');
  if (key === 'campaign:beginner' || key === 'beginner') {
    return BEGINNER_CONDITIONAL_PUZZLES.slice();
  }
  if (key === 'campaign:html' || key === 'html') {
    return HTML_FORMATTING_PUZZLES.slice();
  }
  if (key === 'campaign:main' || key === 'main' || key === 'all') {
    return PUZZLES.slice();
  }
  const numericSector = Number(key.replace(/^sector:/, ''));
  return PUZZLES.filter((p) => p.sector === numericSector);
}
