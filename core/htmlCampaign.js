/**
 * HTML Campaign: Markup Formatter (15 Missions).
 * Teaches clean 4-space HTML indentation, tag nesting, closing-tag alignment,
 * tab elimination, trailing-space cleanup, and clean blank-line sectioning.
 * Zero DOM dependencies — shared between browser and authoritative server.
 */

export const HTML_FORMATTING_PUZZLES = [
  // ======================== TIER 1: DOCUMENT SKELETON & BASIC TAGS (1-4) ========================
  {
    id: 'html-01-doctype-root',
    language: 'html',
    sector: 1,
    sectorName: 'HTML Tier 1: Document Skeleton',
    title: 'Orbital Document Root',
    briefing: 'Remove the rogue leading spaces so <!DOCTYPE html>, <html>, and </html> sit cleanly at column 0.',
    parTimeMs: 14000,
    concepts: ['unexpected_indent', 'html_closing_tag'],
    hint: 'Top-level document tags (<!DOCTYPE html>, <html lang="en">, and </html>) start at 0 spaces. Remove the leading spaces on lines 2 and 4.',
    brokenCode: [
      '<!DOCTYPE html>',
      '  <html lang="en">',
      '    <body></body>',
      '   </html>'
    ].join('\n'),
    solution: [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '    <body></body>',
      '</html>'
    ].join('\n')
  },
  {
    id: 'html-02-head-metadata',
    language: 'html',
    sector: 1,
    sectorName: 'HTML Tier 1: Document Skeleton',
    title: 'Head Tag Nesting',
    briefing: 'Indent the <meta> and <title> tags by 4 spaces so they sit cleanly inside <head>.',
    parTimeMs: 15000,
    concepts: ['html_nesting', 'alignment'],
    hint: 'Keep <head> and </head> at 0 spaces. Indent both <meta charset="UTF-8"> and <title>...</title> to 4 spaces.',
    brokenCode: [
      '<head>',
      '<meta charset="UTF-8">',
      '  <title>Orbital Command</title>',
      '</head>'
    ].join('\n'),
    solution: [
      '<head>',
      '    <meta charset="UTF-8">',
      '    <title>Orbital Command</title>',
      '</head>'
    ].join('\n')
  },
  {
    id: 'html-03-heading-paragraph',
    language: 'html',
    sector: 1,
    sectorName: 'HTML Tier 1: Document Skeleton',
    title: 'Main Content Block',
    briefing: 'Indent the <h1> and <p> elements inside <main> to 4 spaces, and align the closing </main> tag at column 0.',
    parTimeMs: 16000,
    concepts: ['html_nesting', 'html_closing_tag'],
    hint: '<main> and </main> belong at 0 spaces. The <h1> and both <p> tags inside <main> belong at 4 spaces.',
    brokenCode: [
      '<main>',
      '<h1>Mission Briefing</h1>',
      '  <p>All orbital relays are online.</p>',
      '      <p>Prepare for whitespace purge.</p>',
      '    </main>'
    ].join('\n'),
    solution: [
      '<main>',
      '    <h1>Mission Briefing</h1>',
      '    <p>All orbital relays are online.</p>',
      '    <p>Prepare for whitespace purge.</p>',
      '</main>'
    ].join('\n')
  },
  {
    id: 'html-04-closing-tag-align',
    language: 'html',
    sector: 1,
    sectorName: 'HTML Tier 1: Document Skeleton',
    title: 'Closing Tag Alignment',
    briefing: 'Every closing tag must line up directly underneath its matching opening tag! Fix the drifted closing tags.',
    parTimeMs: 18000,
    concepts: ['html_closing_tag', 'html_nesting', 'blank_lines'],
    hint: '<header>, </header>, <section>, and </section> sit at 0 spaces, separated by 1 blank line. Their children sit at 4 spaces.',
    brokenCode: [
      '<header>',
      '    <h1>Star Dock 04</h1>',
      '  </header>',
      '',
      '<section>',
      '    <h2>Status</h2>',
      '    <p>Hull integrity nominal.</p>',
      '      </section>'
    ].join('\n'),
    solution: [
      '<header>',
      '    <h1>Star Dock 04</h1>',
      '</header>',
      '',
      '<section>',
      '    <h2>Status</h2>',
      '    <p>Hull integrity nominal.</p>',
      '</section>'
    ].join('\n')
  },

  // ======================== TIER 2: LISTS, LINKS & MEDIA (5-8) ========================
  {
    id: 'html-05-unordered-list',
    language: 'html',
    sector: 2,
    sectorName: 'HTML Tier 2: Lists & Links',
    title: 'VS Code Drill: Mission Checklist',
    briefing: 'All 4 <li> items belong inside <ul>! Select them with Shift+Down and press Tab once to indent them together.',
    parTimeMs: 14000,
    concepts: ['html_nesting', 'vscode_hotkeys'],
    hint: 'Select the four <li> lines with Shift+Down and press Tab (or Ctrl+]) to indent them to 4 spaces inside <ul>.',
    brokenCode: [
      '<ul>',
      '<li>Check oxygen tanks</li>',
      '<li>Charge plasma rifle</li>',
      '<li>Purge rogue tabs</li>',
      '<li>Verify HTML tags</li>',
      '</ul>'
    ].join('\n'),
    solution: [
      '<ul>',
      '    <li>Check oxygen tanks</li>',
      '    <li>Charge plasma rifle</li>',
      '    <li>Purge rogue tabs</li>',
      '    <li>Verify HTML tags</li>',
      '</ul>'
    ].join('\n')
  },
  {
    id: 'html-06-nav-links',
    language: 'html',
    sector: 2,
    sectorName: 'HTML Tier 2: Lists & Links',
    title: 'Navigation Deck',
    briefing: 'Purge the alien tabs and trailing spaces from this nested <nav> -> <ul> -> <li> menu.',
    parTimeMs: 22000,
    concepts: ['no_tabs', 'html_nesting', 'trailing_whitespace'],
    hint: '<nav> at 0 spaces, <ul> and </ul> at 4 spaces, and every <li> at 8 spaces. Remove all tabs and trailing spaces.',
    brokenCode: [
      '<nav>  ',
      '\t<ul>',
      '\t\t<li><a href="/">Home</a></li> ',
      '      <li><a href="/missions">Missions</a></li>',
      '\t\t<li><a href="/profile">Profile</a></li>  ',
      '  </ul>',
      '</nav>'
    ].join('\n'),
    solution: [
      '<nav>',
      '    <ul>',
      '        <li><a href="/">Home</a></li>',
      '        <li><a href="/missions">Missions</a></li>',
      '        <li><a href="/profile">Profile</a></li>',
      '    </ul>',
      '</nav>'
    ].join('\n')
  },
  {
    id: 'html-07-figure-caption',
    language: 'html',
    sector: 2,
    sectorName: 'HTML Tier 2: Lists & Links',
    title: 'Sensor Feed Figure',
    briefing: 'Remove the stray blank line inside <figure>, align the children at 4 spaces, and put a blank line before the footer note.',
    parTimeMs: 20000,
    concepts: ['blank_lines', 'html_nesting', 'trailing_whitespace'],
    hint: 'Keep <figure> and </figure> at 0 spaces with no blank lines inside. Indent <img> and <figcaption> to 4 spaces. Put 1 blank line before <p>.',
    brokenCode: [
      '<figure>',
      '',
      '  <img src="radar.png" alt="Orbital radar"> ',
      '      <figcaption>Sector 4 Live Scan</figcaption>',
      '  </figure>',
      '  <p>Updated every 5 seconds.</p>  '
    ].join('\n'),
    solution: [
      '<figure>',
      '    <img src="radar.png" alt="Orbital radar">',
      '    <figcaption>Sector 4 Live Scan</figcaption>',
      '</figure>',
      '',
      '<p>Updated every 5 seconds.</p>'
    ].join('\n')
  },
  {
    id: 'html-08-attribute-spacing',
    language: 'html',
    sector: 2,
    sectorName: 'HTML Tier 2: Lists & Links',
    title: 'Clean Tag Attributes',
    briefing: 'Eliminate extra spaces inside tags, purge tabs, and align the nested <div> and links cleanly.',
    parTimeMs: 22000,
    concepts: ['alignment', 'no_tabs', 'trailing_whitespace'],
    hint: 'Use a single space between tag name and attributes (no extra spaces before >). Align <div class="links"> at 0 spaces and both <a> tags at 4 spaces.',
    brokenCode: [
      '<div  class="links"> ',
      '\t<a  href="/docs"  class="btn">Docs</a> ',
      '  <a href="/help"   class="btn">Help</a>',
      '   </div>'
    ].join('\n'),
    solution: [
      '<div class="links">',
      '    <a href="/docs" class="btn">Docs</a>',
      '    <a href="/help" class="btn">Help</a>',
      '</div>'
    ].join('\n')
  },

  // ======================== TIER 3: TABLES & FORMS (9-12) ========================
  {
    id: 'html-09-table-rows',
    language: 'html',
    sector: 3,
    sectorName: 'HTML Tier 3: Tables & Forms',
    title: 'Telemetry Table',
    briefing: 'Format this HTML table with 4-space steps: <table> (0) -> <thead>/<tbody> (4) -> <tr> (8) -> <th>/<td> (12).',
    parTimeMs: 30000,
    concepts: ['html_nesting', 'html_closing_tag', 'no_tabs'],
    hint: '<table> at 0, <thead> and <tbody> at 4, <tr> at 8, and <th>/<td> cells at 12 spaces. Replace all tabs with spaces.',
    brokenCode: [
      '<table>',
      '\t<thead>',
      '      <tr>',
      '\t\t\t<th>Unit</th>',
      '          <th>Status</th>',
      '      </tr>',
      '  </thead>',
      '\t<tbody>',
      '    <tr>',
      '        <td>Vanguard</td>',
      '\t\t\t<td>Ready</td>',
      '        </tr>',
      '    </tbody>',
      '</table>'
    ].join('\n'),
    solution: [
      '<table>',
      '    <thead>',
      '        <tr>',
      '            <th>Unit</th>',
      '            <th>Status</th>',
      '        </tr>',
      '    </thead>',
      '    <tbody>',
      '        <tr>',
      '            <td>Vanguard</td>',
      '            <td>Ready</td>',
      '        </tr>',
      '    </tbody>',
      '</table>'
    ].join('\n')
  },
  {
    id: 'html-10-form-controls',
    language: 'html',
    sector: 3,
    sectorName: 'HTML Tier 3: Tables & Forms',
    title: 'Cadet Login Form',
    briefing: 'Clean up the form groups, remove tabs and trailing spaces, and align every closing </div> and </form>.',
    parTimeMs: 28000,
    concepts: ['html_nesting', 'html_closing_tag', 'no_tabs', 'trailing_whitespace'],
    hint: '<form> at 0, <div class="field"> and <button> at 4, and <label>/<input> inside each field div at 8 spaces.',
    brokenCode: [
      '<form action="/login" method="post"> ',
      '\t<div class="field">',
      '      <label for="callsign">Callsign</label>',
      '\t\t<input id="callsign" type="text"> ',
      '  </div>',
      '    <button type="submit">Deploy</button>  ',
      '  </form>'
    ].join('\n'),
    solution: [
      '<form action="/login" method="post">',
      '    <div class="field">',
      '        <label for="callsign">Callsign</label>',
      '        <input id="callsign" type="text">',
      '    </div>',
      '    <button type="submit">Deploy</button>',
      '</form>'
    ].join('\n')
  },
  {
    id: 'html-11-select-options',
    language: 'html',
    sector: 3,
    sectorName: 'HTML Tier 3: Tables & Forms',
    title: 'Sector Dropdown',
    briefing: 'Remove the stray blank lines inside <select>, purge the tabs, and indent all <option> tags to 8 spaces.',
    parTimeMs: 24000,
    concepts: ['blank_lines', 'html_nesting', 'no_tabs', 'vscode_hotkeys'],
    hint: '<div> at 0, <label> and <select> at 4, and all three <option> tags at 8 spaces with no blank lines inside <select>.',
    brokenCode: [
      '<div>',
      '  <label for="sector">Sector</label>',
      '\t<select id="sector">',
      '',
      '\t\t<option value="1">Boot Camp</option>',
      '      <option value="2">Rogue Tabs</option>',
      '\t\t<option value="3">Block Command</option>',
      '  </select>',
      '</div>'
    ].join('\n'),
    solution: [
      '<div>',
      '    <label for="sector">Sector</label>',
      '    <select id="sector">',
      '        <option value="1">Boot Camp</option>',
      '        <option value="2">Rogue Tabs</option>',
      '        <option value="3">Block Command</option>',
      '    </select>',
      '</div>'
    ].join('\n')
  },
  {
    id: 'html-12-card-grid',
    language: 'html',
    sector: 3,
    sectorName: 'HTML Tier 3: Tables & Forms',
    title: 'VS Code Drill: Squad Cards',
    briefing: 'Use Ctrl+D or multi-cursor to purge tabs and align both <article class="card"> blocks cleanly!',
    parTimeMs: 28000,
    concepts: ['vscode_hotkeys', 'no_tabs', 'html_nesting', 'trailing_whitespace'],
    hint: '<section class="grid"> at 0, each <article class="card"> and </article> at 4, and <h3>/<p> inside each card at 8 spaces.',
    brokenCode: [
      '<section class="grid">',
      '\t<article class="card"> ',
      '\t\t<h3>Alpha Squad</h3>',
      '      <p>Ready for launch.</p> ',
      '\t</article>',
      '\t<article class="card">',
      '\t\t<h3>Bravo Squad</h3> ',
      '      <p>Standing by.</p>',
      '\t</article>',
      '</section>'
    ].join('\n'),
    solution: [
      '<section class="grid">',
      '    <article class="card">',
      '        <h3>Alpha Squad</h3>',
      '        <p>Ready for launch.</p>',
      '    </article>',
      '    <article class="card">',
      '        <h3>Bravo Squad</h3>',
      '        <p>Standing by.</p>',
      '    </article>',
      '</section>'
    ].join('\n')
  },

  // ======================== TIER 4: FULL PAGE HTML GAUNTLETS (13-15) ========================
  {
    id: 'html-13-semantic-page',
    language: 'html',
    sector: 4,
    sectorName: 'HTML Tier 4: Full Page Siege',
    title: 'Semantic Page Layout',
    briefing: 'Separate <header>, <main>, and <footer> with blank lines inside <body>, purge tabs, and align all nested tags.',
    parTimeMs: 34000,
    concepts: ['blank_lines', 'html_nesting', 'html_closing_tag', 'no_tabs'],
    hint: '<body> at 0; <header>, <main>, <footer> at 4 (separated by 1 blank line); their children at 8 spaces.',
    brokenCode: [
      '<body>',
      '\t<header>',
      '      <h1>Orbital News</h1> ',
      '  </header>',
      '    <main>',
      '\t\t<p>All sectors clear.</p>',
      '    </main>',
      '   ',
      '  <footer>',
      '\t\t<small>YCST Command</small>',
      '  </footer>',
      '</body>'
    ].join('\n'),
    solution: [
      '<body>',
      '    <header>',
      '        <h1>Orbital News</h1>',
      '    </header>',
      '',
      '    <main>',
      '        <p>All sectors clear.</p>',
      '    </main>',
      '',
      '    <footer>',
      '        <small>YCST Command</small>',
      '    </footer>',
      '</body>'
    ].join('\n')
  },
  {
    id: 'html-14-nested-dashboard',
    language: 'html',
    sector: 4,
    sectorName: 'HTML Tier 4: Full Page Siege',
    title: 'Orbital Dashboard',
    briefing: 'Four levels deep! Align <div class="app"> (0) -> <section> (4) -> <ul> (8) -> <li> (12) and purge all hazards.',
    parTimeMs: 36000,
    concepts: ['html_nesting', 'html_closing_tag', 'no_tabs', 'trailing_whitespace', 'blank_lines'],
    hint: '<div class="app"> at 0, <section> at 4, <h2> and <ul> at 8, and each <li> at 12 spaces. Remove the blank line after <ul> and all trailing spaces.',
    brokenCode: [
      '  <div class="app"> ',
      '\t<section class="panel">',
      '      <h2>Active Units</h2>',
      '\t\t<ul>',
      '',
      '\t\t\t<li>Unit 01: Online</li> ',
      '          <li>Unit 02: Patrol</li>',
      '\t\t\t<li>Unit 04: Ready</li>  ',
      '      </ul>',
      '  </section>',
      '</div>'
    ].join('\n'),
    solution: [
      '<div class="app">',
      '    <section class="panel">',
      '        <h2>Active Units</h2>',
      '        <ul>',
      '            <li>Unit 01: Online</li>',
      '            <li>Unit 02: Patrol</li>',
      '            <li>Unit 04: Ready</li>',
      '        </ul>',
      '    </section>',
      '</div>'
    ].join('\n')
  },
  {
    id: 'html-15-full-html-siege',
    language: 'html',
    sector: 4,
    sectorName: 'HTML Tier 4: Full Page Siege',
    title: 'Final HTML Siege',
    briefing: 'Complete HTML5 document under siege! Fix every tab, drifted indent, trailing space, and blank line from <!DOCTYPE html> to </html>.',
    parTimeMs: 48000,
    concepts: ['unexpected_indent', 'html_nesting', 'html_closing_tag', 'no_tabs', 'trailing_whitespace', 'blank_lines', 'vscode_hotkeys'],
    hint: '<!DOCTYPE html> and <html> at 0; <head> and <body> at 4 (with 1 blank line between </head> and <body>); <meta>/<title> and <main>/<footer> at 8; content inside <main> at 12 spaces.',
    brokenCode: [
      '  <!DOCTYPE html> ',
      '<html lang="en">',
      '\t<head>',
      '      <meta charset="UTF-8">',
      '\t\t<title>Blank Space Marine</title> ',
      '  </head>',
      '\t<body>',
      '',
      '\t\t<main>',
      '          <h1>Victory</h1> ',
      '\t\t\t<p>HTML formatting complete.</p>',
      '      </main>',
      '   ',
      '\t\t<footer>',
      '          <p>End of Transmission</p>',
      '\t\t</footer>',
      '    </body> ',
      '  </html>'
    ].join('\n'),
    solution: [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '    <head>',
      '        <meta charset="UTF-8">',
      '        <title>Blank Space Marine</title>',
      '    </head>',
      '',
      '    <body>',
      '        <main>',
      '            <h1>Victory</h1>',
      '            <p>HTML formatting complete.</p>',
      '        </main>',
      '',
      '        <footer>',
      '            <p>End of Transmission</p>',
      '        </footer>',
      '    </body>',
      '</html>'
    ].join('\n')
  }
];
