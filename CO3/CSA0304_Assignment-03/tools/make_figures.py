#!/usr/bin/env python3
"""make_figures.py - draws every tree diagram and chart used in the report.
Tree shapes are read from the REAL program output files (Qx/output/*.txt), so figures always match the code.
Run:  python3 tools/make_figures.py        ->  Report/figures/*.png
"""
import os, re, math
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.patches import Circle, FancyBboxPatch

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "Report", "figures")
os.makedirs(OUT, exist_ok=True)
for f in ["Inter-Regular.otf", "Inter-SemiBold.otf", "Inter-Bold.otf"]:
    p = "/usr/share/fonts/opentype/inter/" + f
    if os.path.exists(p):
        font_manager.fontManager.addfont(p)
plt.rcParams["font.family"] = "Inter"
plt.rcParams["axes.unicode_minus"] = False

NAVY, TEAL, ORANGE, RED, GREY, GOLD = "#1e3a8a", "#0f766e", "#ea580c", "#dc2626", "#64748b", "#f59e0b"
LIGHT = "#dbeafe"


def read(rel):
    return open(os.path.join(ROOT, rel)).read()


# ---------------------------------------------------------------- bracket parsing
def parse_bracket(s):
    """key(left,right) with optional empty children -> (label, left, right)"""
    s = s.strip()
    pos = [0]

    def node():
        m = re.match(r"[A-Za-z0-9_]+", s[pos[0]:])
        if not m:
            return None
        label = m.group(0)
        pos[0] += len(label)
        left = right = None
        if pos[0] < len(s) and s[pos[0]] == "(":
            pos[0] += 1
            left = node()
            assert s[pos[0]] == ",", s
            pos[0] += 1
            right = node()
            assert s[pos[0]] == ")", s
            pos[0] += 1
        return (label, left, right)

    return node()


def height(n):
    return 0 if n is None else 1 + max(height(n[1]), height(n[2]))


def layout(t):
    nodes, edges, ctr = [], [], [0]

    def rec(n, d, parent):
        if n is None:
            return
        rec(n[1], d + 1, None)
        x = ctr[0]
        ctr[0] += 1
        me = (n, x, -d * 1.15)
        nodes.append(me)
        rec(n[2], d + 1, None)

    # second pass for edges, using positions by identity
    rec(t, 0, None)
    pos = {id(n): (x, y) for n, x, y in nodes}

    def link(n):
        if n is None:
            return
        for c in (n[1], n[2]):
            if c is not None:
                edges.append((pos[id(n)], pos[id(c)]))
                link(c)

    link(t)
    return nodes, edges


def draw_binary(ax, t, style="bst", hilite=(), title=None, show_bf=False, r=0.40, fs=11, ylim=None):
    ax.set_aspect("equal")
    ax.axis("off")
    if t is None:
        ax.text(0, 0, "(empty)", ha="center", va="center", color=GREY)
        return
    nodes, edges = layout(t)
    for (x1, y1), (x2, y2) in edges:
        ax.plot([x1, x2], [y1, y2], color="#94a3b8", lw=1.6, zorder=1)

    def h(n):
        return 0 if n is None else 1 + max(h(n[1]), h(n[2]))

    for n, x, y in nodes:
        label = n[0]
        fill, edge, tc = LIGHT, NAVY, "#0f172a"
        if style == "rb":
            red = label.endswith("R")
            label = label[:-1]
            fill, edge, tc = (RED, "#7f1d1d", "white") if red else ("#111827", "#000000", "white")
        if label in hilite:
            fill, edge = "#fde68a", ORANGE
        ax.add_patch(Circle((x, y), r, facecolor=fill, edgecolor=edge, lw=1.8, zorder=2))
        ax.text(x, y, label, ha="center", va="center", fontsize=fs, fontweight="semibold", color=tc, zorder=3)
        if show_bf:
            bf = h(n[1]) - h(n[2])
            col = "#15803d" if abs(bf) <= 1 else RED
            ax.text(x + r + 0.07, y + 0.12, f"{bf:+d}" if bf else "0", ha="left", va="center", fontsize=9, color=col, fontweight="bold")
    xs = [x for _, x, _ in nodes]
    ys = [y for _, _, y in nodes]
    ax.set_xlim(min(xs) - 0.8, max(xs) + 1.0)
    ax.set_ylim(min(ys) - 0.8, max(ys) + 0.9)
    if ylim:
        ax.set_ylim(*ylim)
    if title:
        ax.set_title(title, fontsize=10.5, color="#0f172a", fontweight="semibold", pad=4)


def row_of_trees(trees, titles, fname, style="bst", hilites=None, show_bf=False, cols=None, cell_w=2.6, cell_h=2.5):
    n = len(trees)
    cols = cols or n
    rows = math.ceil(n / cols)
    unit = 0.55                                   # inches per data unit -> every node has the same size
    spans, depths = [], []
    for t in trees:
        nodes, _ = layout(t)
        xs = [x for _, x, _ in nodes]
        spans.append(max(xs) - min(xs) + 1.9)
        depths.append(-min(y for _, _, y in nodes))
    ymax = 0.9
    ymin = -(max(depths) + 0.8)
    colw = [max(spans[r * cols + c] for r in range(rows) if r * cols + c < n) for c in range(cols)]
    fig_w = sum(colw) * unit
    fig_h = (ymax - ymin) * unit * rows + 0.5 * rows
    fig, axes = plt.subplots(rows, cols, figsize=(fig_w, fig_h), gridspec_kw=dict(width_ratios=colw), squeeze=False)
    for i in range(rows * cols):
        ax = axes[i // cols][i % cols]
        if i < n:
            draw_binary(ax, trees[i], style, hilites[i] if hilites else (), titles[i], show_bf, ylim=(ymin, ymax))
            nodes, _ = layout(trees[i])
            xs = [x for _, x, _ in nodes]
            mid = (min(xs) + max(xs)) / 2
            ax.set_xlim(mid - colw[i % cols] / 2, mid + colw[i % cols] / 2)
        else:
            ax.axis("off")
    fig.tight_layout(pad=0.5)
    fig.savefig(os.path.join(OUT, fname), dpi=190, facecolor="white")
    plt.close(fig)
    print("figure", fname)


# ---------------------------------------------------------------- small python BST (independent check of Q1)
def bst_insert(t, k):
    if t is None:
        return [k, None, None]
    if k < t[0]:
        t[1] = bst_insert(t[1], k)
    else:
        t[2] = bst_insert(t[2], k)
    return t


def bst_delete(t, k):
    if t is None:
        return None
    if k < t[0]:
        t[1] = bst_delete(t[1], k)
    elif k > t[0]:
        t[2] = bst_delete(t[2], k)
    elif t[1] and t[2]:
        s = t[2]
        while s[1]:
            s = s[1]
        t[0] = s[0]
        t[2] = bst_delete(t[2], s[0])
    else:
        return t[1] or t[2]
    return t


def to_tuple(t):
    return None if t is None else (str(t[0]), to_tuple(t[1]), to_tuple(t[2]))


def preorder(t):
    return [] if t is None else [t[0]] + preorder(t[1]) + preorder(t[2])


def deepcopy(t):
    return None if t is None else [t[0], deepcopy(t[1]), deepcopy(t[2])]


# ---------------------------------------------------------------- Q1 figures
def q1():
    # array stored tree "ABCDE.F"
    T = "ABCDE.F"
    fig = plt.figure(figsize=(11.2, 3.3))
    ax = fig.add_axes([0.0, 0.0, 0.52, 1.0])
    tree = parse_bracket("A(B(D,E),C(,F))")
    draw_binary(ax, tree, "bst", title="Tree stored in the array  \"ABCDE.F\"")
    ax2 = fig.add_axes([0.52, 0.0, 0.48, 1.0])
    ax2.axis("off")
    ax2.set_xlim(0, 7.2)
    ax2.set_ylim(0, 3.3)
    ax2.text(3.6, 2.85, "Array view  (children of i are 2i+1 and 2i+2)", ha="center", fontsize=10.5, fontweight="semibold")
    for i, ch in enumerate(T):
        empty = ch == "."
        ax2.add_patch(FancyBboxPatch((0.15 + i * 0.97, 1.7), 0.85, 0.75, boxstyle="round,pad=0.02,rounding_size=0.08",
                                     fc="#f1f5f9" if empty else LIGHT, ec=GREY if empty else NAVY, lw=1.5))
        ax2.text(0.575 + i * 0.97, 2.075, ch, ha="center", va="center", fontsize=14, fontweight="bold", color=GREY if empty else "#0f172a")
        ax2.text(0.575 + i * 0.97, 1.5, str(i), ha="center", va="top", fontsize=9, color=GREY)
    rows = [("preorder  (root, L, R)", "ABDECF", NAVY), ("inorder   (L, root, R)", "DBEACF", TEAL),
            ("postorder (L, R, root)", "DEBFCA", ORANGE), ("array loop = level order", "ABCDEF", "#7c3aed")]
    for i, (n, v, c) in enumerate(rows):
        ax2.text(0.2, 1.05 - i * 0.30, n, fontsize=9.5, color="#334155", family="DejaVu Sans Mono")
        ax2.text(4.55, 1.05 - i * 0.30, v, fontsize=11, color=c, fontweight="bold", family="DejaVu Sans Mono")
    fig.savefig(os.path.join(OUT, "q1_array_tree.png"), dpi=190, facecolor="white")
    plt.close(fig)
    print("figure q1_array_tree.png")

    # deletion steps of the 'predict the output' program
    t = None
    for k in [50, 30, 70, 20, 40, 60, 80, 65]:
        t = bst_insert(t, k)
    steps, titles, hil = [to_tuple(deepcopy(t))], ["Initial BST"], [()]
    for k, why in [(20, "delete 20  -  CASE 1: leaf"), (30, "delete 30  -  CASE 2: one child"), (50, "delete 50  -  CASE 3: two children")]:
        t = bst_delete(t, k)
        steps.append(to_tuple(deepcopy(t)))
        titles.append(why)
        hil.append(("60",) if k == 50 else ("40",) if k == 30 else ())
    assert " ".join(map(str, preorder(t))) == read("Q1_BST/output/02_predict_bst_delete.txt").strip(), "figure disagrees with C output"
    row_of_trees(steps, titles, "q1_delete_steps.png", hilites=hil, cols=4)

    # random vs sorted (8 keys of the Complete-the-Code task)
    a = None
    for k in [500, 300, 700, 200, 400, 600, 800, 350]:
        a = bst_insert(a, k)
    b = None
    for k in [10, 20, 30, 40, 50, 60, 70, 80]:
        b = bst_insert(b, k)
    row_of_trees([to_tuple(a), to_tuple(b)], ["Random order  ->  height 3", "Sorted order  ->  height 7 (degenerate chain)"],
                 "q1_random_vs_sorted.png", cols=2)

    # chart
    txt = read("Q1_BST/output/08_bst_experiment_2000.txt")
    h = re.search(r"height\s+(\d+)\s+(\d+)", txt)
    c = re.search(r"avg comparisons / search\s+([\d.]+)\s+([\d.]+)", txt)
    hr, hs = int(h.group(1)), int(h.group(2))
    cr, cs = float(c.group(1)), float(c.group(2))
    fig, axs = plt.subplots(1, 2, figsize=(9.4, 3.5))
    for ax, vals, ttl, fmt in [(axs[0], (hr, hs), "Tree height (2,000 keys)", "{:.0f}"), (axs[1], (cr, cs), "Average comparisons per search", "{:.1f}")]:
        bars = ax.bar(["Random\norder", "Sorted\norder"], vals, color=[TEAL, RED], width=0.55)
        ax.set_yscale("log")
        ax.set_title(ttl, fontsize=11, fontweight="semibold")
        for bar, v in zip(bars, vals):
            ax.text(bar.get_x() + bar.get_width() / 2, v * 1.15, fmt.format(v), ha="center", fontweight="bold", fontsize=11)
        ax.set_ylim(1, max(vals) * 6)
        ax.spines[["top", "right"]].set_visible(False)
        ax.set_ylabel("log scale", color=GREY, fontsize=9)
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, "q1_chart.png"), dpi=190, facecolor="white")
    plt.close(fig)
    print("figure q1_chart.png")


# ---------------------------------------------------------------- Q2 figures
def q2():
    txt = read("Q2_AVL/output/02_avl_trace.txt")
    trees, titles, hil = [], [], []
    rot = {"RR": "RR", "RL": "RL", "LL": "LL", "LR": "LR"}
    lines = txt.split("\n")
    for i, l in enumerate(lines):
        m = re.match(r"insert (\d+)\s*: (\S+)\s+height=(\d+)", l)
        if m:
            key, br = m.group(1), m.group(2)
            nxt = lines[i + 1]
            r = re.search(r"rotation at node (\d+): (\w\w)", nxt)
            ttl = f"insert {key}" + (f"  ->  {r.group(2)} rotation" if r else "")
            trees.append(parse_bracket(br))
            titles.append(ttl)
            hil.append((r.group(1),) if False else ())
    row_of_trees(trees, titles, "q2_avl_steps.png", show_bf=True, cols=3, cell_h=2.7)

    # before / after rotation pictures (bf shown: green = ok, red = unbalanced)
    seq = [("10(,20(,30))", "RR: left-rotate at 10", "20(10,30)"),
           ("20(10,30(,40(,50)))", "RR: left-rotate at 30", "20(10,40(30,50))"),
           ("20(10,40(30(25,),50))", "RL: right-rotate at 40, then left-rotate at 20", "30(20(10,25),40(,50))")]
    fig_trees, ttl = [], []
    for b, why, a in seq:
        fig_trees += [parse_bracket(b), parse_bracket(a)]
        ttl += ["BEFORE (unbalanced)", "AFTER  -  " + why.split(":")[0]]
    row_of_trees(fig_trees, ttl, "q2_rotations.png", show_bf=True, cols=2, cell_h=2.5)

    # chart
    t = read("Q2_AVL/output/03_avl_experiments.txt")
    h = re.findall(r"height \(levels\)\s+(\d+)\s+(\d+)", t)
    ins = re.findall(r"insert time \(ms\)\s+([\d.]+)\s+([\d.]+)", t)
    avs = re.findall(r"avg nodes visited / search\s+([\d.]+)\s+([\d.]+)", t)
    fig, axs = plt.subplots(1, 3, figsize=(11.5, 3.5))
    labels = ["Sorted input", "Random input"]
    x = range(2)
    for ax, series, ttl, fmt in [(axs[0], h, "Height (levels), 100,000 keys", "{:.0f}"),
                                 (axs[1], avs, "Average nodes visited per search", "{:.1f}"),
                                 (axs[2], ins, "Insertion time of 100,000 keys (ms)", "{:.0f}")]:
        bst = [float(s[0]) for s in series]
        avl = [float(s[1]) for s in series]
        w = 0.36
        b1 = ax.bar([i - w / 2 for i in x], bst, w, color=RED, label="Plain BST")
        b2 = ax.bar([i + w / 2 for i in x], avl, w, color=TEAL, label="AVL tree")
        ax.set_yscale("log")
        ax.set_xticks(list(x))
        ax.set_xticklabels(labels, fontsize=9.5)
        ax.set_title(ttl, fontsize=10.5, fontweight="semibold")
        for bars in (b1, b2):
            for bar in bars:
                v = bar.get_height()
                ax.text(bar.get_x() + bar.get_width() / 2, v * 1.2, fmt.format(v), ha="center", fontsize=8.5, fontweight="bold")
        ax.set_ylim(top=max(bst + avl) * 8)
        ax.spines[["top", "right"]].set_visible(False)
    axs[0].legend(frameon=False, fontsize=9, loc="upper right")
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, "q2_chart.png"), dpi=190, facecolor="white")
    plt.close(fig)
    print("figure q2_chart.png")


# ---------------------------------------------------------------- Q3 figures (B-tree boxes)
def draw_btree(ax, levels, title):
    ax.axis("off")
    ax.set_title(title, fontsize=10.5, fontweight="semibold", pad=3)
    # assign children sequentially
    nodes = []  # per level: list of key lists
    for lv in levels:
        nodes.append(lv)
    # positions
    pos = [[None] * len(lv) for lv in levels]
    leaf_w = [len(k) * 0.42 + 0.35 for k in nodes[-1]]
    x = 0.0
    for i, w in enumerate(leaf_w):
        pos[-1][i] = x + w / 2
        x += w + 0.35
    # parents: children counts n+1
    for L in range(len(levels) - 2, -1, -1):
        ci = 0
        for i, keys in enumerate(nodes[L]):
            ch = list(range(ci, ci + len(keys) + 1))
            ci += len(keys) + 1
            pos[L][i] = sum(pos[L + 1][c] for c in ch) / len(ch)
    depth = len(levels)
    for L, lv in enumerate(nodes):
        y = -L * 1.15
        for i, keys in enumerate(lv):
            w = len(keys) * 0.42 + 0.3
            cx = pos[L][i]
            ax.add_patch(FancyBboxPatch((cx - w / 2, y - 0.24), w, 0.48, boxstyle="round,pad=0.02,rounding_size=0.07",
                                        fc=LIGHT if L else "#fde68a", ec=NAVY if L else ORANGE, lw=1.6, zorder=2))
            for j, k in enumerate(keys):
                ax.text(cx - w / 2 + 0.15 + 0.21 + j * 0.42, y, str(k), ha="center", va="center", fontsize=10, fontweight="semibold", zorder=3)
    for L in range(len(levels) - 1):
        ci = 0
        for i, keys in enumerate(nodes[L]):
            for c in range(ci, ci + len(keys) + 1):
                ax.plot([pos[L][i], pos[L + 1][c]], [-L * 1.15 - 0.24, -(L + 1) * 1.15 + 0.24], color="#94a3b8", lw=1.3, zorder=1)
            ci += len(keys) + 1
    ax.set_xlim(-0.3, x)
    ax.set_ylim(-(depth - 1) * 1.15 - 0.5, 0.5)
    ax.set_aspect("equal")


def q3():
    txt = read("Q3_BTree/output/01_btree_trace.txt")
    blocks = re.split(r"\ninsert ", "\n" + txt)
    steps = []
    for b in blocks[1:]:
        head = b.split("\n")[0]
        key = head.split()[0]
        levels = [[int(v) for v in grp.split()] for grp in re.findall(r"\[([^\]]*)\]", " ".join(re.findall(r"L\d+:(.*)", b)).replace("] [", "]|[")) ]
        # re-parse per level
        levels = []
        for ln in re.findall(r"L\d+:(.*)", b):
            levels.append([[int(v) for v in g.split()] for g in re.findall(r"\[([^\]]*)\]", ln)])
        split = "split" in head and "no split" not in head
        steps.append((key, levels, split))
    fig, axs = plt.subplots(2, 4, figsize=(15, 5.2))
    for ax, (k, lv, sp) in zip(axs.flat, steps):
        draw_btree(ax, lv, f"insert {k}" + ("   (SPLIT)" if sp else ""))
    fig.tight_layout(pad=0.8)
    fig.savefig(os.path.join(OUT, "q3_btree_steps.png"), dpi=170, facecolor="white")
    plt.close(fig)
    print("figure q3_btree_steps.png")

    s = read("Q3_BTree/output/03_btree_simulation.txt")
    rows = {}
    for name, key in [("BST (random)", "BST"), ("AVL", "AVL"), ("B-tree (m=100)", "B-tree")]:
        m = re.search(re.escape(name) + r"\s+([\d.]+)\s+(\d+)", s)
        rows[key] = (float(m.group(1)), int(m.group(2)))
    fig, axs = plt.subplots(1, 2, figsize=(10, 3.5))
    names = list(rows)
    cols = [RED, ORANGE, TEAL]
    avg = [rows[n][0] for n in names]
    axs[0].bar(names, avg, color=cols, width=0.55)
    for i, v in enumerate(avg):
        axs[0].text(i, v + 0.6, f"{v:.1f}", ha="center", fontweight="bold")
    axs[0].set_title("Average node visits (= disk reads) per search\n5,000,000 keys", fontsize=10.5, fontweight="semibold")
    ms = [v * 10 for v in avg]
    axs[1].bar(names, ms, color=cols, width=0.55)
    for i, v in enumerate(ms):
        axs[1].text(i, v + 6, f"{v:.0f} ms", ha="center", fontweight="bold")
    axs[1].set_title("Search time at 10 ms per disk read", fontsize=10.5, fontweight="semibold")
    for ax in axs:
        ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, "q3_chart.png"), dpi=190, facecolor="white")
    plt.close(fig)
    print("figure q3_chart.png")


# ---------------------------------------------------------------- Q4 figures
def q4():
    txt = read("Q4_RedBlack/output/01_rb_trace.txt")
    trees, titles = [], []
    for m in re.finditer(r"insert (\d+) \(new node is RED\)\n((?:      .*\n)*)   tree: (\S+)", txt):
        k, acts, br = m.group(1), m.group(2), m.group(3)
        tag = ""
        if "rotate" in acts:
            tag = "  (recolour + rotation)"
        elif "recolour: parent" in acts:
            tag = "  (recolour)"
        trees.append(parse_bracket(br))
        titles.append(f"insert {k}{tag}")
    row_of_trees(trees, titles, "q4_rb_steps.png", style="rb", cols=3, cell_h=2.7)

    t = read("Q4_RedBlack/output/03_rb_vs_avl_experiments.txt")
    ri = re.search(r"per insertion\s+([\d.]+)\s+([\d.]+)", t)
    rd = re.search(r"per deletion\s+([\d.]+)\s+([\d.]+)", t)
    mi = re.search(r"max in one insertion\s+(\d+)\s+(\d+)", t)
    md = re.search(r"max in one deletion\s+(\d+)\s+(\d+)", t)
    fig, axs = plt.subplots(1, 2, figsize=(10, 3.4))
    for ax, (a, b), ttl in [(axs[0], (ri, rd), "Rotations per operation (average)"), (axs[1], (mi, md), "Rotations in the worst single operation")]:
        rb = [float(a.group(1)), float(b.group(1))]
        av = [float(a.group(2)), float(b.group(2))]
        w = 0.36
        b1 = ax.bar([-w / 2, 1 - w / 2], rb, w, color=RED, label="Red-black")
        b2 = ax.bar([w / 2, 1 + w / 2], av, w, color=TEAL, label="AVL")
        ax.set_xticks([0, 1])
        ax.set_xticklabels(["insertion", "deletion"])
        ax.set_title(ttl, fontsize=10.5, fontweight="semibold")
        for bars in (b1, b2):
            for bar in bars:
                v = bar.get_height()
                ax.text(bar.get_x() + bar.get_width() / 2, v + max(rb + av) * 0.02, f"{v:g}", ha="center", fontsize=9.5, fontweight="bold")
        ax.spines[["top", "right"]].set_visible(False)
    axs[0].legend(frameon=False)
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, "q4_chart.png"), dpi=190, facecolor="white")
    plt.close(fig)
    print("figure q4_chart.png")


# ---------------------------------------------------------------- Q5 figures
def q5():
    txt = read("Q5_Splay/output/01_splay_trace.txt")
    init = re.search(r"initial tree: (\S+)", txt).group(1)
    trees, titles, hil = [parse_bracket(init)], ["initial tree"], [()]
    acc = None
    for l in txt.split("\n"):
        m = re.match(r"access (\d+):", l)
        if m:
            acc = m.group(1)
            continue
        m = re.match(r"   (ZIG-ZIG|ZIG-ZAG|ZIG)\s", l)
        if m:
            kind = m.group(1)
            pending = (kind, acc)
            continue
        m = re.match(r"\s+tree: (\S+)", l)
        if m:
            trees.append(parse_bracket(m.group(1)))
            titles.append(f"access {pending[1]}: {pending[0].lower()}")
            hil.append((pending[1],))
    row_of_trees(trees, titles, "q5_splay_steps.png", cols=3, hilites=hil, cell_h=2.9)

    s = read("Q5_Splay/output/02_splay_vs_avl_simulation.txt")
    parts = s.split("--- UNIFORM")
    sk = re.search(r"avg nodes visited per access\s+([\d.]+)\s+([\d.]+)", parts[0])
    un = re.search(r"avg nodes visited per access\s+([\d.]+)\s+([\d.]+)", parts[1])
    fig, ax = plt.subplots(figsize=(7.2, 3.5))
    w = 0.36
    sp = [float(sk.group(1)), float(un.group(1))]
    av = [float(sk.group(2)), float(un.group(2))]
    b1 = ax.bar([-w / 2, 1 - w / 2], sp, w, color=GOLD, label="Splay tree")
    b2 = ax.bar([w / 2, 1 + w / 2], av, w, color=TEAL, label="AVL tree")
    ax.set_xticks([0, 1])
    ax.set_xticklabels(["Skewed (80% of accesses to 5% of keys)", "Uniform"])
    ax.set_title("Average nodes visited per access (10,000 accesses, 1,000 keys)", fontsize=10.5, fontweight="semibold")
    for bars in (b1, b2):
        for bar in bars:
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.15, f"{bar.get_height():.2f}", ha="center", fontweight="bold")
    ax.legend(frameon=False)
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, "q5_chart.png"), dpi=190, facecolor="white")
    plt.close(fig)
    print("figure q5_chart.png")


# ---------------------------------------------------------------- generic n-ary layout (trie / TST)
def nary_layout(tree):
    """tree = (label, [children...]); returns nodes [(label, x, y, meta)], edges"""
    nodes, edges = [], []
    ctr = [0.0]

    def rec(n, d):
        label, kids, meta = n
        if not kids:
            x = ctr[0]
            ctr[0] += 1.0
        else:
            xs = [rec(k, d + 1) for k in kids]
            x = sum(xs) / len(xs)
        nodes.append((label, x, -d * 1.2, meta, id(n)))
        n_x[id(n)] = (x, -d * 1.2)
        return x

    n_x = {}
    rec(tree, 0)

    def link(n):
        for k in n[1]:
            edges.append((n_x[id(n)], n_x[id(k)], k[2].get("edge", "")))
            link(k)

    link(tree)
    return nodes, edges


def q6():
    words = ["anand", "anitha", "anu", "arun", "bala", "anusuya"]
    root = {}
    for w in words:
        n = root
        n.setdefault("#", 0)
        n["#"] += 1
        for ch in w:
            n = n.setdefault(ch, {"#": 0})
            n["#"] += 1
        n["$"] = True

    def build(d, label):
        kids = [build(v, k) for k, v in sorted(d.items()) if k not in ("#", "$")]
        return (label, kids, dict(words=d.get("#", 0), end=d.get("$", False), edge=label))

    tree = build(root, "root")
    nodes, edges = nary_layout(tree)
    fig, ax = plt.subplots(figsize=(11.5, 5.1))
    ax.axis("off")
    for (x1, y1), (x2, y2), lab in edges:
        ax.plot([x1, x2], [y1, y2], color="#94a3b8", lw=1.3, zorder=1)
    for label, x, y, meta, _ in nodes:
        end = meta["end"]
        ax.add_patch(Circle((x, y), 0.33, fc="#dcfce7" if end else LIGHT, ec=TEAL if end else NAVY, lw=2.6 if end else 1.6, zorder=2))
        if label != "root":
            ax.text(x, y + 0.02, label, ha="center", va="center", fontsize=11, fontweight="bold", zorder=3)
            ax.text(x + 0.37, y + 0.26, str(meta["words"]), fontsize=8.5, color=ORANGE, fontweight="bold")
        else:
            ax.text(x, y, "root", ha="center", va="center", fontsize=9, fontweight="bold", zorder=3)
            ax.text(x + 0.40, y + 0.3, str(meta["words"]), fontsize=8.5, color=ORANGE, fontweight="bold")
    ax.set_aspect("equal")
    ax.set_xlim(-0.8, max(n[1] for n in nodes) + 0.9)
    ax.set_ylim(min(n[2] for n in nodes) - 0.7, 0.8)
    ax.text(0.0, min(n[2] for n in nodes) - 0.45, "orange number = words count (words passing through the node);  thick green ring = a word ends here",
            fontsize=9, color=GREY)
    ax.set_title("Trie of the six contacts  -  22 nodes (including the root)", fontsize=12, fontweight="semibold")
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, "q6_trie.png"), dpi=190, facecolor="white")
    plt.close(fig)
    print("figure q6_trie.png")

    t = read("Q6_Trie/output/05_trie_scaling.txt")
    rows = re.findall(r"^(\d+)\s+(\d+)\s+([\d.]+) KB\s+(\d+) KB\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)", t, re.M)
    names = [r[0] for r in rows]
    tr = [float(r[2]) for r in rows]
    ar = [float(r[3]) for r in rows]
    sc = [float(r[6]) for r in rows]
    cn = [float(r[4]) if False else float(r[4 + 1]) for r in rows]
    fig, axs = plt.subplots(1, 2, figsize=(10.6, 3.6))
    x = range(len(names))
    w = 0.36
    axs[0].bar([i - w / 2 for i in x], tr, w, color=ORANGE, label="Trie (26 pointers/node)")
    axs[0].bar([i + w / 2 for i in x], ar, w, color=TEAL, label="Sorted array")
    axs[0].set_yscale("log")
    axs[0].set_xticks(list(x))
    axs[0].set_xticklabels([f"{n} names" for n in names])
    axs[0].set_title("Memory (KB, log scale)", fontsize=10.5, fontweight="semibold")
    for i, (a, b) in enumerate(zip(tr, ar)):
        axs[0].text(i - w / 2, a * 1.15, f"{a:,.0f}", ha="center", fontsize=8.5, fontweight="bold")
        axs[0].text(i + w / 2, b * 1.15, f"{b:,.0f}", ha="center", fontsize=8.5, fontweight="bold")
    axs[0].set_ylim(top=max(tr) * 8)
    axs[0].legend(frameon=False, fontsize=8.5, loc="upper left")
    trie_us = [float(r[5]) for r in rows]
    axs[1].bar([i - w / 2 for i in x], trie_us, w, color=ORANGE, label="Trie autocomplete (top 10)")
    axs[1].bar([i + w / 2 for i in x], sc, w, color=RED, label="strncmp linear scan")
    axs[1].set_yscale("log")
    axs[1].set_xticks(list(x))
    axs[1].set_xticklabels([f"{n} names" for n in names])
    axs[1].set_title("Time per prefix query (microseconds, log scale)", fontsize=10.5, fontweight="semibold")
    for i, (a, b) in enumerate(zip(trie_us, sc)):
        axs[1].text(i - w / 2, a * 1.2, f"{a:.2f}", ha="center", fontsize=8.5, fontweight="bold")
        axs[1].text(i + w / 2, b * 1.2, f"{b:.0f}", ha="center", fontsize=8.5, fontweight="bold")
    axs[1].set_ylim(top=max(sc) * 10)
    axs[1].legend(frameon=False, fontsize=8.5, loc="upper left")
    for ax in axs:
        ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, "q6_chart.png"), dpi=190, facecolor="white")
    plt.close(fig)
    print("figure q6_chart.png")


# ---------------------------------------------------------------- Q7 figures
def q7():
    # small ternary search tree illustration
    words = ["anu", "anand", "arun", "bala", "anusuya"]
    root = None

    def ins(n, w, i):
        c = w[i]
        if n is None:
            n = {"c": c, "lo": None, "eq": None, "hi": None, "end": False}
        if c < n["c"]:
            n["lo"] = ins(n["lo"], w, i)
        elif c > n["c"]:
            n["hi"] = ins(n["hi"], w, i)
        else:
            if i + 1 == len(w):
                n["end"] = True
            else:
                n["eq"] = ins(n["eq"], w, i + 1)
        return n

    for w in words:
        root = ins(root, w, 0)
    pos = {}
    ctr = [0.0]

    def lay(n, d):
        if n is None:
            return None
        xl = lay(n["lo"], d + 1)
        xe = lay(n["eq"], d + 1)
        xh = lay(n["hi"], d + 1)
        xs = [x for x in (xl, xe, xh) if x is not None]
        if not xs:
            x = ctr[0]
            ctr[0] += 1.3
        else:
            x = xe if xe is not None else sum(xs) / len(xs)
        pos[id(n)] = (x, -d * 1.2)
        return x

    lay(root, 0)
    fig, ax = plt.subplots(figsize=(8.8, 4.8))
    ax.axis("off")

    def draw(n):
        if n is None:
            return
        x, y = pos[id(n)]
        for k, col, ls in (("lo", "#dc2626", "--"), ("eq", "#0f766e", "-"), ("hi", "#2563eb", "--")):
            c = n[k]
            if c is not None:
                cx, cy = pos[id(c)]
                ax.plot([x, cx], [y, cy], color=col, ls=ls, lw=1.8, zorder=1)
                draw(c)

    draw(root)

    def nodes(n):
        if n is None:
            return
        x, y = pos[id(n)]
        ax.add_patch(Circle((x, y), 0.36, fc="#dcfce7" if n["end"] else LIGHT, ec=TEAL if n["end"] else NAVY, lw=2.6 if n["end"] else 1.6, zorder=2))
        ax.text(x, y, n["c"], ha="center", va="center", fontsize=12, fontweight="bold", zorder=3)
        for k in ("lo", "eq", "hi"):
            nodes(n[k])

    nodes(root)
    xs = [p[0] for p in pos.values()]
    ys = [p[1] for p in pos.values()]
    ax.set_aspect("equal")
    ax.set_xlim(min(xs) - 0.9, max(xs) + 0.9)
    ax.set_ylim(min(ys) - 1.0, 0.8)
    ax.plot([], [], color="#dc2626", ls="--", label="lo  (letter < node)")
    ax.plot([], [], color="#0f766e", lw=2, label="eq  (next letter of the word)")
    ax.plot([], [], color="#2563eb", ls="--", label="hi  (letter > node)")
    ax.legend(loc="lower center", ncol=3, frameon=False, fontsize=9, bbox_to_anchor=(0.5, -0.02))
    ax.set_title("Ternary search tree for  anu, anand, arun, bala, anusuya   (green ring = end of a word)", fontsize=10.5, fontweight="semibold")
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, "q7_tst.png"), dpi=190, facecolor="white")
    plt.close(fig)
    print("figure q7_tst.png")

    t = read("Q7_Dictionary/output/03_measurements_200k.txt")
    mem = re.search(r"memory\s+([\d.]+) MB\s+([\d.]+) MB\s+([\d.]+) MB", t)
    m26, mt, ma = map(float, mem.groups())
    lk = re.search(r"exact look-up.*?\s(\d+) ns\s+(\d+) ns", t)
    au = re.search(r"autocomplete.*?\s([\d.]+) us\s+([\d.]+) us", t)
    rg = re.search(r"range listing.*?\s([\d.]+) us\s+([\d.]+) us", t)
    sg = re.search(r"spell suggestions.*?\s([\d.]+) us\s+([\d.]+) us", t)
    fig, axs = plt.subplots(1, 2, figsize=(11.5, 3.8))
    axs[0].bar(["26-pointer\ntrie", "Ternary search\ntree (chosen)", "Sorted array\n+ binary search"], [m26, mt, ma], color=[ORANGE, TEAL, NAVY], width=0.55)
    axs[0].set_yscale("log")
    for i, v in enumerate([m26, mt, ma]):
        axs[0].text(i, v * 1.2, f"{v:.1f} MB", ha="center", fontweight="bold")
    axs[0].set_ylim(top=m26 * 8)
    axs[0].set_title("Memory for 200,000 words", fontsize=10.5, fontweight="semibold")
    ops = ["exact look-up\n(ns)", "autocomplete\n(us)", "range of 51\nwords (us)", "spell suggest\n(us)"]
    tv = [float(lk.group(1)), float(au.group(1)), float(rg.group(1)), float(sg.group(1))]
    av = [float(lk.group(2)), float(au.group(2)), float(rg.group(2)), float(sg.group(2))]
    # normalise to ratio TST / array to show relative cost
    ratios = [a / b for a, b in zip(tv, av)]
    cols = [TEAL if r <= 1.05 else ORANGE for r in ratios]
    bars = axs[1].bar(ops, ratios, color=cols, width=0.55)
    axs[1].axhline(1, color=GREY, ls="--", lw=1)
    axs[1].text(3.45, 1.05, "equal", color=GREY, fontsize=8.5, ha="right")
    for b, r in zip(bars, ratios):
        axs[1].text(b.get_x() + b.get_width() / 2, r + 0.15, f"{r:.2f}x", ha="center", fontweight="bold")
    axs[1].set_title("TST time / sorted-array time  (below the dashed line = TST is faster)", fontsize=10.5, fontweight="semibold")
    for ax in axs:
        ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, "q7_chart.png"), dpi=190, facecolor="white")
    plt.close(fig)
    print("figure q7_chart.png")


if __name__ == "__main__":
    q1(); q2(); q3(); q4(); q5(); q6(); q7()
