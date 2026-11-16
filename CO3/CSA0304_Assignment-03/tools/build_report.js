// build_report.js - builds Report/Data_Structures_Assignment3_Report.docx from the real outputs
// run:  NODE_PATH=$(npm root -g) node tools/build_report.js
const fs = require("fs");
const path = require("path");
const D = require("docx");
const { Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  AlignmentType, HeadingLevel, LevelFormat, PageBreak, Header, Footer, PageNumber, TabStopType, VerticalAlign } = D;

const ROOT = path.resolve(__dirname, "..");
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const g = (p, re, i = 1) => { const m = rd(p).match(re); if (!m) throw new Error("metric not found: " + p + " " + re); return m[i]; };

// ------------------------------------------------------------------ palette & layout
const NAVY = "1E3A8A", TEAL = "0F766E", ORANGE = "EA580C", SLATE = "334155", GREY = "64748B", LIGHT = "EFF6FF", LTEAL = "F0FDFA", LORANGE = "FFF7ED", RED = "B91C1C";
const PAGE_W = 11906, MARGIN = 1000, CW = PAGE_W - 2 * MARGIN; // content width in DXA (9906)
const FONT = "Calibri";

// ------------------------------------------------------------------ text helpers
function runs(text, base = {}) {
  const out = [];
  text.split(/(\*\*[^*]+\*\*|`[^`]+`)/).forEach((part) => {
    if (!part) return;
    if (part.startsWith("**")) out.push(new TextRun({ ...base, text: part.slice(2, -2), bold: true }));
    else if (part.startsWith("`")) out.push(new TextRun({ ...base, text: part.slice(1, -1), font: "Consolas", color: base.color || "9A3412", size: (base.size || 22) - 2, shading: { type: ShadingType.CLEAR, fill: "F1F5F9" } }));
    else out.push(new TextRun({ ...base, text: part }));
  });
  return out;
}
const P = (text, o = {}) => new Paragraph({ spacing: { before: o.before ?? 60, after: o.after ?? 100, line: 276 }, alignment: o.align, keepNext: o.keepNext,
  indent: o.indent, children: runs(text, { size: o.size || 22, color: o.color || "1E293B", italics: o.italics }) });
const B = (text, level = 0) => new Paragraph({ numbering: { reference: "bul", level }, spacing: { before: 20, after: 40, line: 264 }, children: runs(text, { size: 22, color: "1E293B" }) });
const N = (text) => new Paragraph({ numbering: { reference: "num", level: 0 }, spacing: { before: 20, after: 40, line: 264 }, children: runs(text, { size: 22, color: "1E293B" }) });
const GAP = (n = 80) => new Paragraph({ spacing: { before: 0, after: n }, children: [] });
const PB = () => new Paragraph({ children: [new PageBreak()] });

function H1(num, text, marks) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1, keepNext: true, pageBreakBefore: true,
    shading: { type: ShadingType.CLEAR, fill: NAVY, color: "auto" },
    spacing: { before: 0, after: 160, line: 400 }, indent: { left: 120, right: 120 },
    tabStops: [{ type: TabStopType.RIGHT, position: CW - 240 }],
    children: [new TextRun({ text: `  Q${num}   ${text}`, color: "FFFFFF", bold: true, size: 34, font: FONT }),
      new TextRun({ text: `\t${marks} marks  `, color: "FDE68A", bold: true, size: 24, font: FONT })],
  });
}
const H2 = (text, color = TEAL) => new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 220, after: 90 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 8, color, space: 2 } }, children: [new TextRun({ text, bold: true, size: 27, color, font: FONT })] });
const H3 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_3, keepNext: true, spacing: { before: 150, after: 60 }, children: [new TextRun({ text, bold: true, size: 23, color: ORANGE, font: FONT })] });

const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const LB = (c = "CBD5E1") => ({ style: BorderStyle.SINGLE, size: 4, color: c });

function callout(title, lines, color = TEAL, fill = LTEAL) {
  const kids = [];
  if (title) kids.push(new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: title, bold: true, size: 22, color, font: FONT })] }));
  (Array.isArray(lines) ? lines : [lines]).forEach((l) => kids.push(new Paragraph({ spacing: { before: 20, after: 40, line: 264 }, children: runs(l, { size: 21, color: "1E293B" }) })));
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: [CW],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: CW, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill },
      borders: { top: NB, bottom: NB, right: NB, left: { style: BorderStyle.SINGLE, size: 24, color } },
      margins: { top: 80, bottom: 80, left: 200, right: 160 }, children: kids })] })],
  });
}

function table(headers, rows, widths, opt = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  const hdr = new TableRow({ tableHeader: true, children: headers.map((h, i) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: opt.head || NAVY },
    borders: { top: LB(opt.head || NAVY), bottom: LB(opt.head || NAVY), left: LB(opt.head || NAVY), right: LB(opt.head || NAVY) },
    margins: { top: 70, bottom: 70, left: 100, right: 100 }, verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ alignment: i > 0 && opt.centerCols ? AlignmentType.CENTER : AlignmentType.LEFT, children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 20, font: FONT })] })] })) });
  const body = rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((c, i) => {
    const isObj = typeof c === "object" && c !== null && !Array.isArray(c);
    const txt = isObj ? c.t : c;
    return new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: isObj && c.fill ? c.fill : ri % 2 ? "F8FAFC" : "FFFFFF" },
      borders: { top: LB(), bottom: LB(), left: LB(), right: LB() }, margins: { top: 55, bottom: 55, left: 100, right: 100 }, verticalAlign: VerticalAlign.CENTER,
      children: String(txt).split("\n").map((line) => new Paragraph({ alignment: i > 0 && opt.centerCols ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: runs(line, { size: 20, color: isObj && c.color ? c.color : "1E293B", bold: isObj && c.bold }) })) });
  }) }));
  return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: widths, rows: [hdr, ...body] });
}

function pngSize(p) { const b = fs.readFileSync(p); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; }
function img(rel, caption, maxW = 640) {
  const full = path.join(ROOT, rel);
  const { w, h } = pngSize(full);
  const width = Math.min(maxW, w), height = Math.round((h * width) / w);
  const out = [new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 100, after: 40 },
    children: [new ImageRun({ type: "png", data: fs.readFileSync(full), transformation: { width, height },
      altText: { title: caption, description: caption, name: path.basename(rel) } })] })];
  out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 160 },
    children: [new TextRun({ text: caption, italics: true, size: 19, color: GREY, font: FONT })] }));
  return out;
}
const shot = (q, name, cap, w = 640) => img(`${q}/screenshots/${name}.png`, cap, w);
const fig = (name, cap, w = 640) => img(`Report/figures/${name}.png`, cap, w);

function codeBlock(text) {
  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [CW], rows: [new TableRow({ children: [new TableCell({
    width: { size: CW, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: "1E1E1E" },
    borders: { top: NB, bottom: NB, left: { style: BorderStyle.SINGLE, size: 18, color: "569CD6" }, right: NB }, margins: { top: 90, bottom: 90, left: 180, right: 120 },
    children: text.split("\n").map((l) => new Paragraph({ spacing: { before: 0, after: 0, line: 250 }, children: [new TextRun({ text: l || " ", font: "Consolas", size: 19, color: "D4D4D4" })] })) })] })] });
}

// ------------------------------------------------------------------ metrics from the real outputs
const Q1o = "Q1_BST/output/08_bst_experiment_2000.txt";
const q1 = { hr: g(Q1o, /height\s+(\d+)\s+\d+/), hs: g(Q1o, /height\s+\d+\s+(\d+)/), cr: g(Q1o, /avg comparisons \/ search\s+([\d.]+)/), cs: g(Q1o, /avg comparisons \/ search\s+[\d.]+\s+([\d.]+)/),
  mr: g(Q1o, /max comparisons\s+(\d+)/), ms: g(Q1o, /max comparisons\s+\d+\s+(\d+)/) };
const Q2o = "Q2_AVL/output/03_avl_experiments.txt";
const t2 = rd(Q2o); const sorted2 = t2.split("--- RANDOM")[0], random2 = t2.split("--- RANDOM")[1];
const pick2 = (blk, label) => { const m = blk.match(new RegExp(label + "\\s+([\\d.]+)\\s+([\\d.]+)")); return [m[1], m[2]]; };
const q2 = { sh: pick2(sorted2, "height \\(levels\\)"), si: pick2(sorted2, "insert time \\(ms\\)"), ss: pick2(sorted2, "search time, 10000 \\(ms\\)"), sv: pick2(sorted2, "avg nodes visited / search"),
  rh: pick2(random2, "height \\(levels\\)"), ri: pick2(random2, "insert time \\(ms\\)"), rs: pick2(random2, "search time, 10000 \\(ms\\)"), rv: pick2(random2, "avg nodes visited / search"),
  rotS: g(Q2o, /RR=(\d+)/), rotR: g(Q2o, /single-rotation equivalents: (\d+)\)\nAVL balance-factor check: 100000 nodes, 0 violations\ntheory/) };
const Q3o = "Q3_BTree/output/03_btree_simulation.txt";
const q3 = { bst: g(Q3o, /BST \(random\)\s+([\d.]+)\s+(\d+)\s+(\d+) ms/), bstmax: g(Q3o, /BST \(random\)\s+[\d.]+\s+(\d+)/), avl: g(Q3o, /\nAVL\s+([\d.]+)/), avlmax: g(Q3o, /\nAVL\s+[\d.]+\s+(\d+)/),
  bt: g(Q3o, /B-tree \(m=100\)\s+([\d.]+)/), nodes: g(Q3o, /(\d+) nodes, ([\d.]+) keys/), fill: g(Q3o, /\((\d+)% full\)/), avlh: g(Q3o, /height (\d+) levels/), bstt: g(Q3o, /BST \(random\)\s+[\d.]+\s+\d+\s+(\d+) ms/), avlt: g(Q3o, /\nAVL\s+[\d.]+\s+\d+\s+(\d+) ms/) };
const Q4o = "Q4_RedBlack/output/03_rb_vs_avl_experiments.txt";
const q4 = { ri: g(Q4o, /rotations, 10000 insertions\s+(\d+)\s+(\d+)/), ai: g(Q4o, /rotations, 10000 insertions\s+\d+\s+(\d+)/), rd: g(Q4o, /rotations, 10000 deletions\s+(\d+)\s+(\d+)/), ad: g(Q4o, /rotations, 10000 deletions\s+\d+\s+(\d+)/),
  rpi: g(Q4o, /per insertion\s+([\d.]+)/), api: g(Q4o, /per insertion\s+[\d.]+\s+([\d.]+)/), rpd: g(Q4o, /per deletion\s+([\d.]+)/), apd: g(Q4o, /per deletion\s+[\d.]+\s+([\d.]+)/),
  mi: g(Q4o, /max in one insertion\s+(\d+)/), mai: g(Q4o, /max in one insertion\s+\d+\s+(\d+)/), md: g(Q4o, /max in one deletion\s+(\d+)/), mad: g(Q4o, /max in one deletion\s+\d+\s+(\d+)/),
  h: g(Q4o, /height after 10000 inserts\s+(\d+)/), ah: g(Q4o, /height after 10000 inserts\s+\d+\s+(\d+)/), bh: g(Q4o, /black-height of red-black\s+(\d+)/), sh: g(Q4o, /red-black: height (\d+) levels/), sav: g(Q4o, /AVL\s+: height (\d+) levels/), srot: g(Q4o, /levels, (\d+) rotations/) };
const Q5o = "Q5_Splay/output/02_splay_vs_avl_simulation.txt";
const t5 = rd(Q5o).split("--- UNIFORM");
const q5 = { sk: t5[0].match(/avg nodes visited per access\s+([\d.]+)\s+([\d.]+)/), un: t5[1].match(/avg nodes visited per access\s+([\d.]+)\s+([\d.]+)/),
  skw: t5[0].match(/worst single access \(nodes\)\s+(\d+)\s+(\d+)/), unw: t5[1].match(/worst single access \(nodes\)\s+(\d+)\s+(\d+)/),
  skr: t5[0].match(/rotations per access\s+([\d.]+)/)[1], unr: t5[1].match(/rotations per access\s+([\d.]+)/)[1],
  sweep: g("Q5_Splay/output/03_splay_extra_tests.txt", /in total = ([\d.]+) per access/), again: g("Q5_Splay/output/03_splay_extra_tests.txt", /repeated: ([\d.]+) nodes/) };
const Q6o = "Q6_Trie/output/05_trie_scaling.txt";
const q6rows = [...rd(Q6o).matchAll(/^(\d+)\s+(\d+)\s+([\d.]+) KB\s+(\d+) KB\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/gm)].map((m) => m.slice(1));
const Q7o = "Q7_Dictionary/output/03_measurements_200k.txt";
const q7 = { mem: rd(Q7o).match(/memory\s+([\d.]+) MB\s+([\d.]+) MB\s+([\d.]+) MB/), bpw: rd(Q7o).match(/bytes per word\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/),
  nodes: rd(Q7o).match(/nodes \/ entries\s+(\d+)\s+(\d+)\s+(\d+)/), build: rd(Q7o).match(/build time.*?(\d+) ms\s+(\d+) ms/),
  lk: rd(Q7o).match(/exact look-up.*?(\d+) ns\s+(\d+) ns/), au: rd(Q7o).match(/autocomplete.*?([\d.]+) us\s+([\d.]+) us/), rg: rd(Q7o).match(/range listing.*?([\d.]+) us\s+([\d.]+) us/),
  sg: rd(Q7o).match(/spell suggestions.*?([\d.]+) us\s+([\d.]+) us/), up: rd(Q7o).match(/incremental insert : ([\d.]+) ms.*?re-sort (\d+) ms/), proj: rd(Q7o).match(/TST ([\d.]+) MB, sorted array ([\d.]+) MB, 26-ary trie (\d+) MB/) };
const ver = rd("Q7_Dictionary/output/01_verification_1000_words.txt");

const kids = [];
const add = (...x) => x.flat().forEach((e) => kids.push(e));

// ================================================================== COVER
const cover = new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [CW], rows: [new TableRow({ children: [new TableCell({
  width: { size: CW, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: NAVY }, borders: { top: NB, bottom: NB, left: NB, right: NB },
  margins: { top: 500, bottom: 500, left: 400, right: 400 }, children: [
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "SIMATS ENGINEERING", bold: true, size: 26, color: "FDE68A", font: FONT, characterSpacing: 60 })] }),
    new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: "DATA STRUCTURES  |  ASSIGNMENT 3  |  CO3", size: 22, color: "BFDBFE", font: FONT })] }),
    new Paragraph({ spacing: { after: 120, line: 600 }, children: [new TextRun({ text: "Optimized Data Storage and Retrieval Using Tree-Based Structures", bold: true, size: 56, color: "FFFFFF", font: FONT })] }),
    new Paragraph({ spacing: { before: 120, after: 0 }, children: [new TextRun({ text: "BST  -  AVL  -  B-Tree  -  Red-Black  -  Splay  -  Trie  -  Design from first principles", size: 24, color: "99F6E4", font: FONT })] }),
  ] })] })] });
add(GAP(200), cover, GAP(300));
const info = [["Student Name", "______________________________"], ["Register Number", "______________________________"], ["Department / Section", "______________________________"],
  ["Academic Year / Semester", "______________________________"], ["Faculty Name", "______________________________"], ["Nature of Assignment", "Individual"],
  ["Duration / Total Marks", "1 Week   /   50 Marks"], ["Date of Submission", "____ / ____ / ________"], ["GitHub Repository", "https://github.com/<your-username>/DS_Assignment3_CO3"]];
add(table(["Field", "Details"], info.map((r) => [{ t: r[0], bold: true, color: NAVY }, r[1]]), [3300, CW - 3300]));
add(GAP(200), callout("CO3 outcome addressed", "Analyse searching and sorting algorithms - here through the search trees that make look-up, insertion and ordered listing fast: BST, AVL, B-tree, red-black tree, splay tree, trie and a ternary search tree. Every claim in this report is backed by C code that was compiled and run; the output shown is the real output of that code.", NAVY, LIGHT));

// ================================================================== AT A GLANCE
add(new Paragraph({ children: [new PageBreak()] }));
add(H2("Report at a glance", NAVY));
add(P("Seven problems, seven different trees. The table lists the headline measurement of each question - the number that decided the design."));
add(table(["Q", "Structure", "Real-world problem", "Headline result (measured)", "Marks"], [
  ["1", "Binary search tree", "Library catalogue by accession number", `Sorted input: height **${q1.hs}** vs random **${q1.hr}**; avg ${q1.cs} vs ${q1.cr} comparisons`, "7"],
  ["2", "AVL tree", "Live stock price index", `100,000 sorted keys: height **${q2.sh[1]}** (BST ${q2.sh[0]}); insert ${q2.si[1]} ms vs ${Math.round(q2.si[0] / 1000)} s`, "7"],
  ["3", "B-tree", "Hospital index on disk", `5 million keys: **${Number(q3.bt).toFixed(2)}** disk reads vs AVL ${q3.avl} vs BST ${q3.bst}`, "6"],
  ["4", "Red-black tree", "OS process scheduler", `Max rotations per delete: **${q4.md}** (AVL ${q4.mad}); sorted height ${q4.sh} vs BST 100,000`, "6"],
  ["5", "Splay tree", "Cache of popular products", `Skewed access: **${q5.sk[1]}** vs AVL ${q5.sk[2]} nodes; uniform: splay loses (${q5.un[1]} vs ${q5.un[2]})`, "6"],
  ["6", "Trie", "Phone contact autocomplete", `Prefix query: ${q6rows[1][5]} us trie autocomplete vs ${q6rows[1][6]} us linear scan; trie costs ${(q6rows[1][2] / q6rows[1][3]).toFixed(0)}x more memory`, "8"],
  ["7", "Ternary search tree", "200,000-word dictionary on a phone", `**${q7.mem[2]} MB** vs ${q7.mem[1]} MB for a 26-pointer trie; all 5 verification suites passed`, "10"],
], [450, 1650, 2400, 4606, 800], { centerCols: false }));
add(GAP(120));
add(H2("What is in the submission", NAVY));
add(table(["Item", "Where"], [
  ["C source code for every task (16 programs)", "`Q1_BST/` ... `Q7_Dictionary/` - each `.c` file has its compile command and usage in the header comment"],
  ["Real program output of every run", "`Qx/output/*.txt`"],
  ["VS Code style output screenshots (33 images)", "`Qx/screenshots/*.png` (embedded in this report)"],
  ["Tree diagrams and charts", "`Report/figures/*.png`"],
  ["Scripts that regenerate everything", "`run_all.sh`, `tools/make_screens.py`, `tools/make_figures.py`, `tools/gen_words.py`"],
  ["README with build instructions", "`README.md`"],
], [3600, CW - 3600]));
add(GAP(100), callout("How to read the evidence", ["Each question follows the same pattern: **problem snapshot -> predictions / hand work -> code evidence (screenshots) -> design analysis -> experiments -> conclusion -> alternative concept**.",
  "Numbers in tables are copied from the program output files, so they can be reproduced by running `./run_all.sh`. Timings depend on the machine (they were taken on a single-core Linux container); the shapes and ratios are what matter."], ORANGE, LORANGE));

// ================================================================== Q1
add(H1(1, "Binary Trees and Binary Search Trees", 7));
add(callout("Problem snapshot", "A library keeps books in a BST keyed by accession number. Last year 2,000 books were added in increasing order and searches became slow. **Why - and what should be done?**", ORANGE, LORANGE));
add(H2("1.1  Predict the output  -  array-stored tree"));
add(P("The program stores a tree in an array where the children of index `i` are `2i+1` and `2i+2`; `.` marks an empty slot. The array `ABCDE.F` gives index 0 = A, 1 = B, 2 = C, 3 = D, 4 = E, 5 = empty, 6 = F, which is the tree below."));
add(fig("q1_array_tree", "Figure Q1.1 - tree stored in the array and the four orders it produces", 640));
add(callout("My predicted output (written before running)", ["`ABDECF DBEACF DEBFCA ABCDEF`"], NAVY, LIGHT));
add(shot("Q1_BST", "01_predict_array_tree", "Figure Q1.2 - actual output: identical to the prediction"));
add(table(["Order", "Rule", "Result", "Reasoning"], [
  ["Preorder", "root, left, right", "ABDECF", "A, then the whole left subtree B(D,E), then right subtree C(,F)"],
  ["Inorder", "left, root, right", "DBEACF", "D B E / A / C F  (C has no left child, so C then F)"],
  ["Postorder", "left, right, root", "DEBFCA", "children are printed before the parent; root A is last"],
  ["Last loop", "array index 0..N-1, skipping `.`", "ABCDEF", "**Level-order (breadth-first)** traversal - an array stored this way lists levels top to bottom, left to right"],
], [1300, 2400, 1300, CW - 5000]));
add(P("**Differences between prediction and output: none.** Slot 5 is `.`, so the node C has no left child and the recursion returns immediately on `T[5]`; this is why `C` is followed directly by `F` in the inorder result."));

add(H2("1.2  Predict the output  -  deletion in a BST"));
add(P("Keys inserted: 50 30 70 20 40 60 80 65. Then `del(20)`, `del(30)`, `del(50)` and a preorder print."));
add(fig("q1_delete_steps", "Figure Q1.3 - the tree after each of the three deletions", 650));
add(table(["Deletion", "Node type", "What happens", "Preorder afterwards"], [
  ["del(20)", "Case 1 - leaf", "node removed, parent's left pointer becomes NULL", "50 30 40 70 60 65 80"],
  ["del(30)", "Case 2 - one child (40)", "40 takes the place of 30", "50 40 70 60 65 80"],
  ["del(50)", "Case 3 - two children", "inorder successor = leftmost of right subtree = 60; copy 60 into the root, then delete 60 from the right subtree (it has one child, 65 -> case 2)", "**60 40 70 65 80**"],
], [1200, 2000, 4300, CW - 7500]));
add(callout("My predicted output (written before running)", "`60 40 70 65 80`", NAVY, LIGHT));
add(shot("Q1_BST", "02_predict_bst_delete", "Figure Q1.4 - actual output: identical to the prediction"));
add(P("**Differences: none.** (The program prints a trailing space after each key, which is invisible in the terminal.)"));

add(H2("1.3  Complete the code  -  TODO 1 (insert) and TODO 2 (height)"));
add(P("`insert` creates a node when it reaches `NULL`, otherwise goes left for smaller keys and right for larger ones; an equal key matches neither branch, so **duplicates are ignored**. `height` returns -1 for an empty tree (so a single node has height 0) and otherwise `1 + max(left, right)`."));
add(shot("Q1_BST", "03_complete_code", "Figure Q1.5 - completed insert()/height() compiled with -fsanitize=address; output equals the expected output"));
add(fig("q1_random_vs_sorted", "Figure Q1.6 - the same kind of keys give two very different shapes", 600));
add(callout("Why the same 8 keys give height 3 in one tree and height 7 in the other", [
  "A BST has no balancing step: its shape is decided only by the **order of arrival**. Random order (500, 300, 700 ...) fills the levels evenly, so 8 keys need only 4 levels (height 3). Sorted order makes every new key larger than all previous keys, so it always goes right of the last node: a chain with one node per level (height 7 = n - 1).",
  "Searching 350 costs 4 comparisons in the first tree; searching 80 costs 8 comparisons in the chain - exactly the expected `comparisons: 4 and 8`."], TEAL, LTEAL));

add(H2("1.4  Full implementation and tests (tasks 1 - 4, 9 - 12)"));
add(P("`q1_bst_full.c` implements insert, search with a comparison counter, height, delete (three cases), all four traversals, save/rebuild with a file, and the experiment. The nine-key demo tree is `50 30 70 20 40 60 80 65 35`."));
add(shot("Q1_BST", "04_bst_basic_traversals", "Figure Q1.7 - insert, four traversals, height and search with comparison counts"));
add(shot("Q1_BST", "05_bst_delete_three_cases", "Figure Q1.8 - deleting a leaf (20), a one-child node (40) and the root with two children (50); BST property verified after each"));
add(P("**Bug found and fixed while testing:** the first version printed *case 2* for the root deletion because the recursive call that removes the successor overwrote the message. The message is now set after the recursive call - the tree itself was always correct."));
add(shot("Q1_BST", "06_bst_save_rebuild", "Figure Q1.9 - saving with preorder and rebuilding gives an identical tree"));
add(callout("Which traversal to save a tree - and why", "**Preorder.** The root is written first, then each parent before its children, so reading the file and inserting key by key recreates exactly the same shape. An inorder file is sorted, so re-inserting it builds a degenerate chain (height 8 in the test instead of 3). Postorder would also work (reverse it), but preorder is the natural choice.", ORANGE, LORANGE));
add(shot("Q1_BST", "07_bst_empty_duplicates", "Figure Q1.10 - empty tree (no crash, height -1) and duplicate keys (stored once)"));

add(H2("1.5  Design and analysis (tasks 5 - 8)"));
add(H3("5.  Why inorder traversal of a BST gives sorted order"));
add(P("Inorder visits *left subtree, node, right subtree*. By the BST rule every key in the left subtree is smaller than the node and every key in the right subtree is larger. By induction on the height: an empty tree is trivially sorted; if inorder of both subtrees is sorted, then (sorted left) + node + (sorted right) is sorted, because all left keys < node < all right keys. Each node is visited once, so the sorted listing costs O(n)."));
add(H3("6.  The three deletion cases and why the inorder successor is used"));
add(table(["Case", "Node to delete", "Action", "Cost"], [
  ["1", "Leaf", "free it and set the parent's pointer to NULL", "O(h)"],
  ["2", "One child", "free it and let the parent point to the child (the whole subtree moves up)", "O(h)"],
  ["3", "Two children", "copy the **inorder successor** (smallest key of the right subtree) into the node, then delete the successor from the right subtree - it has no left child, so that is case 1 or 2", "O(h)"],
], [800, 2000, 5600, CW - 8400]));
add(P("The successor is the *next larger key*, so putting it in the deleted node's place keeps every left key smaller and every right key larger - the BST property survives without touching any other node. The inorder predecessor works equally well; the successor is only a convention. The successor has **no left child** (otherwise a smaller key would exist in the right subtree), which guarantees the second deletion is the easy case."));
add(H3("7.  Best- and worst-case height with n nodes"));
add(P("**Best case.** Level i can hold at most 2^i nodes, so a tree of height h holds at most 1 + 2 + ... + 2^h = 2^(h+1) - 1 nodes. For n nodes: n <= 2^(h+1) - 1, hence **h >= ceil(log2(n+1)) - 1**, i.e. h = floor(log2 n) for a complete tree. For n = 2,000 this is 10."));
add(P("**Worst case.** Every level holds at least one node, so h <= n - 1, reached when each node has only one child (a chain). For n = 2,000: 1,999. Search then costs up to n comparisons - O(n), the same as a linked list."));
add(H3("8.  Why sorted input produces a degenerate tree"));
add(P("When keys arrive in increasing order each new key is larger than every key already in the tree. The search for its position goes right at every node and ends below the previously inserted node, so the new node becomes the right child of the last one. After n insertions the tree is a right-leaning chain; the i-th insertion costs i comparisons, so building it costs n(n+1)/2 = O(n^2) in total (measured for 100,000 keys in Q2: 21.9 seconds)."));

add(H2("1.6  Experiment  -  2,000 keys in random and sorted order (task 9)"));
add(shot("Q1_BST", "08_bst_experiment_2000", "Figure Q1.11 - height and average comparisons for 2,000 accession numbers"));
add(table(["Measurement", "Random order", "Sorted order", "Ratio"], [
  ["Height", q1.hr, q1.hs, (q1.hs / q1.hr).toFixed(0) + "x"],
  ["Average comparisons per search", q1.cr, q1.cs, (q1.cs / q1.cr).toFixed(0) + "x"],
  ["Worst search", q1.mr, q1.ms, (q1.ms / q1.mr).toFixed(0) + "x"],
  ["Ideal balanced height (floor log2 2000)", "10", "10", "-"],
], [4200, 1900, 1900, CW - 8000], { centerCols: true }));
add(fig("q1_chart", "Figure Q1.12 - log-scale comparison of random and sorted insertion", 600));
add(P(`A random BST is about ${(q1.hr / 10).toFixed(1)} times taller than the ideal height of 10 but still logarithmic (the expected height of a random BST is about 2.99 log2 n). Sorted insertion makes the library search about ${(q1.cs / q1.cr).toFixed(0)} times slower - exactly the symptom reported.`));
add(H2("1.7  Conclusion"));
add(callout("When is a plain BST enough, and when must it be replaced?", [
  "A plain BST is sufficient when keys arrive in **random (unpredictable) order**, the data is small or short-lived, and occasional slow searches are acceptable - it is the simplest tree, with no extra fields.",
  "It must be replaced by a **self-balancing tree (AVL / red-black)** when keys can arrive in sorted or nearly sorted order (accession numbers, timestamps, auto-increment IDs), when the worst-case response time matters, or when the data is large. For the library: switch to an AVL or red-black tree - or simply insert the 2,000 books in shuffled order as a quick fix."], TEAL, LTEAL));
add(H2("1.8  Alternative concept  -  sorted array with binary search"));
add(table(["Operation", "BST", "Sorted array + binary search", "For 2,000 books"], [
  ["Search", "O(h): O(log n) balanced, O(n) degenerate", "O(log n) always", `array: <= 11 comparisons; BST: ${q1.cr} avg (random) or ${q1.cs} avg (sorted)`],
  ["Insertion", "O(h), no data movement", "O(n): shift on average n/2 elements", "array: ~1,000 moves per insert; BST: 13 - 1,000 steps"],
  ["Sorted listing", "O(n) inorder traversal", "O(n) simple loop", "same"],
  ["Extra space", "2 child pointers per node = 16 bytes (64-bit)", "none", "BST: 32 KB extra"],
  ["Weakness", "unbalanced on sorted input", "slow insertion; fixed capacity or reallocation", ""],
], [1500, 2800, 2900, CW - 7200]));
add(P("**Verdict.** If the catalogue changes rarely (books added in a nightly batch) a sorted array is smaller and gives the same O(log n) search with perfect cache behaviour. If books are added continuously a balanced tree wins because insertion is O(log n) instead of O(n)."));

// ================================================================== Q2
add(H1(2, "AVL Trees", 7));
add(callout("Problem snapshot", "A stock exchange must find any company in guaranteed logarithmic time, even when companies are listed in alphabetical (sorted) order - the exact case that breaks a plain BST.", ORANGE, LORANGE));
add(H2("2.1  Complete the code  -  rotate_right and rotate_left"));
add(P("A right rotation lifts the left child `x` above `y`: `x` becomes the new subtree root, `y` becomes the right child of `x`, and the old right subtree of `x` (keys between x and y) becomes the left child of `y`. **Heights are recomputed bottom-up - `y` first (it is now lower), then `x`.** `rotate_left` is the mirror image."));
add(shot("Q2_AVL", "01_complete_code", "Figure Q2.1 - completed rotations; output 30 20 10 25 40 50 and height = 3 as expected"));
add(H2("2.2  Insertion trace of 10, 20, 30, 40, 50, 25  (tasks 15, 17, 18)"));
add(shot("Q2_AVL", "02_avl_trace", "Figure Q2.2 - tree printed after every insertion with the rotation used"));
add(fig("q2_avl_steps", "Figure Q2.3 - tree after each insertion; numbers beside nodes are balance factors (green = balanced)", 650));
add(table(["Insert", "Where it breaks", "Rotation", "Why"], [
  ["10, 20", "-", "none", "balance factors stay within -1..+1"],
  ["30", "node 10: bf = -2", "**RR** (left rotation)", "30 was added to the right subtree of the right child (10 -> 20 -> 30): a straight right-right line"],
  ["40", "-", "none", "20(10, 30(,40)) - node 30 has bf -1, still allowed"],
  ["50", "node 30: bf = -2", "**RR** (left rotation at 30)", "50 went right of the right child 40 of 30"],
  ["25", "node 20: bf = -2", "**RL** (double rotation)", "25 went into the **left** subtree of the right child (20 -> 40 -> 30 -> 25): a zig-zag. Right-rotate at 40, then left-rotate at 20"],
], [900, 2000, 2300, CW - 5200]));
add(fig("q2_rotations", "Figure Q2.4 - before and after each of the three rotations (red balance factor = violation)", 600));
add(H2("2.3  Design and analysis (tasks 14, 19, 20)"));
add(H3("Height O(log n) (task 19)"));
add(P("Let N(h) be the *minimum* number of nodes of an AVL tree of height h. The sparsest AVL tree has a root with one subtree of height h-1 and the other of height h-2, so **N(h) = N(h-1) + N(h-2) + 1** with N(1) = 1, N(2) = 2. This is the Fibonacci recurrence (N(h) = F(h+2) - 1), which grows like phi^h with phi = 1.618. Hence n >= N(h) > phi^h / sqrt(5) - 2, and solving for h gives **h < 1.44 log2(n + 2)**. For n = 100,000 the bound is 23.9 levels - the measured heights are 17 (sorted) and 20 (random)."));
add(H3("The four cases (task 13)"));
add(table(["Case", "Imbalance at node z", "Fix"], [
  ["LL", "bf(z) > +1 and new key in left-left", "right rotation at z"],
  ["RR", "bf(z) < -1 and new key in right-right", "left rotation at z"],
  ["LR", "bf(z) > +1, new key in left-right", "left rotation at z's left child, then right rotation at z"],
  ["RL", "bf(z) < -1, new key in right-left", "right rotation at z's right child, then left rotation at z"],
], [900, 4200, CW - 5100]));
add(H3("What changes for deletion (task 20)"));
add(B("After removing a node (using the BST deletion rules) heights are recomputed on the way back up the path to the root, and **any ancestor may become unbalanced** - so up to O(log n) rotations may be needed (insertion needs at most one fix). Measured in Q4: at most 6 rotations in one deletion."));
add(B("The case of a child with balance factor 0 can occur (it cannot after an insertion): a **single** rotation is used and the subtree height does *not* shrink, so the walk to the root can stop early."));
add(B("The balance rule `bf(child) < 0` for LR/RL must use the child's *current* balance factor instead of the inserted key's position."));
add(H2("2.4  Experiments (tasks 16, 21 - 24)"));
add(shot("Q2_AVL", "03_avl_experiments_part1", "Figure Q2.5 - 100,000 sorted keys, plain BST vs AVL (part 1)"));
add(shot("Q2_AVL", "03_avl_experiments_part2", "Figure Q2.6 - 100,000 random keys, rotation counts and balance-factor verification (part 2)"));
add(table(["Measurement (100,000 keys)", "Plain BST sorted", "AVL sorted", "Plain BST random", "AVL random"], [
  ["Height (levels)", q2.sh[0], q2.sh[1], q2.rh[0], q2.rh[1]],
  ["Insertion time (ms)", q2.si[0], q2.si[1], q2.ri[0], q2.ri[1]],
  ["10,000 searches (ms)", q2.ss[0], q2.ss[1], q2.rs[0], q2.rs[1]],
  ["Average nodes visited", q2.sv[0], q2.sv[1], q2.rv[0], q2.rv[1]],
  ["Rotations (single-rotation equivalents)", "-", q2.rotS, "-", q2.rotR],
], [3000, 1700, 1500, 1900, CW - 8100], { centerCols: true }));
add(fig("q2_chart", "Figure Q2.7 - BST vs AVL (log scale)", 650));
add(B(`**Sorted input:** every insertion is an RR case (${q2.rotS} left rotations = about one per key), keeping the height at ${q2.sh[1]} levels (log2 100,000 = 16.6). The plain BST degenerated to ${q2.sh[0]} levels and needed ${(q2.si[0] / 1000).toFixed(1)} seconds to build; AVL needed ${q2.si[1]} ms - about ${Math.round(q2.si[0] / q2.si[1]).toLocaleString()} times faster. A search visits ${q2.sv[0]} nodes on average in the BST and ${q2.sv[1]} in the AVL tree.`));
add(B(`**Random input:** AVL did ${q2.rotR} single rotations (about 0.7 per insertion; LL, RR, LR and RL occur almost equally), so its insertion is slower (${q2.ri[1]} ms vs ${q2.ri[0]} ms) but its searches are faster (${q2.rs[1]} ms vs ${q2.rs[0]} ms for 10,000 searches) because the tree is shorter (${q2.rh[1]} vs ${q2.rh[0]} levels).`));
add(B("**Verification (task 24):** a checking function visits every node and tests |balance factor| <= 1, stored height = 1 + max(children) and BST order: 100,000 nodes, **0 violations** for both runs."));
add(H2("2.5  Conclusion"));
add(callout("Is the extra work of rotations worth it?", [`**Yes, whenever input order is not under your control.** On the sorted listing the rotations cost almost nothing (${q2.si[1]} ms for 100,000 keys) and saved ${(q2.si[0] / 1000).toFixed(1)} seconds of insertion and a ${Math.round(q2.sv[0] / q2.sv[1]).toLocaleString()}x reduction in search work. On random data the price is about 2x slower insertion (${q2.ri[1]} vs ${q2.ri[0]} ms for 100,000 keys) for about 1.5x faster searching - a good trade for an index that is searched far more often than it is updated, and the only safe choice when the worst case must be guaranteed, as for a stock index.`], TEAL, LTEAL));
add(H2("2.6  Alternative concept  -  red-black tree or skip list"));
add(table(["Aspect", "AVL tree", "Red-black tree", "Skip list"], [
  ["Height bound", "1.44 log2 n", "2 log2 n", "expected O(log n), no hard bound"],
  ["Rotations per insertion", "<= 2 (one fix); measured 0.70 avg", "<= 2; measured 0.58 avg", "none (random level coin flips)"],
  ["Extra space per node", "height field (int, 4 bytes)", "1 colour bit", "several forward pointers (average 2 per node at p = 1/2)"],
  ["Search speed", "fastest (shortest tree)", "slightly slower (taller)", "similar, more pointer chasing"],
  ["Best for", "read-heavy indexes", "update-heavy (see Q4)", "concurrent / lock-free structures"],
], [2000, 2700, 2600, CW - 7300]));
add(P("For a live price index that is read many times per second and updated per tick, AVL stays the best fit because lookups dominate; a red-black tree would win only if updates dominated."));

// ================================================================== Q3
add(H1(3, "B-Trees", 6));
add(callout("Problem snapshot", "5 million patient records on disk, 10 ms per disk read. A binary tree needs about 23 reads per search (230 ms); a B-tree packs many keys into one disk block and needs 4 reads (40 ms).", ORANGE, LORANGE));
add(H2("3.1  Hand insertion  -  keys 10, 20, 5, 6, 12, 30, 7, 17 with minimum degree t = 2 (tasks 25, 34)"));
add(P("Minimum degree t = 2 means every node except the root holds 1 to 3 keys and has 2 to 4 children (order 4). A full node (3 keys) is **split before descending**: the median key moves up to the parent and the other two keys form two separate nodes."));
add(shot("Q3_BTree", "01_btree_trace_part1", "Figure Q3.1 - program output of the hand-trace (part 1)"));
add(shot("Q3_BTree", "01_btree_trace_part2", "Figure Q3.2 - program output of the hand-trace (part 2)"));
add(fig("q3_btree_steps", "Figure Q3.3 - the B-tree after every insertion (orange = root, blue = other nodes)", 660));
add(table(["Insert", "Action"], [
  ["10, 20, 5", "root leaf fills up: [5 10 20] (3 keys = full)"],
  ["6", "root is full -> **split**: median 10 moves up and becomes a new root, leaves [5] and [20]; 6 joins [5] -> [5 6]. Height grows from 0 to 1"],
  ["12, 30", "go into the right leaf: [12 20] then [12 20 30]"],
  ["7", "into the left leaf: [5 6 7] (full)"],
  ["17", "17 must go into the full leaf [12 20 30] -> **split** before descending: median 20 moves up into the root, giving [10 20] with leaves [5 6 7], [12 17], [30]"],
], [1400, CW - 1400]));
add(P("Two splits in total; **all leaves are at the same depth** after every step - the tree only grows in height when the *root* splits."));
add(H2("3.2  Height for order 100 and 5 million keys (tasks 27, 28)"));
add(shot("Q3_BTree", "02_btree_height", "Figure Q3.4 - height calculation computed by the program"));
add(P("With order m = 100 each node has at most 100 children (99 keys) and, except the root, at least t = 50 children. A B-tree of height h (edges) holds at least 2t^h - 1 keys, so h <= log_t((n+1)/2) = log_50(2,500,000.5) = 3.77, i.e. **h = 3 edges = 4 levels** in the worst case. In the best case (all nodes full) three levels hold only 999,999 keys, so 5 million keys also need 4 levels. **Every search therefore reads exactly 4 nodes = 4 disk reads = 40 ms.**"));
add(H2("3.3  Simulation with 5,000,000 keys (tasks 28, 33, 35, 36)"));
add(shot("Q3_BTree", "03_btree_simulation", "Figure Q3.5 - B-tree, BST and AVL with 5 million keys; 20,000 random searches each"));
add(table(["Structure", "Avg node visits", "Worst case seen", "Avg time at 10 ms/read", "Worst time"], [
  ["Plain BST (random order)", q3.bst, q3.bstmax, q3.bstt + " ms", q3.bstmax * 10 + " ms"],
  ["AVL tree", q3.avl, q3.avlmax, q3.avlt + " ms", q3.avlmax * 10 + " ms"],
  [{ t: "B-tree, order 100", bold: true, color: TEAL }, { t: q3.bt, bold: true, color: TEAL }, { t: "4", bold: true, color: TEAL }, { t: "40 ms", bold: true, color: TEAL }, { t: "40 ms", bold: true, color: TEAL }],
], [3000, 1600, 1700, 2000, CW - 8300], { centerCols: true }));
add(fig("q3_chart", "Figure Q3.6 - average disk reads and search time per structure", 600));
add(B(`The built B-tree has ${q3.nodes} nodes that are ${q3.fill}% full on average (random insertion), giving height 3 (4 levels). The AVL tree has ${q3.avlh} levels.`));
add(B("**Edge cases (task 36):** the smallest key (1), the largest key (5,000,000) and a missing key (5,000,001) each needed 4 reads; the missing key still goes down to a leaf before the search concludes."));
add(H2("3.4  Design and analysis (tasks 29 - 32)"));
add(H3("29.  Why B-trees are wide and short"));
add(P("The cost of a disk search is the number of *blocks* read, not the number of comparisons. A node is sized to one disk block and stores up to m-1 keys, so each read eliminates all but 1/m of the data: height = log_m n. With m = 100 that is 4 levels for 5 million keys, compared with log2 n = 23 for a binary tree. Searching inside the node (binary search over 99 keys) costs microseconds in memory - negligible next to 10 ms."));
add(H3("30.  Node splitting and why all leaves stay at the same depth"));
add(P("A tree grows in height **only when the root splits** - a new root is created above the old one, which pushes *every* leaf down by one level at the same time. A split of any other node replaces one node by two siblings at the same level and adds one key to the parent. Insertion never attaches a new node below an existing leaf, therefore the distance from the root to every leaf is always the same."));
add(H3("31.  B-tree vs B+ tree for range queries"));
add(P("In a B-tree, keys and records are spread over internal nodes and leaves, so a range such as *all patients admitted in a week* needs repeated up-and-down traversals. In a **B+ tree** all records live in the leaves, internal nodes hold only copies of keys as signposts, and the leaves are chained in a linked list. A range query searches once for the first key (4 reads) and then follows the leaf chain - sequential block reads. Internal nodes also hold more keys because they carry no records, which makes the tree even shorter."));
add(H3("32.  Choosing the node size to match a disk block"));
add(P("Choose m so that one node fills one block: block size >= 8 (header) + (m-1) x key size + m x pointer size. For a 4,096-byte block with 8-byte keys and 8-byte pointers, m-1 = 255 keys and order 256 (computed in the program output above). A smaller node wastes the block read; a larger node needs two reads. Order 100 in the assignment corresponds to a block of about 1.2 KB."));
add(H2("3.5  Conclusion"));
add(callout("Why B-trees for databases and file systems, AVL for data in memory?", [
  "On disk the cost is dominated by block reads (10 ms), so the structure that minimises the **number of blocks touched** wins: 4 reads (40 ms) for the B-tree versus about 22 for the AVL tree (217 ms) in our simulation. In memory a node access costs nanoseconds and binary-search comparisons dominate, so the small, simple AVL node (24 bytes, two pointers) is faster and easier than a 1.2 KB multi-key node that must be searched linearly or by binary search and shifted on insertion."], TEAL, LTEAL));
add(H2("3.6  Alternative concept  -  AVL tree with one node per disk block"));
add(table(["Aspect", "B-tree of order 100", "AVL tree, one node per block"], [
  ["Disk reads per search (5 million keys)", "4 (measured: avg 3.99)", `${q3.avl} on average, ${q3.avlmax} worst (about 23 = log2 n)`],
  ["Time per search at 10 ms", "40 ms", `${q3.avlt} ms avg - ${(q3.avlt / 40).toFixed(1)}x slower`],
  ["Space used per 4 KB block", "order 256 fills the block (about 69% full on average); order 100 uses 1,204 of 4,096 bytes", "24 of 4,096 bytes used = **0.6%**; 99.4% of every block is wasted"],
  ["Blocks needed for 5 million keys", "about 73,000 nodes (order 100)", "5,000,000 blocks"],
  ["Range query", "B+ tree: sequential leaf scan", "one random read per key"],
], [3000, 3600, CW - 6600]));

// ================================================================== Q4
add(H1(4, "Red-Black Trees", 6));
add(callout("Problem snapshot", "An OS scheduler keeps runnable processes ordered by CPU time used. It inserts, deletes and picks the **smallest** very often - Linux's CFS uses a red-black tree for exactly this.", ORANGE, LORANGE));
add(H2("4.1  The five red-black properties (task 37)"));
add(table(["#", "Property", "Checked in code by"], [
  ["1", "Every node is red or black", "`red` flag in the node"],
  ["2", "The root is black", "`!root->red`"],
  ["3", "Every NIL leaf is black (one shared sentinel node)", "`nilnode.red == 0`"],
  ["4", "A red node has two black children (no two reds in a row)", "`n->red && (n->l->red || n->r->red)` -> violation"],
  ["5", "Every path from a node to its NIL leaves has the same number of black nodes (black-height)", "`check()` returns -1 if left and right black-heights differ"],
], [500, 6200, CW - 6700]));
add(H2("4.2  Insertion of 10, 20, 30, 15, 25, 5  -  every recolouring and rotation (tasks 38, 39)"));
add(shot("Q4_RedBlack", "01_rb_trace_part1", "Figure Q4.1 - trace of the implementation (part 1)"));
add(shot("Q4_RedBlack", "01_rb_trace_part2", "Figure Q4.2 - trace of the implementation (part 2)"));
add(fig("q4_rb_steps", "Figure Q4.3 - the red-black tree after each insertion", 640));
add(table(["Insert", "Violation", "Fix"], [
  ["10", "root is red", "recolour root black"],
  ["20", "none", "red child of a black parent"],
  ["30", "red 30 under red 20; uncle is NIL (black): straight line", "**rotate left at 10**; recolour 20 black, 10 red -> 20(10R, 30R)"],
  ["15", "red 15 under red 10; uncle 30 is red", "**recolour only**: parent 10 and uncle 30 -> black, grandparent 20 -> red, then root back to black"],
  ["25", "none", "red child of black 30"],
  ["5", "none", "red child of black 10"],
], [900, 4200, CW - 5100]));
add(P("Result: 20B(10B(5R, 15R), 30B(25R, -)), height 3, black-height 2, one rotation in total. The checking function confirmed all properties after every insertion."));
add(H2("4.3  Finding the smallest process  -  the leftmost node (tasks 40, 44)"));
add(shot("Q4_RedBlack", "02_rb_scheduler_leftmost", "Figure Q4.4 - picking the process with the smallest CPU time; walk vs cached pointer"));
add(P("The smallest key is the leftmost node: follow `left` until NIL - O(log n) steps (2 steps in the demo). The scheduler instead **caches a pointer to the leftmost node**: on insertion it is updated if the new key is smaller; on deletion of the leftmost node the new leftmost is its successor (the minimum of its right subtree, or its parent when there is no right child). Finding the next process to run becomes O(1) - 0 steps in the demo, as the output shows."));
add(H2("4.4  Design and analysis (tasks 41 - 43)"));
add(H3("41.  Height <= 2 log2(n + 1)"));
add(P("Let h be the height and bh the black-height of the root. By property 4 no two red nodes are adjacent, so at least half the nodes on any root-to-leaf path are black: **bh >= h/2**. A subtree with black-height bh contains at least 2^bh - 1 internal nodes (induction: removing the root gives two subtrees of black-height >= bh-1). Hence n >= 2^(h/2) - 1, so h/2 <= log2(n+1) and **h <= 2 log2(n + 1)**."));
add(H3("42 / 43.  Rotations: red-black vs AVL, and why red-black wins for frequent updates"));
add(table(["", "Red-black", "AVL"], [
  ["Rotations per insertion", "at most 2", "at most 2 (one fix)"],
  ["Rotations per deletion", "**at most 3**", "up to O(log n) (measured max 6)"],
  ["Recolouring", "O(log n) but cheap (flag flips, no pointer changes)", "no recolouring; heights updated on the whole path"],
  ["Height", "up to 2 log2 n (taller)", "up to 1.44 log2 n (shorter)"],
  ["Balancing strictness", "relaxed - fewer restructurings", "strict - more restructuring, faster lookups"],
], [2600, 3700, CW - 6300]));
add(P("Because the red-black rules are looser, an update restructures less and in a bounded way (constant rotations), while an AVL deletion may rotate at every ancestor. In a workload dominated by inserts and deletes - like a scheduler - this keeps each operation's cost small and predictable."));
add(H2("4.5  Experiments (tasks 45 - 48)"));
add(shot("Q4_RedBlack", "03_rb_vs_avl_experiments_part1", "Figure Q4.5 - 10,000 random insertions and deletions, red-black vs AVL (part 1)"));
add(shot("Q4_RedBlack", "03_rb_vs_avl_experiments_part2", "Figure Q4.6 - increasing-order test (part 2)"));
add(table(["Measurement (10,000 random keys)", "Red-black", "AVL"], [
  ["Rotations for 10,000 insertions", q4.ri, q4.ai],
  ["  per insertion / max in one insertion", `${q4.rpi} / ${q4.mi}`, `${q4.api} / ${q4.mai}`],
  ["Rotations for 10,000 deletions", q4.rd, q4.ad],
  ["  per deletion / max in one deletion", `${q4.rpd} / ${q4.md}`, `${q4.apd} / ${q4.mad}`],
  ["Height after 10,000 insertions", q4.h, q4.ah],
  ["Properties verified after every operation", "20,000 checks, 0 failures", "20,000 checks, 0 failures"],
  [`Increasing keys 1..100,000: height`, q4.sh + " (bound 2 log2 n = 33.2)", q4.sav],
], [4300, 2800, CW - 7100], { centerCols: true }));
add(fig("q4_chart", "Figure Q4.7 - rotations per operation and in the worst single operation", 600));
add(B(`On random keys the two trees did **similar average work** (about ${q4.rpi} vs ${q4.api} rotations per insertion; ${q4.rpd} vs ${q4.apd} per deletion). The difference is in the **worst case**: red-black never needed more than ${q4.md} rotations for a deletion, while AVL needed ${q4.mad}.`));
add(B(`**Increasing order (task 48):** the red-black tree stays balanced (${q4.sh} levels for 100,000 keys, black-height 16, ${q4.srot} rotations) but is taller than the AVL tree (${q4.sav} levels).`));
add(H2("4.6  Engineering decision"));
add(callout("AVL tree or red-black tree for a scheduler?", [
  "**Red-black tree.** The scheduler's workload is insert (process wakes), delete-minimum (process runs) and delete (process exits) - almost no arbitrary look-ups, where AVL's shorter height would help. The measurements show the average rotation counts are about equal on random data, but the red-black tree guarantees **at most 3 rotations per delete (measured max 3 vs 6)** and at most 2 per insert, which keeps the time spent with the run-queue locked small and bounded. The taller red-black tree (31 vs 17 levels for sorted keys) costs only a few extra steps because the next task is read from the cached leftmost pointer in O(1).",
  "If the tree were read much more than it is changed, the AVL tree would be the better choice."], TEAL, LTEAL));
add(H2("4.7  Alternative concept  -  binary min-heap"));
add(table(["Operation", "Red-black tree (cached leftmost)", "Binary min-heap"], [
  ["Find smallest", "O(1)", "O(1) - the root"],
  ["Insert", "O(log n)", "O(log n) (average O(1))"],
  ["Remove smallest", "O(log n)", "O(log n)"],
  ["Remove an arbitrary process", "**O(log n)**: find by key O(log n), unlink, rebalance", "**O(n)** to search for it (heap is only partly ordered), then O(log n) to repair - unless a position index is also kept"],
  ["Ordered traversal / predecessor", "O(n) inorder, O(log n) neighbours", "not supported"],
  ["Space per process", "2 pointers + parent + colour (about 32 bytes)", "one array slot (8 bytes); no pointers"],
], [2800, 3500, CW - 6300]));
add(P("A heap is smaller and simpler if processes never leave the run queue except by being scheduled; because processes exit, block and change priority at arbitrary times, the O(log n) arbitrary removal makes the red-black tree the better fit."));

// ================================================================== Q5
add(H1(5, "Splay Trees", 6));
add(callout("Problem snapshot", "80% of page views go to 5% of the products. A splay tree moves every accessed item to the root, so popular products stay near the top without any stored balance information.", ORANGE, LORANGE));
add(H2("5.1  The three splay steps (task 49)"));
add(table(["Step", "Situation (x = accessed node, p = parent, g = grandparent)", "Action"], [
  ["**Zig**", "p is the root", "one rotation of x over p"],
  ["**Zig-zig**", "x and p are both left children (or both right): a straight line", "rotate **p over g first**, then x over p - this halves the depth of the whole path"],
  ["**Zig-zag**", "x is a left child and p a right child (or the reverse): a bend", "rotate x over p, then x over g (x rotated twice)"],
], [1300, 5100, CW - 6400]));
add(H2("5.2  Splaying after accessing 3 and then 9 (tasks 50, 51)"));
add(P("Initial tree from the insertion order 6, 4, 8, 2, 5, 7, 9, 1, 3: `6(4(2(1,3),5),8(7,9))`."));
add(shot("Q5_Splay", "01_splay_trace", "Figure Q5.1 - every step printed by the implementation"));
add(fig("q5_splay_steps", "Figure Q5.2 - the tree after each splay step (orange = accessed node)", 650));
add(B("**Access 3** (path 6 -> 4 -> 2 -> 3): 3 is the right child of 2, which is the left child of 4 - a **zig-zag**. After it 3 is a child of the root, so a final **zig** makes it the root."));
add(B("**Access 9** (path 3 -> 6 -> 8 -> 9): 9 and its parent 8 are both right children - a **zig-zig** (rotate 8 over 6, then 9 over 8); then a final **zig** over the root 3. Note how the tree 3-6-8-9 that was a right chain became shallower, and the previously splayed 3 moved down only one level."));
add(H2("5.3  Simulation of 10,000 accesses (tasks 52, 57 - 60)"));
add(shot("Q5_Splay", "02_splay_vs_avl_simulation", "Figure Q5.3 - splay tree vs AVL tree: 1,000 products, 50 hot ones"));
add(shot("Q5_Splay", "03_splay_extra_tests", "Figure Q5.4 - root after each of the first ten accesses, worst single access and sorted sweep"));
add(table(["Workload (10,000 accesses)", "Splay: avg nodes", "AVL: avg nodes", "Splay worst access", "AVL height"], [
  ["Skewed: 80% to the 50 hot keys", { t: q5.sk[1], bold: true, color: TEAL }, q5.sk[2], q5.skw[1], q5.skw[2]],
  ["Uniform over all 1,000 keys", q5.un[1], { t: q5.un[2], bold: true, color: TEAL }, q5.unw[1], q5.unw[2]],
], [3300, 1500, 1500, 1800, CW - 8100], { centerCols: true }));
add(fig("q5_chart", "Figure Q5.5 - average nodes visited per access", 560));
add(B(`**Root after each access (task 60):** after every access the accessed key *is* the root (e.g. access 718 -> root 718, access 444 -> root 444 ... see Figure Q5.4) - this is the defining property of splaying.`));
add(B(`**Worst single access (task 58):** a chain built by inserting 1..1000 in order has height 1000; accessing key 1000 visits **1,000 nodes** - one operation really can cost O(n).`));
add(B(`**Sorted-order access (task 59):** accessing 1, 2, 3, ... , 1000 afterwards costs only ${q5.sweep} nodes per access, and a second sweep ${q5.again} - the expensive first access "paid for" restructuring that made all later accesses cheap.`));
add(H2("5.4  Design and analysis (tasks 53 - 56)"));
add(H3("53.  Amortised O(log n) and why one operation can still take O(n)"));
add(P("Define the potential Phi = sum over all nodes of log2(size of the node's subtree). The *access lemma* shows that splaying x in a tree of n nodes costs at most 3(log2 n - log2 size(x)) + 1 amortised rotations: a deep, expensive access *reduces* the potential (the tree becomes flatter), which pays for it. Over m operations the total cost is O(m log n), i.e. O(log n) amortised. A single operation can still cost O(n) when the tree is a long chain (as shown above: 1,000 visits) - the bound is about the **average over a sequence**, not each operation."));
add(H3("54.  No balance information in the nodes"));
add(P("The tree reshapes itself purely by the access sequence: no height, colour or balance factor is stored or checked. A node holds only a key and two pointers (plus a parent pointer in our bottom-up implementation; a top-down splay needs none), saving memory and code compared with AVL (height) or red-black (colour)."));
add(H3("55.  Splay vs AVL for skewed and uniform access"));
add(P(`With **skewed** access the hot keys cluster near the root: ${q5.sk[1]} nodes per access vs ${q5.sk[2]} for the AVL tree (about ${(100 - 100 * q5.sk[1] / q5.sk[2]).toFixed(0)}% less work). With **uniform** access there is no hot set to exploit and every access still restructures the tree: ${q5.un[1]} vs ${q5.un[2]} nodes (about ${((q5.un[1] / q5.un[2] - 1) * 100).toFixed(0)}% more) and ${q5.unr} rotations per access.`));
add(H3("56.  When splay trees perform badly"));
add(B("Uniform random access - restructuring cost with no benefit (measured above)."));
add(B("**Read-only or concurrent workloads:** every *read* modifies the tree, so concurrent readers need locks, cached tree nodes are constantly written, and persistent/immutable use is awkward."));
add(B("Real-time systems: a single access may take O(n) (1,000 nodes in our chain example)."));
add(H2("5.5  Conclusion"));
add(callout("When does an adaptive structure beat an always-balanced one?", `When the access pattern is **strongly skewed and stable enough to learn** (a few hot items - ${q5.sk[1]} vs ${q5.sk[2]} nodes here), when sequential access or locality of reference occurs (sorted sweep: ${q5.sweep} per access), and when the occasional O(n) operation is acceptable. When accesses are uniform, latency must be predictable, or the structure is read concurrently, an always-balanced tree (AVL) is better.`, TEAL, LTEAL));
add(H2("5.6  Alternative concept  -  hash table + doubly linked list (LRU cache)"));
add(table(["Aspect", "Splay tree", "Hash table + doubly linked list (LRU)"], [
  ["Time per access", "amortised O(log n)", "**O(1) average** (hash look-up, move node to the list head)"],
  ["Space per product", "key + 2 child pointers (+ parent) = 24 - 32 bytes", "key + bucket pointer + 2 list pointers + hash chain pointer = 32 - 40 bytes, plus the bucket array"],
  ["Eviction of the least recently used item", "not built in (would need a separate rule)", "O(1): remove the list tail"],
  ["Sorted listing of products", "**yes** - inorder traversal O(n)", "no - a hash table has no order"],
  ["Adapts to popularity", "yes (recency of access)", "yes (recency); a pure LRU ignores frequency"],
], [2700, 3300, CW - 6000]));
add(P("For a pure *cache* an LRU cache is the better engineering choice (constant time, explicit eviction). A splay tree is preferable when the cache must also support ordered queries (for example products between two prices)."));

// ================================================================== Q6
add(H1(6, "Tries", 8));
add(callout("Problem snapshot", "A phone shows matching contacts after every key press. Scanning all 5,000 contacts with `strncmp` each time makes the keyboard lag. A trie finds all words with a given prefix by walking one node per typed letter.", ORANGE, LORANGE));
add(H2("6.1  Complete the code  -  insert and count_prefix (run under -fsanitize=address)"));
add(P("`insert` walks the lowercase letters of the word, creates a missing child with `node()`, moves down, **increments the `words` counter of every node it passes** and marks `end = 1` on the last node. `count_prefix` follows the letters of the prefix and returns 0 if a letter is missing, otherwise the `words` counter of the last node: the number of stored words that start with the prefix."));
add(shot("Q6_Trie", "01_complete_code_asan", "Figure Q6.1 - completed program under AddressSanitizer: no leaks, no errors; output equals the expected output"));
add(fig("q6_trie", "Figure Q6.2 - trie of the six contacts: anand, anitha, anu, arun, bala, anusuya", 650));
add(callout("Nodes and memory for the six contacts", ["Counting new nodes per word: anand 5 + anitha 4 (shares `an`) + anu 1 (shares `an`, adds `u`) + arun 3 (shares `a`) + bala 4 + anusuya 4 (shares `anu`) = 21 letter nodes, **+ 1 root = 22 nodes**.",
  "Each node = 26 pointers x 8 bytes + 2 ints x 4 bytes = **216 bytes**, so 22 x 216 = **4,752 bytes** (the program prints the same value). Only 21 of the 572 child pointers (3.7%) are in use - the reason a 26-pointer trie is memory-hungry."], NAVY, LIGHT));
add(H2("6.2  Full trie  -  insert, search, prefix count, autocomplete, delete (tasks 61 - 63, 71, 72)"));
add(shot("Q6_Trie", "02_trie_operations", "Figure Q6.3 - operations on an 8-contact list, including deletion"));
add(P("Deletion decrements the `words` counter along the path, clears `end` on the last node and **frees every node whose counter reaches 0** - deleting `ravi` freed its 4-node branch (28 -> 24 nodes), while deleting `anu` freed nothing because `anusuya` still passes through those nodes."));
add(shot("Q6_Trie", "03_trie_edge_cases", "Figure Q6.4 - empty prefix, prefix equal to a whole word, no match, and hand-verified autocomplete lists"));
add(table(["Test (task 71 / 72)", "Result", "Hand check"], [
  ["Empty prefix \"\"", "count = 6, lists from the beginning", "all words match an empty prefix"],
  ["Whole word \"anu\"", "count = 2: anu, anusuya", "the word itself plus its extension"],
  ["No match \"xyz\", \"anq\"", "count = 0, empty list", "first letter or third letter missing"],
  ["Autocomplete \"an\"", "anand anitha anu anusuya", "alphabetical: d < i... a-n-a < a-n-i < a-n-u; anu before anusuya (shorter first)"],
  ["Autocomplete \"a\"", "anand anitha anu anusuya arun", "alphabetical"],
], [2700, 3500, CW - 6200]));
add(H2("6.3  Phone book with 5,000 names and scaling (tasks 64, 69, 70)"));
add(shot("Q6_Trie", "04_trie_5000_names", "Figure Q6.5 - 5,000 generated names: trie counts agree with a strncmp scan"));
add(shot("Q6_Trie", "05_trie_scaling", "Figure Q6.6 - time per prefix query and memory for 500, 5,000 and 50,000 names"));
add(table(["Names", "Trie nodes", "Trie memory", "Sorted array memory", "Trie count (us)", "Trie autocomplete (us)", "strncmp scan (us)"],
  q6rows.map((r) => [Number(r[0]).toLocaleString(), Number(r[1]).toLocaleString(), r[2] + " KB", r[3] + " KB", r[4], r[5], r[6]]),
  [1100, 1300, 1500, 1700, 1300, 1700, CW - 8600], { centerCols: true }));
add(fig("q6_chart", "Figure Q6.7 - memory and query time (log scales)", 640));
add(B("The trie query time does **not grow with the number of names** (a 3-letter prefix = 3 steps), while the linear scan grows in direct proportion (7.8 -> ~80 -> ~770 us for 10x more names each step)."));
add(B(`The price is memory: for 5,000 names the trie takes ${q6rows[1][2]} KB versus ${q6rows[1][3]} KB for a sorted array - about ${(q6rows[1][2] / q6rows[1][3]).toFixed(0)} times more.`));
add(P("*Note:* the names are generated by a deterministic syllable generator (`make_name`) because the assignment supplies no data; the code reads any list of lowercase words.", { size: 20, color: GREY }));
add(H2("6.4  Design and analysis (tasks 65 - 68)"));
add(H3("65.  Time depends on the word length, not on the number of words"));
add(P("Each letter moves exactly one level down by indexing `child[c - 'a']` - no comparison with other words. A word of m letters costs at most m steps whether the trie holds 500 or 5,000,000 words: O(m). The measured prefix query stays at about 0.02 us for 500, 5,000 and 50,000 names."));
add(H3("66.  Memory of a 26-pointer trie"));
add(P("One node = 26 x 8 + 8 = 216 bytes. In the worst case a trie needs one node per letter of every word: nodes <= 1 + (total letters). Prefix sharing reduces this only where words share prefixes. Most nodes in the lower levels have a single child, so about 25 of 26 pointers are wasted: 12,063 nodes x 216 B = 2.5 MB for just 5,000 six-letter names, and 220 MB for 200,000 words in Q7."));
add(H3("67.  Trie vs sorted array vs BST of strings"));
add(table(["", "Trie", "Sorted array + binary search", "BST of strings"], [
  ["Exact search", "O(m)", "O(m log n) (string compares)", "O(m h)"],
  ["Prefix count / list", "O(m) / O(m + k)", "O(m log n) with two binary searches", "O(m h + k) if balanced"],
  ["Insert", "O(m)", "O(n) shifting", "O(m h)"],
  ["Memory", "very high (216 B per node)", "lowest (pointer + text)", "medium (2 pointers per word)"],
  ["Alphabetical listing", "natural (DFS a..z)", "natural", "inorder"],
], [2200, 2200, 3000, CW - 7400]));
add(H3("68.  Compressed trie (radix tree)"));
add(P("A radix tree merges every chain of single-child nodes into one edge labelled with a substring (e.g. `ni` + `tha` instead of 4 nodes). Nodes then number at most 2n - 1 for n words instead of one per letter, and children are stored in a small list instead of 26 slots, so memory falls from hundreds of bytes per word to a few tens."));
add(H2("6.5  Conclusion"));
add(callout("Would I use a trie on a phone with limited memory?", [
  "**Not the plain 26-pointer trie.** For 5,000 contacts it needs 2.5 MB against 73 KB for a sorted array, about 35x more, and the speed gain is not needed: even the linear scan took ~80 us per key press, far below the 16 ms of one screen frame - so the reported lag probably comes from something other than the search (for example redrawing the list).",
  "I would use a **compact structure**: a sorted array with two binary searches for a few thousand contacts (smallest, fast enough), or a radix tree / ternary search tree (Q7) if the list grows to hundreds of thousands. A trie remains the right *idea* when the prefix queries must be independent of the number of entries."], TEAL, LTEAL));
add(H2("6.6  Alternative concept  -  sorted array and two binary searches"));
add(table(["Aspect", "Trie", "Sorted array (first and last match)"], [
  ["Time per prefix query", "O(m)", "O(m log n): two binary searches, each step compares up to m characters"],
  ["Add a contact", "O(m)", "O(n) - shift on average n/2 entries"],
  ["Memory", "216 bytes per node (2.5 MB for 5,000 names)", "8-byte pointer + text (73 KB)"],
  ["Count of matches", "stored in the node: O(1) after O(m)", "index difference last - first + 1"],
  ["Best choice when", "huge, frequently changing word lists", "small, mostly static lists on small devices"],
], [2600, 3400, CW - 6000]));

// ================================================================== Q7
add(H1(7, "Choosing the Tree Structure from First Principles", 10));
add(callout("Problem snapshot", "A language-learning app needs a 200,000-word dictionary on a phone with: exact look-up, spell-check suggestions for typing errors, autocomplete as the user types, and an alphabetical listing between two words. Updated weekly. No design is given - it must be derived from the requirements.", ORANGE, LORANGE));
add(callout("Data used", "No word list is provided with the assignment, so `tools/gen_words.py` generates 200,000 unique lowercase words from Tamil-style transliterated syllables and common endings (`Q7_Dictionary/words_200k.txt`; the first 1,000 form `sample_1000.txt`). The code reads any list of lowercase words - replace the file with a real dictionary to repeat the experiment.", GREY, "F8FAFC"));
add(H2("Stage 1  -  Interpret the problem (2 marks)"));
add(H3("73.  Operations and how often they happen"));
add(table(["Operation", "Trigger", "Estimated frequency (assumption)", "Latency need"], [
  ["Exact look-up", "spell-check of every word typed or read", "very high: several per second per active user", "< 1 ms"],
  ["Autocomplete", "each key press", "high: 3 - 6 per second while typing", "< 16 ms (one frame)"],
  ["Spell suggestion", "word not found in the dictionary", "medium: only for mistyped words", "< 50 ms"],
  ["Alphabetical range listing", "user browses 'words from X to Y'", "low", "< 100 ms for a page of results"],
  ["Update", "weekly dictionary release", "once a week (thousands of words)", "seconds are acceptable; must not block the UI"],
], [2200, 2700, 2800, CW - 7700]));
add(H3("74.  Constraints"));
add(B("**Memory:** runs on a phone beside other apps - budget about 30 MB for the dictionary (assumption)."));
add(B("**Response time:** interactive; per key press at most one frame (16 ms)."));
add(B("**Update frequency:** weekly bulk update, so an incremental insert is an advantage but not essential. **Reads dominate** writes by many orders of magnitude."));
add(H3("75.  Measurable requirements"));
add(table(["ID", "Requirement", "Target"], [
  ["R1", "Exact look-up time", "<= 1 us average"],
  ["R2", "Autocomplete (top 10 words for a 2-3 letter prefix)", "<= 1 ms (target is far below one frame)"],
  ["R3", "Range listing of 50 words", "<= 100 us"],
  ["R4", "Spell suggestions (edit distance 1)", "<= 1 ms"],
  ["R5", "Memory for 200,000 words", "<= 30 MB (about 150 bytes per word)"],
  ["R6", "Weekly update of 5,000 new words", "<= 1 s, without rebuilding everything"],
  ["R7", "Correctness on a 1,000-word sample", "all tests identical to a brute-force reference"],
], [700, 5000, CW - 5700]));
add(H2("Stage 2  -  Compare candidate structures (3 marks)"));
add(P("n = 200,000 words, m = length of a word (about 8 letters), k = number of results, sigma = alphabet size. String comparisons cost up to m characters, so comparison-based trees pay an extra factor m."));
add(table(["Operation", "BST (balanced) / AVL / red-black", "B-tree", "Trie (26 pointers)", "Ternary search tree"], [
  ["Exact look-up", "O(m log n)", "O(m log n)", "O(m)", "O(m + log sigma) per level, about O(m log sigma)"],
  ["Autocomplete (prefix)", "find first match O(m log n), then inorder O(k)", "same, leaf scan", "O(m + k)", "O(m + k) in alphabetical order"],
  ["Alphabetical range", "O(m log n + k)", "O(m log n + k) - B+ tree best", "O(m + k) with ordered DFS", "O(m + k) with pruned in-order traversal"],
  ["Spell suggestions (edit distance 1, about 450 candidate look-ups)", "450 x O(m log n)", "same", "450 x O(m)", "450 x O(m) - measured 44.5 us"],
  ["Insert", "O(m log n) + rotations", "O(m log n), block splits", "O(m)", "O(m)"],
  ["Space", "n nodes x (string + 2 pointers + balance)", "n keys + 50% slack per node", "**26 pointers per node: 1,155 B/word measured**", "**one 16-byte node per letter: 85.6 B/word measured**"],
  ["Ordered listing", "inorder", "leaf chain", "DFS a..z", "inorder-like traversal"],
], [1900, 2000, 1600, 2100, CW - 7600]));
add(H3("78.  Which structure (or combination) fits best?"));
add(B("**BST / AVL / red-black tree:** correct, but each step compares whole strings (m characters) and each word costs a separate allocated string - slower and heavier than needed."));
add(B("**B-tree:** designed to minimise disk reads; the dictionary fits in memory, so its advantage disappears."));
add(B("**26-pointer trie:** fastest in theory (O(m)) but 1,155 bytes per word - **220 MB, over the 30 MB budget** (R5 fails)."));
add(B("**Ternary search tree (TST):** a trie whose children are stored as a *binary search tree of letters* (lo / eq / hi), so each node needs only 3 links instead of 26. It keeps the prefix-sharing and O(m) behaviour of a trie, gives alphabetical order, and with 32-bit indices a node is only 16 bytes."));
add(callout("Chosen design", "**A ternary search tree built in a compact array pool (32-bit indices), with a sorted array only used as the verification reference.** One structure serves all four operations plus incremental weekly updates, and fits the memory budget.", TEAL, LTEAL));
add(fig("q7_tst", "Figure Q7.1 - ternary search tree: red dashed = lo, green solid = eq (next letter), blue dashed = hi", 560));
add(H2("Stage 3  -  Implement and verify (3 marks)"));
add(P("`q7_dictionary.c` implements the TST (`tst_insert`, `tst_lookup`), autocomplete (in-order collection below the prefix node), the alphabetical range `[lo, hi]` (in-order traversal with pruning), spell suggestions (deletion, transposition, substitution and insertion candidates checked with `tst_lookup`), a sorted-array baseline and a counter for the node count of the 26-pointer trie."));
add(shot("Q7_Dictionary", "01_verification_1000_words", "Figure Q7.2 - verification on the 1,000-word sample against brute-force references (compiled with AddressSanitizer + UBSan)"));
add(table(["Test (80)", "What was compared", "Result"], [
  ["1", "look-up of all 1,000 stored words", "1000 found, 0 missing"],
  ["2", "2,000 mistyped words: TST vs binary search", "2000 / 2000 agree"],
  ["3", "300 random prefixes, first 100 results", "identical lists in 300 / 300"],
  ["4", "300 random ranges [a, b], up to 5,000 results", "identical lists in 300 / 300"],
  ["5", "500 words with one wrong letter: correct word among suggestions", "500 / 500"],
], [1200, 5800, CW - 7000]));
add(shot("Q7_Dictionary", "02_demo_operations", "Figure Q7.3 - the four operations on the sample"));
add(shot("Q7_Dictionary", "03_measurements_200k_part1", "Figure Q7.4 - measurements for 200,000 words (part 1)"));
add(shot("Q7_Dictionary", "03_measurements_200k_part2", "Figure Q7.5 - measurements for 200,000 words (part 2)"));
add(table(["Measurement (200,000 words)", "26-pointer trie", "Ternary search tree", "Sorted array"], [
  ["Nodes / entries", Number(q7.nodes[1]).toLocaleString(), Number(q7.nodes[2]).toLocaleString(), Number(q7.nodes[3]).toLocaleString()],
  ["Memory", q7.mem[1] + " MB", { t: q7.mem[2] + " MB", bold: true, color: TEAL }, q7.mem[3] + " MB"],
  ["Bytes per word", q7.bpw[1], q7.bpw[2], q7.bpw[3]],
  ["Exact look-up (ns)", "-", q7.lk[1], q7.lk[2]],
  ["Autocomplete, top 10 (us)", "-", q7.au[1], q7.au[2]],
  ["Range of 51 words (us)", "-", q7.rg[1], q7.rg[2]],
  ["Spell suggestions, distance 1 (us)", "-", q7.sg[1], q7.sg[2]],
  ["Add 5,000 new words (ms)", "-", q7.up[1], q7.up[2] + " (full re-sort)"],
], [3500, 2000, 2200, CW - 7700], { centerCols: true }));
add(fig("q7_chart", "Figure Q7.6 - memory and relative speed of the chosen TST", 660));
add(H2("Stage 4  -  Defend the design (2 marks)"));
add(H3("82.  Justification using the measurements"));
add(table(["Requirement", "Target", "Measured (TST)", "Met?"], [
  ["R1 look-up", "<= 1 us", `${q7.lk[1]} ns`, { t: "yes", color: "15803D", bold: true }],
  ["R2 autocomplete", "<= 1 ms", `${q7.au[1]} us`, { t: "yes", color: "15803D", bold: true }],
  ["R3 range of 50", "<= 100 us", `${q7.rg[1]} us`, { t: "yes", color: "15803D", bold: true }],
  ["R4 spell suggestions", "<= 1 ms", `${q7.sg[1]} us`, { t: "yes", color: "15803D", bold: true }],
  ["R5 memory", "<= 30 MB", `${q7.mem[2]} MB (26-pointer trie: ${q7.mem[1]} MB)`, { t: "yes", color: "15803D", bold: true }],
  ["R6 weekly update", "<= 1 s", `${q7.up[1]} ms for 5,000 words`, { t: "yes", color: "15803D", bold: true }],
  ["R7 correctness", "identical to reference", "all five suites pass", { t: "yes", color: "15803D", bold: true }],
], [2200, 1700, 4600, CW - 8500]));
add(callout("An honest comparison with the sorted array", [
  `The measurements do **not** show the TST winning everywhere. The sorted array is ${(q7.mem[2] / q7.mem[3]).toFixed(1)}x smaller, its autocomplete is ${(q7.au[1] / q7.au[2]).toFixed(1)}x faster and its range listing is ${(q7.rg[1] / q7.rg[2]).toFixed(0)}x faster (a contiguous scan). The TST wins on **spell suggestions** (${(q7.sg[2] / q7.sg[1]).toFixed(1)}x faster: each of the ~450 candidate look-ups walks one tree path) and on **updates** (${q7.up[1]} ms to add 5,000 words versus ${q7.up[2]} ms to re-sort, ${(q7.up[2] / q7.up[1]).toFixed(0)}x faster).`,
  "I still choose the TST because it is the single structure that meets *all* seven requirements, supports incremental updates, and keeps look-up and spell-check - the operations used most - fastest. If the dictionary were read-only and memory were the only concern, the sorted array would be the best choice; that combination is analysed below."], ORANGE, LORANGE));
add(H3("83.  If the dictionary grew to 2 million words"));
add(P(`Memory scales linearly: the program projects **${q7.proj[1]} MB** for the TST (26-pointer trie: ${q7.proj[3]} MB, sorted array: ${q7.proj[2]} MB). That exceeds the phone budget, so I would (1) compress shared suffixes by building a **DAWG / finite-state transducer** (typically 3 - 10x smaller for natural-language word lists), or merge chains into a radix tree; (2) keep a sorted, front-coded array in a memory-mapped file for range listing; and (3) keep only the hot 100,000 words in the TST. A B+ tree becomes attractive if the data must live on flash storage.`));
add(H3("84.  Remaining limitation"));
add(P("Spell suggestions cover **edit distance 1** only; distance 2 needs about 450^2 candidates (or a Levenshtein-automaton walk of the tree). The TST also has no word-frequency ranking (autocomplete returns alphabetical, not most-likely, words), and its shape depends on insertion order - words must be inserted in shuffled order, as done here, or the tree degrades (the sorted-input problem of Q1 again, within each letter level)."));
add(H2("Alternative concept  -  hash table for look-up + sorted array for range and autocomplete"));
add(table(["Operation", "Hash table + sorted array", "Chosen: ternary search tree"], [
  ["Exact look-up", "hash table: O(m) expected (estimated 100 - 200 ns, not measured)", `TST: O(m), measured ${q7.lk[1]} ns (similar)`],
  ["Autocomplete", "sorted array: two binary searches + scan, measured " + q7.au[2] + " us", `TST ${q7.au[1]} us`],
  ["Range listing", "sorted array: contiguous scan, measured " + q7.rg[2] + " us (12x faster)", `TST ${q7.rg[1]} us`],
  ["Spell suggestion", "450 hash look-ups: expected faster than " + q7.sg[2] + " us (binary-search version)", `TST ${q7.sg[1]} us`],
  ["Memory", `array ${q7.mem[3]} MB + hash table (estimated 12 - 16 MB for 200,000 entries incl. load factor) = about 15 - 19 MB (estimate)`, `TST ${q7.mem[2]} MB`],
  ["Weekly update", `rebuild/re-sort the array (${q7.up[2]} ms) **and** insert into the hash table - two structures must be kept consistent (cost of both, plus the risk of an inconsistency bug)`, `one incremental insert, ${q7.up[1]} ms`],
], [1900, 4500, CW - 6400]));
add(P("**Verdict:** the hash + array combination is a strong rival - faster for range listing and no larger once the hash table is counted - and is the better choice if the dictionary is rebuilt wholesale each week. The TST is chosen when a single structure with incremental updates and fast fuzzy matching is wanted; both solutions meet every measurable requirement."));

// ================================================================== SUBMISSION
add(new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1, keepNext: true, shading: { type: ShadingType.CLEAR, fill: NAVY, color: "auto" },
  spacing: { before: 0, after: 160, line: 400 }, indent: { left: 120, right: 120 }, children: [new TextRun({ text: "  Submission Checklist and Viva Preparation", color: "FFFFFF", bold: true, size: 34, font: FONT })] }));
add(table(["Requirement", "Status", "Where"], [
  ["GitHub repository link (mandatory) with executed code, input files, output screenshots and README.md", "ready to upload", "this folder `DS_Assignment3_CO3/`"],
  ["Report with evidence for Q1 - Q7 (item 85)", "done", "this document"],
  ["C source code for all questions (item 86)", "done - 16 programs, all compile warning-free with -Wall -Wextra", "`Qx/*.c`"],
  ["Trees after each operation, predictions, outputs and timings (item 87)", "done", "figures, `Qx/output`, `Qx/screenshots`"],
  ["Both predict-the-output programs + both complete-the-code programs of Q1, Q2, Q6", "done", "Q1, Q2, Q6"],
  ["Student name, register number, faculty, dates", { t: "**fill in on the cover page**", color: RED }, "page 1"],
], [5000, 2600, CW - 7600]));
add(H2("Likely viva questions", ORANGE));
const viva = [
  ["Q1", "Why did the library's searches slow down? Walk through deleting a node with two children and explain why the inorder successor has no left child."],
  ["Q2", "Show the rotation sequence for inserting 25 into 20(10, 40(30, 50)). Why does LR/RL need two rotations?"],
  ["Q3", "Why 4 disk reads for 5 million keys? What happens when the root of a B-tree splits?"],
  ["Q4", "Prove h <= 2 log2(n+1). Why is a recolouring-only fix possible when the uncle is red?"],
  ["Q5", "What is a zig-zig and why is the parent rotated first? Show an input where a single access costs O(n)."],
  ["Q6", "Why does a trie lookup not depend on the number of words? Where do the 216 bytes per node come from?"],
  ["Q7", "Why a ternary search tree and not a 26-pointer trie? Where does your design lose to a sorted array, and what would you change at 2 million words?"],
];
add(table(["Q", "Question you should be able to answer"], viva, [700, CW - 700]));
add(GAP(100), callout("Honest note about the screenshots", "The screenshots are VS Code (Dark+) style renderings generated by `tools/make_screens.py`. The source code shown is the real file and the terminal text is the real, unedited output of compiling and running it. If your faculty requires native screenshots, open the `.c` file in VS Code, run the commands in the terminal panel (they are shown in every screenshot) and capture your own - the output will be the same.", GREY, "F8FAFC"));

// ------------------------------------------------------------------ document
const doc = new Document({
  creator: "Data Structures Assignment 3", title: "Optimized Data Storage and Retrieval Using Tree-Based Structures",
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 34, bold: true, color: "FFFFFF" }, paragraph: { spacing: { before: 0, after: 160 }, keepNext: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 27, bold: true, color: TEAL }, paragraph: { spacing: { before: 220, after: 90 }, keepNext: true, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 23, bold: true, color: ORANGE }, paragraph: { spacing: { before: 150, after: 60 }, keepNext: true, outlineLevel: 2 } },
    ],
  },
  numbering: { config: [
    { reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u25CF", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } }, run: { color: TEAL, size: 18 } } },
      { level: 1, format: LevelFormat.BULLET, text: "\u25CB", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1000, hanging: 270 } } } }] },
    { reference: "num", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: 1100, bottom: 1000, left: MARGIN, right: MARGIN } } },
    headers: { default: new Header({ children: [new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: CW }], border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1", space: 4 } },
      children: [new TextRun({ text: "SIMATS ENGINEERING  |  Data Structures  |  Assignment 3 - CO3", size: 18, color: GREY, font: FONT }), new TextRun({ text: "\tTree-Based Structures", size: 18, color: TEAL, bold: true, font: FONT })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: CW }], border: { top: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1", space: 4 } },
      children: [new TextRun({ text: "Individual assignment  -  all outputs produced by the C code in the repository", size: 17, color: GREY, font: FONT }),
        new TextRun({ children: ["\tPage ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], size: 18, color: GREY, font: FONT })] })] }) },
    children: kids,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  const out = path.join(ROOT, "Report", "Data_Structures_Assignment3_Report.docx");
  fs.writeFileSync(out, buf);
  console.log("written", out, (buf.length / 1048576).toFixed(1) + " MB");
});
