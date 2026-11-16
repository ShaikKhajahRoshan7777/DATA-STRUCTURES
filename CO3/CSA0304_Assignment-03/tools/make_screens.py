#!/usr/bin/env python3
"""
make_screens.py - runs every C program for real, saves the exact output to <Q>/output/*.txt and
renders a VS Code (Dark+) style window of the source code + integrated terminal into <Q>/screenshots/*.png.

The image is a rendering of REAL program output. To take native screenshots instead, open the .c file
in VS Code, run the commands shown in the terminal panel and press the screenshot key.
Usage:  python3 tools/make_screens.py            (all)      python3 tools/make_screens.py Q6   (one folder)
"""
import os, re, subprocess, sys
from PIL import Image, ImageDraw, ImageFont
from pygments.lexers import CLexer
from pygments.token import Token

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UI = "/usr/share/fonts/opentype/inter/Inter-Regular.otf"
UIB = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
MONOB = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"

W = 1280
ACT_W, SIDE_W = 48, 252
TITLE_H, TAB_H, ROW = 30, 36, 22
CODE_FS = 15
f_code = ImageFont.truetype(MONO, CODE_FS)
f_codeb = ImageFont.truetype(MONOB, CODE_FS)
f_ui = ImageFont.truetype(UI, 13)
f_uib = ImageFont.truetype(UIB, 11)
f_ui12 = ImageFont.truetype(UI, 12)
f_ui14 = ImageFont.truetype(UI, 14)
CW = f_code.getlength("M")

C = dict(bg="#1e1e1e", side="#252526", act="#333333", title="#3c3c3c", tab_off="#2d2d2d", border="#2b2b2b",
         fg="#d4d4d4", ln="#858585", ln_act="#c6c6c6", sel="#37373d", hl="#282828")

# --------------------------------------------------------------------------- syntax highlighting
CONTROL = {"if", "else", "for", "while", "return", "break", "continue", "do", "switch", "case", "default", "goto"}


def tokenize(code):
    typedefs = set(re.findall(r"\}\s*(\w+)\s*;", code)) | {"FILE", "size_t"}
    toks = list(CLexer().get_tokens(code))
    lines, cur = [], []
    for idx, (tt, val) in enumerate(toks):
        # next significant char (for function-call colouring)
        nxt = ""
        for t2, v2 in toks[idx + 1:idx + 4]:
            s = v2.strip()
            if s:
                nxt = s[0]
                break
        if tt in Token.Comment.Preproc and not str(tt).endswith("PreprocFile"):
            col = "#c586c0"
        elif "PreprocFile" in str(tt):
            col = "#ce9178"
        elif tt in Token.Comment:
            col = "#6a9955"
        elif tt in Token.Keyword.Type:
            col = "#569cd6"
        elif tt in Token.Keyword:
            col = "#c586c0" if val in CONTROL else "#569cd6"
        elif tt in Token.String:
            col = "#d7ba7d" if "Escape" in str(tt) else "#ce9178"
        elif tt in Token.Number:
            col = "#b5cea8"
        elif tt in Token.Name:
            if val in typedefs:
                col = "#4ec9b0"
            elif tt in Token.Name.Function or nxt == "(":
                col = "#dcdcaa"
            elif val.isupper() and len(val) > 1 or val in ("NULL", "stderr"):
                col = "#4fc1ff"
            else:
                col = "#9cdcfe"
        else:
            col = "#d4d4d4"
        parts = val.split("\n")
        for pi, part in enumerate(parts):
            if pi > 0:
                lines.append(cur)
                cur = []
            if part:
                cur.append((part.replace("\t", "    "), col))
    if cur:
        lines.append(cur)
    return lines


# --------------------------------------------------------------------------- drawing helpers
def activity_bar(d, h):
    d.rectangle([0, TITLE_H, ACT_W, h], fill=C["act"])
    cx, y = ACT_W // 2, TITLE_H + 24
    col = "#d7d7d7"
    # explorer (active)
    d.rectangle([0, y - 20, 2, y + 20], fill="#ffffff")
    d.rectangle([cx - 9, y - 11, cx + 3, y + 7], outline=col, width=2)
    d.rectangle([cx - 3, y - 6, cx + 9, y + 12], outline=col, width=2, fill=C["act"])
    # search
    y += 48; col = "#858585"
    d.ellipse([cx - 4, y - 11, cx + 9, y + 2], outline=col, width=2)
    d.line([cx - 3, y + 1, cx - 10, y + 10], fill=col, width=3)
    # source control with badge
    y += 48
    d.ellipse([cx - 11, y - 11, cx - 5, y - 5], outline=col, width=2)
    d.ellipse([cx - 11, y + 5, cx - 5, y + 11], outline=col, width=2)
    d.ellipse([cx + 3, y - 3, cx + 9, y + 3], outline=col, width=2)
    d.line([cx - 8, y - 5, cx - 8, y + 5], fill=col, width=2)
    d.line([cx - 8, y, cx + 3, y], fill=col, width=2)
    d.ellipse([cx + 3, y + 3, cx + 23, y + 23], fill="#007acc")
    d.text((cx + 13, y + 13), "4", font=ImageFont.truetype(UIB, 10), fill="#ffffff", anchor="mm")
    # run & debug
    y += 48
    d.polygon([(cx - 5, y - 11), (cx - 5, y + 9), (cx + 10, y - 1)], outline=col)
    d.ellipse([cx - 14, y + 2, cx - 6, y + 12], outline=col, width=2)
    # extensions
    y += 48
    for dx, dy in [(-10, -10), (2, -10), (-10, 2)]:
        d.rectangle([cx + dx, y + dy, cx + dx + 9, y + dy + 9], outline=col, width=2)
    d.rectangle([cx + 6, y - 14, cx + 15, y - 5], outline=col, width=2)
    # bottom: account + settings
    yb = h - 90
    d.ellipse([cx - 11, yb - 11, cx + 11, yb + 11], outline=col, width=2)
    d.ellipse([cx - 4, yb - 8, cx + 4, yb], outline=col, width=2)
    d.arc([cx - 8, yb - 1, cx + 8, yb + 14], 200, 340, fill=col, width=2)
    yb += 46
    d.ellipse([cx - 10, yb - 10, cx + 10, yb + 10], outline=col, width=2)
    d.ellipse([cx - 4, yb - 4, cx + 4, yb + 4], outline=col, width=2)


def chevron(d, x, y, down, col="#c5c5c5"):
    if down:
        d.line([x - 4, y - 2, x, y + 2, x + 4, y - 2], fill=col, width=2)
    else:
        d.line([x - 2, y - 4, x + 2, y, x - 2, y + 4], fill=col, width=2)


def file_icon(d, x, y, name):
    ext = os.path.splitext(name)[1]
    if ext == ".c":
        d.text((x, y), "C", font=ImageFont.truetype(UIB, 12), fill="#599eff", anchor="lm")
    elif ext == ".md":
        d.text((x, y), "ⓘ", font=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12), fill="#519aba", anchor="lm")
    else:
        d.text((x, y), "≡", font=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13), fill="#9a9a9a", anchor="lm")


def sidebar(d, h, folder, cur, siblings, others):
    x0 = ACT_W
    d.rectangle([x0, TITLE_H, x0 + SIDE_W, h], fill=C["side"])
    d.text((x0 + 22, TITLE_H + 22), "EXPLORER", font=f_ui12, fill="#bbbbbb", anchor="lm")
    d.text((x0 + SIDE_W - 20, TITLE_H + 21), "···", font=f_ui14, fill="#c5c5c5", anchor="rm")
    y = TITLE_H + 44
    # open editors
    chevron(d, x0 + 12, y + 11, False)
    d.text((x0 + 24, y + 11), "OPEN EDITORS", font=f_uib, fill="#cccccc", anchor="lm")
    y += 22
    chevron(d, x0 + 12, y + 11, True)
    d.text((x0 + 24, y + 11), "DS_ASSIGNMENT3_CO3", font=f_uib, fill="#cccccc", anchor="lm")
    y += 22
    # sibling folders
    for o in others:
        if o == folder:
            chevron(d, x0 + 24, y + 11, True)
            d.text((x0 + 38, y + 11), o, font=f_ui, fill="#cccccc", anchor="lm")
            y += 22
            for fn in siblings:
                if fn == cur:
                    d.rectangle([x0, y, x0 + SIDE_W, y + 21], fill=C["sel"])
                file_icon(d, x0 + 50, y + 11, fn)
                d.text((x0 + 66, y + 11), fn, font=f_ui, fill="#ffffff" if fn == cur else "#cccccc", anchor="lm")
                y += 22
        else:
            chevron(d, x0 + 24, y + 11, False)
            d.text((x0 + 38, y + 11), o, font=f_ui, fill="#cccccc", anchor="lm")
            y += 22
    chevron(d, x0 + 12, h - 24 - 11, False)
    d.line([x0, h - 46, x0 + SIDE_W, h - 46], fill="#3c3c3c")
    d.text((x0 + 24, h - 35), "OUTLINE", font=f_uib, fill="#cccccc", anchor="lm")
    d.text((x0 + 24, h - 13), "TIMELINE", font=f_uib, fill="#cccccc", anchor="lm")


def render(shot, code, first, nlines, hl_line, term_rows, folder, siblings, others, name):
    editor_h = nlines * ROW + 14
    panel_rows = max(len(term_rows), 7)
    term_h = panel_rows * ROW + 16
    PANEL_H = 36
    H = TITLE_H + TAB_H + editor_h + PANEL_H + term_h
    img = Image.new("RGB", (W, H), C["bg"])
    d = ImageDraw.Draw(img)
    # title bar
    d.rectangle([0, 0, W, TITLE_H], fill=C["title"])
    d.text((W // 2, TITLE_H // 2), f"{name} - VS Code", font=f_ui, fill="#cccccc", anchor="mm")
    activity_bar(d, H)
    sidebar(d, H, folder, name, siblings, others)
    ex = ACT_W + SIDE_W
    # tab bar
    d.rectangle([ex, TITLE_H, W, TITLE_H + TAB_H], fill=C["side"])
    tab_w = int(f_ui14.getlength(name) + 70)
    d.rectangle([ex, TITLE_H, ex + tab_w, TITLE_H + TAB_H], fill=C["bg"])
    d.line([ex, TITLE_H, ex + tab_w, TITLE_H], fill="#007acc", width=1)
    d.text((ex + 14, TITLE_H + TAB_H // 2), "C", font=ImageFont.truetype(UIB, 13), fill="#599eff", anchor="lm")
    d.text((ex + 32, TITLE_H + TAB_H // 2), name, font=f_ui14, fill="#ffffff", anchor="lm")
    xx = ex + tab_w - 18
    d.line([xx - 4, TITLE_H + 14, xx + 4, TITLE_H + 22], fill="#cccccc", width=2)
    d.line([xx - 4, TITLE_H + 22, xx + 4, TITLE_H + 14], fill="#cccccc", width=2)
    # editor
    ey = TITLE_H + TAB_H
    d.rectangle([ex, ey, W, ey + editor_h], fill=C["bg"])
    gutter = 70
    lines = tokenize(code)
    for i in range(nlines):
        ln = first + i
        if ln > len(lines):
            break
        y = ey + 8 + i * ROW
        if ln == hl_line:
            d.rectangle([ex + gutter - 8, y - 1, W - 2, y + ROW - 2], fill=C["hl"], outline="#303030")
        d.text((ex + gutter - 22, y + 10), str(ln), font=f_code, fill=C["ln_act"] if ln == hl_line else C["ln"], anchor="rm")
        col = 0
        raw = "".join(t for t, _ in lines[ln - 1]) if lines[ln - 1] else ""
        lead = len(raw) - len(raw.lstrip(" "))
        for k in range(4, lead, 4):          # indent guides
            gx = ex + gutter + k * CW - 2
            d.line([gx, y - 1, gx, y + ROW - 2], fill="#404040")
        for text, colr in lines[ln - 1]:
            x = ex + gutter + col * CW
            if x > W - 10:
                break
            d.text((x, y + 10), text, font=f_code, fill=colr, anchor="lm")
            col += len(text)
    # panel header
    py = ey + editor_h
    d.line([ex, py, W, py], fill="#3c3c3c")
    labels = ["PROBLEMS", "OUTPUT", "DEBUG CONSOLE", "TERMINAL", "PORTS"]
    x = ex + 22
    for lb in labels:
        fcol = "#e7e7e7" if lb == "TERMINAL" else "#9d9d9d"
        d.text((x, py + 19), lb, font=f_ui12, fill=fcol, anchor="lm")
        w = f_ui12.getlength(lb)
        if lb == "TERMINAL":
            d.line([x, py + 31, x + w, py + 31], fill="#e7e7e7", width=1)
        x += w + 26
    # right side of panel header
    rx = W - 20
    d.text((rx, py + 19), "✕", font=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11), fill="#c5c5c5", anchor="rm")
    d.text((rx - 26, py + 19), "⌃", font=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13), fill="#c5c5c5", anchor="rm")
    d.text((rx - 52, py + 19), "···", font=f_ui14, fill="#c5c5c5", anchor="rm")
    d.text((rx - 84, py + 19), "⌄", font=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12), fill="#c5c5c5", anchor="rm")
    d.text((rx - 104, py + 19), "+", font=ImageFont.truetype(UI, 18), fill="#c5c5c5", anchor="rm")
    d.text((rx - 126, py + 19), "bash", font=f_ui12, fill="#cccccc", anchor="rm")
    d.rectangle([rx - 178, py + 12, rx - 162, py + 26], outline="#c5c5c5", width=1)
    d.text((rx - 170, py + 19), ">", font=f_uib, fill="#c5c5c5", anchor="mm")
    # terminal
    ty = py + PANEL_H
    d.rectangle([ex, ty, W, H], fill=C["bg"])
    for i, row in enumerate(term_rows):
        y = ty + 10 + i * ROW
        col = 0
        for text, colr, bold in row:
            d.text((ex + 22 + col * CW, y + 10), text, font=f_codeb if bold else f_code, fill=colr, anchor="lm")
            col += len(text)
        if row and row[-1][0] == "\u2588":      # cursor block
            pass
    return img


# --------------------------------------------------------------------------- terminal model
USER = "student@ubuntu"


def prompt_segments(folder):
    return [(USER, "#4ae34a", True), (":", "#d4d4d4", False), (f"~/DS_Assignment3_CO3/{folder}", "#5c9cf5", True), ("$ ", "#d4d4d4", False)]


def wrap(s, width):
    if len(s) <= width:
        return [s]
    out = []
    while len(s) > width:
        cut = s.rfind(" ", 0, width)
        if cut <= 0:
            cut = width
        out.append(s[:cut])
        s = s[cut:].lstrip(" ") if cut != width else s[cut:]
    out.append(s)
    return out


def build_term(folder, cmds, output, width):
    rows = []
    plen = len(USER) + 1 + len(f"~/DS_Assignment3_CO3/{folder}") + 2
    for c in cmds:
        first = c[: width - plen]
        rows.append(prompt_segments(folder) + [(first, "#d4d4d4", False)])
        rest = c[width - plen:]
        while rest:
            rows.append([(rest[:width], "#d4d4d4", False)])
            rest = rest[width:]
    for line in output.rstrip("\n").split("\n"):
        for piece in wrap(line, width):
            rows.append([(piece, "#cccccc", False)])
    rows.append(prompt_segments(folder) + [("\u2588", "#cccccc", False)])
    return rows


# --------------------------------------------------------------------------- shot definitions
def sec(n):
    return rf"static void section{n}\(void\)"


def S(folder, name, src, cmds, run, anchor, off=-1, nl=15, hl=None, prefix=""):
    return dict(folder=folder, name=name, src=src, cmds=cmds, run=run, anchor=anchor, off=off, nl=nl, hl=hl, prefix=prefix)


GCC = "gcc -Wall -Wextra -g -fsanitize=address,undefined"
SHOTS = [
    # ---- Q1
    S("Q1_BST", "01_predict_array_tree", "q1_predict_array_tree.c",
      ["gcc -Wall -Wextra q1_predict_array_tree.c -o q1_predict_array_tree"], "./q1_predict_array_tree", r"int main", -1, 14, r"return 0;"),
    S("Q1_BST", "02_predict_bst_delete", "q1_predict_bst_delete.c",
      ["gcc -Wall -Wextra q1_predict_bst_delete.c -o q1_predict_bst_delete"], "./q1_predict_bst_delete", r"int main", -1, 16, r"pre\(t\);"),
    S("Q1_BST", "03_complete_code", "q1_complete_code.c",
      ["gcc -Wall -Wextra -g -fsanitize=address q1_complete_code.c -o q1_complete_code"], "./q1_complete_code", r"Book \*insert", -1, 22, r"return -1"),
    S("Q1_BST", "04_bst_basic_traversals", "q1_bst_full.c",
      [f"{GCC} q1_bst_full.c -o q1_bst_full"], "./q1_bst_full 1", sec(1), -1, 17, r"build_demo"),
    S("Q1_BST", "05_bst_delete_three_cases", "q1_bst_full.c", [], "./q1_bst_full 2", sec(2), -1, 17, r"delete_key\(t, del"),
    S("Q1_BST", "06_bst_save_rebuild", "q1_bst_full.c", [], "./q1_bst_full 3", sec(3), -1, 17, r"save_tree"),
    S("Q1_BST", "07_bst_empty_duplicates", "q1_bst_full.c", [], "./q1_bst_full 4", sec(4), -1, 17, r"int keys\[\] = \{40"),
    S("Q1_BST", "08_bst_experiment_2000", "q1_bst_full.c", [], "./q1_bst_full 5", sec(5), -1, 17, r"avg comparisons"),
    # ---- Q2
    S("Q2_AVL", "01_complete_code", "q2_complete_code.c",
      ["gcc -Wall -Wextra -g -fsanitize=address q2_complete_code.c -o q2_complete_code"], "./q2_complete_code", r"Node \*rotate_right", -1, 22, r"return y;"),
    S("Q2_AVL", "02_avl_trace", "q2_avl_full.c",
      ["gcc -Wall -Wextra -O2 q2_avl_full.c -o q2_avl_full -lm"], "./q2_avl_full 1", r"static void trace", -1, 17, r"avl_insert\(root"),
    S("Q2_AVL", "03_avl_experiments", "q2_avl_full.c", [], "./q2_avl_full 2", r"static void experiments", -1, 17, r"avl_ins_sorted ="),
    # ---- Q3
    S("Q3_BTree", "01_btree_trace", "q3_btree.c",
      ["gcc -Wall -Wextra -O2 q3_btree.c -o q3_btree -lm"], "./q3_btree 1", sec(1), -1, 17, r"btree_insert\(root"),
    S("Q3_BTree", "02_btree_height", "q3_btree.c", [], "./q3_btree 2", sec(2), -1, 17, r"double n = 5e6"),
    S("Q3_BTree", "03_btree_simulation", "q3_btree.c", [], "./q3_btree 3", sec(3), -1, 17, r"T = 50; splits"),
    # ---- Q4
    S("Q4_RedBlack", "01_rb_trace", "q4_rbtree.c",
      [f"{GCC} q4_rbtree.c -o q4_rbtree -lm"], "./q4_rbtree 1", sec(1), -1, 17, r"rb_insert\(keys"),
    S("Q4_RedBlack", "02_rb_scheduler_leftmost", "q4_rbtree.c", [], "./q4_rbtree 2", sec(2), -1, 17, r"leftmost_cache->key"),
    S("Q4_RedBlack", "03_rb_vs_avl_experiments", "q4_rbtree.c", [], "./q4_rbtree 3", sec(3), -1, 17, r"avl_ok\(avl, -1, N \+ 1\)\) avl_fail"),
    # ---- Q5
    S("Q5_Splay", "01_splay_trace", "q5_splay.c",
      [f"{GCC} q5_splay.c -o q5_splay -lm"], "./q5_splay 1", sec(1), -1, 17, r"splay_find\(&root"),
    S("Q5_Splay", "02_splay_vs_avl_simulation", "q5_splay.c", [], "./q5_splay 2", sec(2), -1, 17, r"make_trees"),
    S("Q5_Splay", "03_splay_extra_tests", "q5_splay.c", [], "./q5_splay 3", sec(3), -1, 17, r"worst single access"),
    # ---- Q6
    S("Q6_Trie", "01_complete_code_asan", "q6_trie_complete.c",
      ["gcc -Wall -Wextra -g -fsanitize=address q6_trie_complete.c -o q6_trie_complete"], "./q6_trie_complete", r"void insert", -1, 22, r"t->words\+\+"),
    S("Q6_Trie", "02_trie_operations", "q6_trie_full.c",
      [f"{GCC.replace(',undefined','')} q6_trie_full.c -o q6_trie_full"], "./q6_trie_full 1", sec(1), -1, 17, r"autocomplete\(root, \"an\""),
    S("Q6_Trie", "03_trie_edge_cases", "q6_trie_full.c", [], "./q6_trie_full 2", sec(2), -1, 17, r"xyz"),
    S("Q6_Trie", "04_trie_5000_names", "q6_trie_full.c", [], "./q6_trie_full 3", sec(3), -1, 17, r"strncmp\(names\[j\]"),
    S("Q6_Trie", "05_trie_scaling", "q6_trie_full.c", [], "./q6_trie_full 4", sec(4), -1, 17, r"bench\(500"),
    # ---- Q7
    S("Q7_Dictionary", "01_verification_1000_words", "q7_dictionary.c",
      [f"{GCC} q7_dictionary.c -o q7_dictionary"], "./q7_dictionary 1", r"static void verify", -1, 17, r"tst_insert\(&t, w\[i\]\)"),
    S("Q7_Dictionary", "02_demo_operations", "q7_dictionary.c", [], "./q7_dictionary 3", r"static void demo", -1, 17, r"tst_autocomplete\(&t, pre"),
    S("Q7_Dictionary", "03_measurements_200k", "q7_dictionary.c",
      ["gcc -Wall -Wextra -O2 q7_dictionary.c -o q7_dictionary"], "./q7_dictionary 2 words_200k.txt", r"static void measure", -1, 17, r"trie26_nodes"),
]

MAXROWS = 19


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    folders = sorted({s["folder"] for s in SHOTS})
    shown = {}
    for sh in SHOTS:
        if only and not sh["folder"].startswith(only):
            continue
        fd = os.path.join(ROOT, sh["folder"])
        os.makedirs(os.path.join(fd, "output"), exist_ok=True)
        os.makedirs(os.path.join(fd, "screenshots"), exist_ok=True)
        for c in sh["cmds"]:
            r = subprocess.run(c, shell=True, cwd=fd, capture_output=True, text=True)
            if r.returncode != 0:
                print("COMPILE FAILED", c, r.stderr[:500])
                sys.exit(1)
            if r.stderr.strip():
                print("compiler messages for", c, "\n", r.stderr[:400])
        r = subprocess.run(sh["run"], shell=True, cwd=fd, capture_output=True, text=True)
        out = r.stdout + r.stderr
        if r.returncode != 0:
            print("RUN FAILED", sh["run"], r.returncode, out[:600])
            sys.exit(1)
        base = f"{sh['name']}"
        with open(os.path.join(fd, "output", base + ".txt"), "w") as f:
            f.write(out)
        code = open(os.path.join(fd, sh["src"])).read()
        lines = code.split("\n")
        first = 1
        for i, l in enumerate(lines, 1):
            if re.search(sh["anchor"], l):
                first = max(1, i + sh["off"])
                break
        hl = None
        if sh["hl"]:
            for i in range(first - 1, len(lines)):
                if re.search(sh["hl"], lines[i]):
                    hl = i + 1
                    break
        siblings = sorted(f for f in os.listdir(fd) if f.endswith((".c", ".txt", ".md")) and f != "tree_preorder.txt")
        siblings = [f for f in siblings if f.endswith(".c")] + ["output", "screenshots"] if True else siblings
        siblings = [f for f in siblings]
        others = [d for d in folders]
        term_all = build_term(sh["folder"], sh["cmds"] + [sh["run"]], out, 104)
        pages = [term_all[i:i + MAXROWS] for i in range(0, len(term_all), MAXROWS)]
        for pi, rows in enumerate(pages):
            sfx = f"_part{pi + 1}" if len(pages) > 1 else ""
            img = render(sh, code, first, sh["nl"], hl, rows, sh["folder"],
                         [s for s in siblings], others, sh["src"])
            path = os.path.join(fd, "screenshots", base + sfx + ".png")
            img.save(path)
            print("saved", os.path.relpath(path, ROOT), img.size)


if __name__ == "__main__":
    main()
