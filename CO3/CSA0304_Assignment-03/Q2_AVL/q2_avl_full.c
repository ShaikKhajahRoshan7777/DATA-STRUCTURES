/*
 * Q2 - AVL tree for the live stock price index
 * Usage: ./q2_avl_full [1|2]   1 = trace of the six insertions, 2 = experiments (default: both)
 * Heights are stored in nodes (leaf = 1). Balance factor = height(left) - height(right).
 */
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

/* ---------------- AVL tree ---------------- */
typedef struct Node { int key, h; struct Node *l, *r; } Node;
static long rot_LL, rot_RR, rot_LR, rot_RL;          /* counters (LR and RL are double rotations) */

static int ht(const Node *n) { return n ? n->h : 0; }
static int max(int a, int b) { return a > b ? a : b; }
static void fix(Node *n) { n->h = 1 + max(ht(n->l), ht(n->r)); }
static int balance(const Node *n) { return n ? ht(n->l) - ht(n->r) : 0; }

static Node *rotate_right(Node *y) { Node *x = y->l; y->l = x->r; x->r = y; fix(y); fix(x); return x; }
static Node *rotate_left(Node *x)  { Node *y = x->r; x->r = y->l; y->l = x; fix(x); fix(y); return y; }

static const char *last_rot = NULL; static int last_rot_node = 0;

Node *avl_insert(Node *n, int key)
{
    if (!n) {
        n = malloc(sizeof *n);
        if (!n) { perror("malloc"); exit(1); }
        n->key = key; n->h = 1; n->l = n->r = NULL;
        return n;
    }
    if (key < n->key)      n->l = avl_insert(n->l, key);
    else if (key > n->key) n->r = avl_insert(n->r, key);
    else return n;
    fix(n);
    int bal = balance(n);
    if (bal > 1  && key < n->l->key) { rot_LL++; last_rot = "LL (single right rotation)"; last_rot_node = n->key; return rotate_right(n); }
    if (bal < -1 && key > n->r->key) { rot_RR++; last_rot = "RR (single left rotation)";  last_rot_node = n->key; return rotate_left(n); }
    if (bal > 1)  { rot_LR++; last_rot = "LR (left rotation on child, then right rotation)"; last_rot_node = n->key; n->l = rotate_left(n->l);  return rotate_right(n); }
    if (bal < -1) { rot_RL++; last_rot = "RL (right rotation on child, then left rotation)"; last_rot_node = n->key; n->r = rotate_right(n->r); return rotate_left(n); }
    return n;
}

const Node *avl_search(const Node *n, int key, int *visits)
{
    *visits = 0;
    while (n) { (*visits)++; if (key == n->key) return n; n = key < n->key ? n->l : n->r; }
    return NULL;
}

void avl_destroy(Node *n) { if (n) { avl_destroy(n->l); avl_destroy(n->r); free(n); } }

/* prints key[balance-factor] in bracket form */
void bracket(const Node *n)
{
    if (!n) return;
    printf("%d", n->key);
    if (n->l || n->r) { printf("("); bracket(n->l); printf(","); bracket(n->r); printf(")"); }
}
void preorder(const Node *n) { if (n) { printf("%d ", n->key); preorder(n->l); preorder(n->r); } }

/* verifies |balance| <= 1, stored heights correct and BST order for every node; returns number of violations */
int verify(const Node *n, long lo, long hi, int *nodes)
{
    if (!n) return 0;
    (*nodes)++;
    int bad = 0;
    int b = balance(n);
    if (b < -1 || b > 1) bad++;
    if (n->h != 1 + max(ht(n->l), ht(n->r))) bad++;
    if (n->key <= lo || n->key >= hi) bad++;
    return bad + verify(n->l, lo, n->key, nodes) + verify(n->r, n->key, hi, nodes);
}

/* ---------------- plain BST for comparison ---------------- */
typedef struct BNode { int key; struct BNode *l, *r; } BNode;
BNode *bst_insert(BNode *root, int key, int *depth_out)
{
    BNode **p = &root; int d = 0;
    while (*p) { if (key == (*p)->key) { *depth_out = d; return root; } p = key < (*p)->key ? &(*p)->l : &(*p)->r; d++; }
    *p = malloc(sizeof **p); (*p)->key = key; (*p)->l = (*p)->r = NULL;
    *depth_out = d;
    return root;
}
int bst_search(const BNode *n, int key)
{
    int v = 0;
    while (n) { v++; if (key == n->key) return v; n = key < n->key ? n->l : n->r; }
    return v;
}
void bst_destroy(BNode *root)                          /* iterative: the tree may be 100000 deep */
{
    BNode **stack = malloc(1 << 22), **sp = stack;
    if (root) *sp++ = root;
    while (sp > stack) {
        BNode *n = *--sp;
        if (n->l) *sp++ = n->l;
        if (n->r) *sp++ = n->r;
        free(n);
        if ((char *)sp - (char *)stack > (1 << 22) - 64) break;   /* safety (never hit for our trees) */
    }
    free(stack);
}

static double now_ms(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec * 1e3 + t.tv_nsec / 1e6; }
static unsigned long long rng = 88172645463325252ULL;
static unsigned next_rand(void) { rng ^= rng << 13; rng ^= rng >> 7; rng ^= rng << 17; return (unsigned)(rng >> 11); }

/* ---------------- sections ---------------- */
static void trace(void)
{
    printf("=== Q2 trace: AVL insertion of 10, 20, 30, 40, 50, 25 ===\n");
    int keys[] = {10, 20, 30, 40, 50, 25};
    Node *root = NULL;
    for (int i = 0; i < 6; i++) {
        last_rot = NULL;
        root = avl_insert(root, keys[i]);
        printf("insert %-2d : ", keys[i]); bracket(root);
        printf("   height=%d\n", ht(root));
        if (last_rot) printf("            rotation at node %d: %s\n", last_rot_node, last_rot);
        else          printf("            no rotation needed\n");
    }
    printf("preorder : "); preorder(root); printf("\n");
    int nodes = 0; int bad = verify(root, -2147483647L, 2147483647L, &nodes);
    printf("balance-factor check: %d nodes, %d violations\n", nodes, bad);
    avl_destroy(root);
}

static void experiments(void)
{
    const int N = 100000, Q = 10000;
    int visits, d;
    printf("=== Q2 experiments: %d keys ===\n", N);

    /* --- sorted insertion --- */
    rot_LL = rot_RR = rot_LR = rot_RL = 0;
    Node *avl = NULL; double t0 = now_ms();
    for (int i = 1; i <= N; i++) avl = avl_insert(avl, i);
    double avl_ins_sorted = now_ms() - t0;
    long rot_sorted = rot_LL + rot_RR + 2 * (rot_LR + rot_RL);
    long sLL = rot_LL, sRR = rot_RR, sLR = rot_LR, sRL = rot_RL;

    BNode *bst = NULL; int bst_h_sorted = 0; t0 = now_ms();
    for (int i = 1; i <= N; i++) { bst = bst_insert(bst, i, &d); if (d + 1 > bst_h_sorted) bst_h_sorted = d + 1; }
    double bst_ins_sorted = now_ms() - t0;

    int *q = malloc(Q * sizeof *q);
    for (int i = 0; i < Q; i++) q[i] = 1 + next_rand() % N;
    long av = 0, bv = 0;
    t0 = now_ms();
    for (int i = 0; i < Q; i++) { avl_search(avl, q[i], &visits); av += visits; }
    double avl_srch_sorted = now_ms() - t0;
    t0 = now_ms();
    for (int i = 0; i < Q; i++) bv += bst_search(bst, q[i]);
    double bst_srch_sorted = now_ms() - t0;
    int nodes = 0; int bad = verify(avl, -1, N + 1, &nodes);
    int avl_h_sorted = ht(avl);

    printf("--- SORTED insertion 1..%d ---\n", N);
    printf("%-26s %14s %14s\n", "", "plain BST", "AVL");
    printf("%-26s %14d %14d\n", "height (levels)", bst_h_sorted, avl_h_sorted);
    printf("%-26s %14.1f %14.1f\n", "insert time (ms)", bst_ins_sorted, avl_ins_sorted);
    printf("%-26s %14.2f %14.3f\n", "search time, 10000 (ms)", bst_srch_sorted, avl_srch_sorted);
    printf("%-26s %14.1f %14.2f\n", "avg nodes visited / search", (double)bv / Q, (double)av / Q);
    printf("AVL rotations: LL=%ld RR=%ld LR=%ld RL=%ld  (single-rotation equivalents: %ld)\n", sLL, sRR, sLR, sRL, rot_sorted);
    printf("AVL balance-factor check: %d nodes, %d violations\n", nodes, bad);
    avl_destroy(avl); bst_destroy(bst);

    /* --- random insertion --- */
    int *keys = malloc(N * sizeof *keys);
    for (int i = 0; i < N; i++) keys[i] = i + 1;
    for (int i = N - 1; i > 0; i--) { int j = next_rand() % (i + 1); int x = keys[i]; keys[i] = keys[j]; keys[j] = x; }
    rot_LL = rot_RR = rot_LR = rot_RL = 0;
    avl = NULL; t0 = now_ms();
    for (int i = 0; i < N; i++) avl = avl_insert(avl, keys[i]);
    double avl_ins_rand = now_ms() - t0;
    long rot_rand = rot_LL + rot_RR + 2 * (rot_LR + rot_RL);
    bst = NULL; int bst_h_rand = 0; t0 = now_ms();
    for (int i = 0; i < N; i++) { bst = bst_insert(bst, keys[i], &d); if (d + 1 > bst_h_rand) bst_h_rand = d + 1; }
    double bst_ins_rand = now_ms() - t0;
    av = bv = 0;
    t0 = now_ms();
    for (int i = 0; i < Q; i++) { avl_search(avl, q[i], &visits); av += visits; }
    double avl_srch_rand = now_ms() - t0;
    t0 = now_ms();
    for (int i = 0; i < Q; i++) bv += bst_search(bst, q[i]);
    double bst_srch_rand = now_ms() - t0;
    nodes = 0; bad = verify(avl, -1, N + 1, &nodes);

    printf("--- RANDOM insertion of %d keys ---\n", N);
    printf("%-26s %14s %14s\n", "", "plain BST", "AVL");
    printf("%-26s %14d %14d\n", "height (levels)", bst_h_rand, ht(avl));
    printf("%-26s %14.1f %14.1f\n", "insert time (ms)", bst_ins_rand, avl_ins_rand);
    printf("%-26s %14.2f %14.3f\n", "search time, 10000 (ms)", bst_srch_rand, avl_srch_rand);
    printf("%-26s %14.1f %14.2f\n", "avg nodes visited / search", (double)bv / Q, (double)av / Q);
    printf("AVL rotations: LL=%ld RR=%ld LR=%ld RL=%ld  (single-rotation equivalents: %ld)\n", rot_LL, rot_RR, rot_LR, rot_RL, rot_rand);
    printf("AVL balance-factor check: %d nodes, %d violations\n", nodes, bad);
    printf("theory: AVL height <= 1.44*log2(n+2) = %.1f levels; log2(%d) = %.1f\n", 1.44 * __builtin_log2(N + 2), N, __builtin_log2(N));
    avl_destroy(avl); bst_destroy(bst); free(keys); free(q);
}

int main(int argc, char **argv)
{
    int sel = argc > 1 ? atoi(argv[1]) : 0;
    if (!sel || sel == 1) trace();
    if (!sel || sel == 2) experiments();
    return 0;
}
