/**
 * Beginner Campaign: Conditional Command (20 Missions).
 * Exclusively Python conditional statements (if, elif, else, compound & nested conditionals),
 * progressing from single-line if statements to nested multi-hazard conditional gauntlets.
 * Zero DOM dependencies — portable to a future authoritative server.
 */

export const BEGINNER_CONDITIONAL_PUZZLES = [
  // ======================== TIER 1: SIMPLE IF BASICS (1-5) ========================
  {
    id: 'bc-01-first-if',
    sector: 1,
    sectorName: 'Beginner: Simple If',
    title: 'First Conditional Lock',
    briefing: 'Indent the print statement by 4 spaces so it runs inside the if block.',
    parTimeMs: 12000,
    concepts: ['block_indent'],
    hint: 'After a colon (:) on an if statement, indent the line underneath by 4 spaces (press Tab at the start of line 4).',
    brokenCode: [
      'shields = 100',
      '',
      'if shields == 100:',
      'print("Shields at maximum!")'
    ].join('\n'),
    solution: [
      'shields = 100',
      '',
      'if shields == 100:',
      '    print("Shields at maximum!")'
    ].join('\n')
  },
  {
    id: 'bc-02-two-line-if',
    sector: 1,
    sectorName: 'Beginner: Simple If',
    title: 'Dual Action Conditional',
    briefing: 'Both lines below the if statement belong inside the block. Give each one 4 spaces.',
    parTimeMs: 14000,
    concepts: ['block_indent'],
    hint: 'Lines 4 and 5 both belong inside if fuel < 30:. Indent both lines to 4 spaces.',
    brokenCode: [
      'fuel = 15',
      '',
      'if fuel < 30:',
      'print("Low fuel alert!")',
      '  fuel = 100'
    ].join('\n'),
    solution: [
      'fuel = 15',
      '',
      'if fuel < 30:',
      '    print("Low fuel alert!")',
      '    fuel = 100'
    ].join('\n')
  },
  {
    id: 'bc-03-setup-and-if',
    sector: 1,
    sectorName: 'Beginner: Simple If',
    title: 'Top-Level Discipline',
    briefing: 'Remove the unexpected leading spaces on the setup line, and indent the if body cleanly to 4 spaces.',
    parTimeMs: 15000,
    concepts: ['unexpected_indent', 'block_indent'],
    hint: 'Line 1 is a top-level variable (0 spaces). Lines 4 and 5 are inside the if block (4 spaces).',
    brokenCode: [
      '  hull = 40',
      '',
      'if hull < 50:',
      'print("Repair drones deployed")',
      '   hull += 25'
    ].join('\n'),
    solution: [
      'hull = 40',
      '',
      'if hull < 50:',
      '    print("Repair drones deployed")',
      '    hull += 25'
    ].join('\n')
  },
  {
    id: 'bc-04-after-if-dedent',
    sector: 1,
    sectorName: 'Beginner: Simple If',
    title: 'Exit the If Block',
    briefing: 'The final print should ALWAYS run after the if block! Dedent it to 0 spaces and put a blank line before it.',
    parTimeMs: 16000,
    concepts: ['dedent_scope', 'blank_lines'],
    hint: 'Keep power += 10 at 4 spaces inside the if. Dedent print("Scan complete") to 0 spaces and add a blank line above it.',
    brokenCode: [
      'power = 80',
      '',
      'if power < 90:',
      '    power += 10',
      '    print("Scan complete")'
    ].join('\n'),
    solution: [
      'power = 80',
      '',
      'if power < 90:',
      '    power += 10',
      '',
      'print("Scan complete")'
    ].join('\n')
  },
  {
    id: 'bc-05-if-multi-indent',
    sector: 1,
    sectorName: 'Beginner: Simple If',
    title: 'VS Code Drill: 4-Line If Block',
    briefing: 'All 4 statements belong inside the if block. Select them with Shift+Down and press Tab once!',
    parTimeMs: 12000,
    concepts: ['block_indent', 'vscode_hotkeys'],
    hint: 'Move to line 4, hold Shift and press Down 3 times to select lines 4-7, then press Tab (or Ctrl+]) to indent them all together.',
    brokenCode: [
      'alert = True',
      '',
      'if alert:',
      'print("Red alert!")',
      'print("Closing blast doors")',
      'print("Arming plasma cannons")',
      'print("Marine ready")'
    ].join('\n'),
    solution: [
      'alert = True',
      '',
      'if alert:',
      '    print("Red alert!")',
      '    print("Closing blast doors")',
      '    print("Arming plasma cannons")',
      '    print("Marine ready")'
    ].join('\n')
  },

  // ======================== TIER 2: IF / ELSE & ROGUE WHITESPACE (6-10) ========================
  {
    id: 'bc-06-basic-else',
    sector: 2,
    sectorName: 'Beginner: If / Else',
    title: 'Two-Path Decision',
    briefing: 'Indent both the if body and the else body by 4 spaces so Python knows which code runs on each path.',
    parTimeMs: 16000,
    concepts: ['block_indent', 'branch_alignment'],
    hint: 'if and else stay at 0 spaces. The print lines directly below each one must be indented by 4 spaces.',
    brokenCode: [
      'oxygen = 65',
      '',
      'if oxygen >= 50:',
      'print("Air supply safe")',
      'else:',
      'print("Activate reserve tank")'
    ].join('\n'),
    solution: [
      'oxygen = 65',
      '',
      'if oxygen >= 50:',
      '    print("Air supply safe")',
      'else:',
      '    print("Activate reserve tank")'
    ].join('\n')
  },
  {
    id: 'bc-07-misaligned-else',
    sector: 2,
    sectorName: 'Beginner: If / Else',
    title: 'Misaligned Else Branch',
    briefing: 'else: must line up directly underneath its matching if at column 0. Fix the branch alignment and body indents.',
    parTimeMs: 17000,
    concepts: ['branch_alignment', 'alignment'],
    hint: 'Remove the leading spaces before else: so it sits at 0 spaces, and snap both print statements to 4 spaces.',
    brokenCode: [
      'speed = 12',
      '',
      'if speed > 10:',
      '   print("Warp engaged")',
      '    else:',
      '  print("Impulse power")'
    ].join('\n'),
    solution: [
      'speed = 12',
      '',
      'if speed > 10:',
      '    print("Warp engaged")',
      'else:',
      '    print("Impulse power")'
    ].join('\n')
  },
  {
    id: 'bc-08-if-tab-ambush',
    sector: 2,
    sectorName: 'Beginner: If / Else',
    title: 'Conditional TabError',
    briefing: 'Destroy the alien tab characters (->) inside this if/else block and replace them with 4 clean spaces.',
    parTimeMs: 18000,
    concepts: ['no_tabs', 'block_indent'],
    hint: 'Replace every -> tab on lines 4, 5, and 7 with 4 spaces (Delete the tab, then press Tab).',
    brokenCode: [
      'ammo = 0',
      '',
      'if ammo > 0:',
      '\tprint("Firing plasma")',
      '\tammo -= 1',
      'else:',
      '\tprint("Reloading!")'
    ].join('\n'),
    solution: [
      'ammo = 0',
      '',
      'if ammo > 0:',
      '    print("Firing plasma")',
      '    ammo -= 1',
      'else:',
      '    print("Reloading!")'
    ].join('\n')
  },
  {
    id: 'bc-09-if-colon-gaps',
    sector: 2,
    sectorName: 'Beginner: If / Else',
    title: 'No Blank Lines After Colons',
    briefing: 'Delete the rogue blank lines immediately after if: and else:, and add a blank line before if.',
    parTimeMs: 18000,
    concepts: ['blank_lines'],
    hint: 'Put 1 blank line between battery = 10 and if battery < 20:. Delete the blank lines directly below if: and else:.',
    brokenCode: [
      'battery = 10',
      'if battery < 20:',
      '',
      '    print("Recharge needed")',
      'else:',
      '',
      '    print("Battery steady")'
    ].join('\n'),
    solution: [
      'battery = 10',
      '',
      'if battery < 20:',
      '    print("Recharge needed")',
      'else:',
      '    print("Battery steady")'
    ].join('\n')
  },
  {
    id: 'bc-10-if-trailing-sweep',
    sector: 2,
    sectorName: 'Beginner: If / Else',
    title: 'Trailing Space Mines in Else',
    briefing: 'Clean up the 3-space drift and vaporize every trailing space at the end of these conditional lines.',
    parTimeMs: 20000,
    concepts: ['trailing_whitespace', 'alignment'],
    hint: 'Use End + Backspace (or multi-cursor Ctrl+Alt+Down + End) to wipe trailing spaces, and align both bodies to 4 spaces.',
    brokenCode: [
      'temp = 95  ',
      '',
      'if temp > 80:  ',
      '   print("Core overheating!")  ',
      'else: ',
      '     print("Core nominal")  '
    ].join('\n'),
    solution: [
      'temp = 95',
      '',
      'if temp > 80:',
      '    print("Core overheating!")',
      'else:',
      '    print("Core nominal")'
    ].join('\n')
  },

  // ======================== TIER 3: ELIF & COMPOUND CONDITIONS (11-15) ========================
  {
    id: 'bc-11-first-elif',
    sector: 3,
    sectorName: 'Beginner: Elif & Logic',
    title: 'Three-Way Scanner',
    briefing: 'Align if, elif, and else at column 0 and indent every branch body to 4 spaces.',
    parTimeMs: 20000,
    concepts: ['branch_alignment', 'block_indent'],
    hint: 'if, elif, and else all start at 0 spaces. Each status = ... line underneath sits at 4 spaces.',
    brokenCode: [
      'signal = 60',
      '',
      'if signal >= 80:',
      '    status = "STRONG"',
      '  elif signal >= 40:',
      '  status = "WEAK"',
      '    else:',
      'status = "LOST"'
    ].join('\n'),
    solution: [
      'signal = 60',
      '',
      'if signal >= 80:',
      '    status = "STRONG"',
      'elif signal >= 40:',
      '    status = "WEAK"',
      'else:',
      '    status = "LOST"'
    ].join('\n')
  },
  {
    id: 'bc-12-four-branch-grade',
    sector: 3,
    sectorName: 'Beginner: Elif & Logic',
    title: 'Cadet Rank Ladder',
    briefing: 'Fix this 4-branch if/elif/elif/else ladder: purge tabs, align all branch headers at 0, and snap bodies to 4 spaces.',
    parTimeMs: 24000,
    concepts: ['branch_alignment', 'no_tabs', 'alignment'],
    hint: 'All four headers (if, elif, elif, else) belong at 0 spaces. Every print(...) line belongs at 4 spaces with zero tabs.',
    brokenCode: [
      'points = 84',
      '',
      'if points >= 90:',
      '\tprint("Grade: A")',
      '  elif points >= 80:',
      '   print("Grade: B")',
      '    elif points >= 70:',
      '\tprint("Grade: C")',
      '  else:',
      '     print("Drill Again")'
    ].join('\n'),
    solution: [
      'points = 84',
      '',
      'if points >= 90:',
      '    print("Grade: A")',
      'elif points >= 80:',
      '    print("Grade: B")',
      'elif points >= 70:',
      '    print("Grade: C")',
      'else:',
      '    print("Drill Again")'
    ].join('\n')
  },
  {
    id: 'bc-13-compound-and-or',
    sector: 3,
    sectorName: 'Beginner: Elif & Logic',
    title: 'Compound Logic Gate (and / or)',
    briefing: 'Fix the blank lines before and after this compound conditional, clean trailing spaces, and align the branches.',
    parTimeMs: 24000,
    concepts: ['blank_lines', 'branch_alignment', 'trailing_whitespace', 'dedent_scope'],
    hint: 'Put 1 blank line before if and 1 blank line before print("Check done"). Remove trailing spaces and align elif/else at 0 spaces.',
    brokenCode: [
      'fuel = 50 ',
      'shields = 70  ',
      'if fuel > 20 and shields > 50:',
      '   print("Ready for jump") ',
      '  elif fuel > 20 or shields > 50:',
      '    print("Partial readiness")',
      'else:',
      '  print("Hold position") ',
      '    print("Check done")'
    ].join('\n'),
    solution: [
      'fuel = 50',
      'shields = 70',
      '',
      'if fuel > 20 and shields > 50:',
      '    print("Ready for jump")',
      'elif fuel > 20 or shields > 50:',
      '    print("Partial readiness")',
      'else:',
      '    print("Hold position")',
      '',
      'print("Check done")'
    ].join('\n')
  },
  {
    id: 'bc-14-multi-cursor-elif',
    sector: 3,
    sectorName: 'Beginner: Elif & Logic',
    title: 'VS Code Drill: Multi-Cursor Branch Clean',
    briefing: 'Four consecutive indented lines inside this if/else share tabs and trailing spaces. Use multi-cursor to clean them fast!',
    parTimeMs: 20000,
    concepts: ['vscode_hotkeys', 'no_tabs', 'trailing_whitespace'],
    hint: 'Use Ctrl+Alt+Down on lines 4-5 (and lines 7-8) to delete tabs and deploy 4 spaces together, then hit End + Backspace to clear trailing spaces.',
    brokenCode: [
      'docked = True',
      '',
      'if docked:',
      '\tprint("Engines off")  ',
      '\tprint("Refueling bay")  ',
      'else:',
      '\tprint("Orbit active")  ',
      '\tprint("Patrol mode")  '
    ].join('\n'),
    solution: [
      'docked = True',
      '',
      'if docked:',
      '    print("Engines off")',
      '    print("Refueling bay")',
      'else:',
      '    print("Orbit active")',
      '    print("Patrol mode")'
    ].join('\n')
  },
  {
    id: 'bc-15-boolean-not',
    sector: 3,
    sectorName: 'Beginner: Elif & Logic',
    title: 'Boolean Negation Guard',
    briefing: 'Clean out the dirty blank line, remove the colon gap, fix the 2-space drift, and dedent the final print.',
    parTimeMs: 22000,
    concepts: ['blank_lines', 'alignment', 'dedent_scope', 'trailing_whitespace'],
    hint: 'Delete the blank line right after if not locked:, indent both lines inside if to 4 spaces, and put print("Bay status logged") at 0 spaces after a clean blank line.',
    brokenCode: [
      'locked = False',
      '',
      'if not locked:',
      '',
      '  print("Airlock open") ',
      '   locked = True',
      '   ',
      '    print("Bay status logged")'
    ].join('\n'),
    solution: [
      'locked = False',
      '',
      'if not locked:',
      '    print("Airlock open")',
      '    locked = True',
      '',
      'print("Bay status logged")'
    ].join('\n')
  },

  // ======================== TIER 4: NESTED CONDITIONALS & BOSS (16-20) ========================
  {
    id: 'bc-16-first-nested-if',
    sector: 4,
    sectorName: 'Beginner: Nested Conditionals',
    title: 'Nested If Depth (4 & 8 Spaces)',
    briefing: 'An if inside an if needs two levels of indentation: 4 spaces for the inner if, and 8 spaces for its body.',
    parTimeMs: 22000,
    concepts: ['nesting', 'block_indent'],
    hint: 'Outer if is at 0 spaces, inner if power > 50: is at 4 spaces, and both print lines inside it belong at 8 spaces.',
    brokenCode: [
      'online = True',
      'power = 85',
      '',
      'if online:',
      '  if power > 50:',
      '    print("Laser charged")',
      '      print("Ready to fire")'
    ].join('\n'),
    solution: [
      'online = True',
      'power = 85',
      '',
      'if online:',
      '    if power > 50:',
      '        print("Laser charged")',
      '        print("Ready to fire")'
    ].join('\n')
  },
  {
    id: 'bc-17-nested-if-else',
    sector: 4,
    sectorName: 'Beginner: Nested Conditionals',
    title: 'Double Branch Alignment',
    briefing: 'Watch the levels! The inner if/else aligns at 4 spaces (bodies at 8), while the outer else aligns at 0 spaces (body at 4).',
    parTimeMs: 28000,
    concepts: ['nesting', 'branch_alignment', 'no_tabs'],
    hint: 'Outer if/else = 0 spaces. Inner if/else = 4 spaces. Inner print lines = 8 spaces. Outer else print line = 4 spaces.',
    brokenCode: [
      'has_key = True',
      'clearance = 3',
      '',
      'if has_key:',
      '  if clearance >= 2:',
      '\t\tprint("Command bridge unlocked")',
      '        else:',
      '      print("Clearance too low")',
      '    else:',
      '\tprint("Insert keycard")'
    ].join('\n'),
    solution: [
      'has_key = True',
      'clearance = 3',
      '',
      'if has_key:',
      '    if clearance >= 2:',
      '        print("Command bridge unlocked")',
      '    else:',
      '        print("Clearance too low")',
      'else:',
      '    print("Insert keycard")'
    ].join('\n')
  },
  {
    id: 'bc-19-triple-nest',
    sector: 4,
    sectorName: 'Beginner: Nested Conditionals',
    title: 'Triple-Layer Security Gate',
    briefing: 'Three nested if levels (4, 8, and 12 spaces)! Remove the colon gap, purge tabs, and vaporize trailing spaces.',
    parTimeMs: 32000,
    concepts: ['nesting', 'no_tabs', 'blank_lines', 'trailing_whitespace'],
    hint: 'Level 1 if = 0 spaces, Level 2 if = 4 spaces, Level 3 if = 8 spaces, print = 12 spaces. Delete the blank line after the second colon and clear trailing spaces.',
    brokenCode: [
      'power = True ',
      'radar = True',
      'target = True  ',
      '',
      'if power:',
      '\tif radar: ',
      '',
      '      if target:',
      '\t\t\tprint("Lock confirmed!")  ',
      '          print("Ready to purge")'
    ].join('\n'),
    solution: [
      'power = True',
      'radar = True',
      'target = True',
      '',
      'if power:',
      '    if radar:',
      '        if target:',
      '            print("Lock confirmed!")',
      '            print("Ready to purge")'
    ].join('\n')
  },
  {
    id: 'bc-20-conditional-boss',
    sector: 4,
    sectorName: 'Beginner: Nested Conditionals',
    title: 'FINAL BOSS: Conditional Firewall',
    briefing: 'Beginner finale! Combine nested if/elif/else, blank-line rules, tabs, drift, trailing mines, and post-block dedent.',
    parTimeMs: 42000,
    concepts: ['unexpected_indent', 'block_indent', 'no_tabs', 'alignment', 'trailing_whitespace', 'branch_alignment', 'nesting', 'dedent_scope', 'blank_lines'],
    hint: 'Top-level vars at 0 spaces, blank line before outer if and before final print, no blank lines after colons. Outer if/elif/else = 0 spaces; inner if/else = 4 spaces; inner bodies = 8 spaces.',
    brokenCode: [
      '  armed = True ',
      'heat = 65  ',
      'if armed:',
      '',
      '\tif heat >= 80:',
      '      print("Cooling weapons") ',
      '        else:',
      '\t\tprint("Weapons hot!")  ',
      '  elif heat >= 80:',
      '   print("Passive vent")',
      '    else:',
      '\tprint("Standby mode") ',
      '   ',
      '    print("Firewall check complete")  '
    ].join('\n'),
    solution: [
      'armed = True',
      'heat = 65',
      '',
      'if armed:',
      '    if heat >= 80:',
      '        print("Cooling weapons")',
      '    else:',
      '        print("Weapons hot!")',
      'elif heat >= 80:',
      '    print("Passive vent")',
      'else:',
      '    print("Standby mode")',
      '',
      'print("Firewall check complete")'
    ].join('\n')
  }
];
