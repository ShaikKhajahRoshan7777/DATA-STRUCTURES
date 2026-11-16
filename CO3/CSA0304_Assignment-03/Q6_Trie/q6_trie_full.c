/*
 * Q6 - Trie for contact search and autocomplete
 * Usage: ./q6_trie_full [1|2|3|4]
 *   1 = insert / search / count_prefix / autocomplete / delete on a small contact list
 *   2 = edge cases: empty prefix, prefix that is a whole word, prefix with no matches
 *   3 = load 5,000 names: trie prefix search vs linear strncmp scan
 *   4 = scaling: 500 / 5,000 / 50,000 names - time per prefix search and memory
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

typedef struct Trie { struct Trie *child[26]; int words; int end; } Trie;
static long nodes_alive;

static Trie *node(void) { nodes_alive++; Trie *t = calloc(1, sizeof *t); if (!t) { perror("calloc"); exit(1); } return t; }

void insert(Trie *t, const char *w)
{
    t->words++;                                   /* the root counts every word (empty prefix) */
    for (; *w; w++) {
        int i = *w - 'a';
        if (i < 0 || i >= 26) return;
        if (!t->child[i]) t->child[i] = node();
        t = t->child[i];
        t->words++;
    }
    t->end = 1;
}

/* returns 1 if the exact word is stored */
int search(const Trie *t, const char *w)
{
    for (; *w; w++) { int i = *w - 'a'; if (i < 0 || i >= 26 || !t->child[i]) return 0; t = t->child[i]; }
    return t->end;
}

/* number of stored words that start with p (the empty prefix counts all words) */
int count_prefix(const Trie *t, const char *p)
{
    for (; *p; p++) { int i = *p - 'a'; if (i < 0 || i >= 26 || !t->child[i]) return 0; t = t->child[i]; }
    return t->words;
}

static void collect(const Trie *t, char *buf, int depth, int limit, int *printed, int silent)
{
    if (*printed >= limit) return;
    if (t->end) { buf[depth] = 0; if (!silent) printf("%s ", buf); (*printed)++; }
    for (int i = 0; i < 26 && *printed < limit; i++)           /* a..z gives alphabetical order */
        if (t->child[i]) { buf[depth] = 'a' + i; collect(t->child[i], buf, depth + 1, limit, printed, silent); }
}

/* autocomplete: words beginning with p in alphabetical order, at most `limit` of them */
int autocomplete(const Trie *t, const char *p, int limit, int silent)
{
    char buf[128]; int d = 0;
    for (; *p; p++) { int i = *p - 'a'; if (i < 0 || i >= 26 || !t->child[i]) return 0; t = t->child[i]; buf[d++] = *p; }
    int printed = 0;
    collect(t, buf, d, limit, &printed, silent);
    return printed;
}

/* delete word w; returns 1 if the word existed. Frees nodes that become unused. */
static int del_rec(Trie *t, const char *w, int *removed)
{
    if (!*w) {
        if (!t->end) return 0;
        t->end = 0; *removed = 1;
        return 1;
    }
    int i = *w - 'a';
    if (i < 0 || i >= 26 || !t->child[i]) return 0;
    Trie *c = t->child[i];
    if (!del_rec(c, w + 1, removed)) return 0;
    c->words--;
    if (c->words == 0) {                          /* nothing passes through c any more */
        free(c); t->child[i] = NULL; nodes_alive--;   /* c has no children here: all its words are gone */
    }
    return 1;
}
static void free_subtree(Trie *t) { if (!t) return; for (int i = 0; i < 26; i++) free_subtree(t->child[i]); free(t); }
int delete_word(Trie *root, const char *w)
{
    int removed = 0;
    if (!search(root, w)) return 0;
    /* count nodes freed properly: del_rec frees c when words reach 0 (c is a leaf then) */
    del_rec(root, w, &removed);
    if (removed) root->words--;
    return removed;
}
static void destroy(Trie *t) { free_subtree(t); }

static double now_us(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec * 1e6 + t.tv_nsec / 1e3; }

/* deterministic pseudo-random names: 3 syllables = 50^3 = 125,000 possible names */
static void make_name(long idx, char *out)
{
    static const char C[] = "bdklmnrstv", V[] = "aeiou";
    long x = (idx * 40503L + 17) % 125000L;
    int s[3];
    for (int i = 0; i < 3; i++) { s[i] = x % 50; x /= 50; }
    int p = 0;
    for (int i = 0; i < 3; i++) { out[p++] = C[s[i] / 5]; out[p++] = V[s[i] % 5]; }
    out[p] = 0;
}
static unsigned long long rng = 88172645463325252ULL;
static unsigned next_rand(void) { rng ^= rng << 13; rng ^= rng >> 7; rng ^= rng << 17; return (unsigned)(rng >> 11); }

static void section1(void)
{
    printf("=== Q6 trie operations on a small contact list ===\n");
    const char *contacts[] = {"anand", "anitha", "anu", "arun", "bala", "anusuya", "balaji", "ravi"};
    Trie *root = node();
    for (int i = 0; i < 8; i++) insert(root, contacts[i]);
    printf("inserted 8 contacts -> %ld nodes (incl. root), %zu bytes each, %zu bytes total\n",
           nodes_alive, sizeof(Trie), nodes_alive * sizeof(Trie));
    printf("search(\"anu\") = %d, search(\"an\") = %d, search(\"ravi\") = %d, search(\"rav\") = %d\n",
           search(root, "anu"), search(root, "an"), search(root, "ravi"), search(root, "rav"));
    const char *pre[] = {"a", "an", "anu", "ba", "z"};
    for (int i = 0; i < 5; i++) printf("count_prefix(\"%s\") = %d\n", pre[i], count_prefix(root, pre[i]));
    printf("autocomplete(\"an\")  : "); autocomplete(root, "an", 10, 0); printf("\n");
    printf("autocomplete(\"ba\")  : "); autocomplete(root, "ba", 10, 0); printf("\n");
    long before = nodes_alive;
    int ok = delete_word(root, "anu");
    printf("delete(\"anu\")       : %s  (nodes %ld -> %ld; \"anusuya\" must survive)\n",
           ok ? "removed" : "not found", before, nodes_alive);
    printf("   search(\"anu\") = %d, search(\"anusuya\") = %d, count_prefix(\"anu\") = %d\n",
           search(root, "anu"), search(root, "anusuya"), count_prefix(root, "anu"));
    before = nodes_alive;
    ok = delete_word(root, "ravi");
    printf("delete(\"ravi\")      : %s  (nodes %ld -> %ld; whole branch freed)\n",
           ok ? "removed" : "not found", before, nodes_alive);
    printf("delete(\"zzz\")       : %s\n", delete_word(root, "zzz") ? "removed" : "not found (no change)");
    destroy(root); nodes_alive = 0;
}

static void section2(void)
{
    printf("=== Q6 edge cases ===\n");
    const char *contacts[] = {"anand", "anitha", "anu", "arun", "bala", "anusuya"};
    Trie *root = node();
    for (int i = 0; i < 6; i++) insert(root, contacts[i]);
    printf("empty prefix \"\"      : count = %d (all contacts); first 3: ", count_prefix(root, ""));
    autocomplete(root, "", 3, 0); printf("\n");
    printf("whole word \"anu\"     : count = %d (\"anu\" itself + \"anusuya\"); list: ", count_prefix(root, "anu"));
    autocomplete(root, "anu", 10, 0); printf("\n");
    printf("whole word \"arun\"    : count = %d; list: ", count_prefix(root, "arun"));
    autocomplete(root, "arun", 10, 0); printf("\n");
    printf("no match \"xyz\"       : count = %d; list: [", count_prefix(root, "xyz"));
    autocomplete(root, "xyz", 10, 0); printf("]\n");
    printf("no match \"anq\"       : count = %d\n", count_prefix(root, "anq"));
    printf("hand check of \"an\"   : expected anand, anitha, anu, anusuya -> got: ");
    autocomplete(root, "an", 10, 0); printf("\n");
    printf("hand check of \"a\"    : expected anand, anitha, anu, anusuya, arun -> got: ");
    autocomplete(root, "a", 10, 0); printf("\n");
    destroy(root); nodes_alive = 0;
}

static double bench(int n, int show)
{
    char (*names)[8] = malloc((size_t)n * 8);
    Trie *root = node();
    for (int i = 0; i < n; i++) { make_name(i, names[i]); insert(root, names[i]); }
    long nodes = nodes_alive; size_t trie_bytes = nodes * sizeof(Trie);
    size_t array_bytes = (size_t)n * (sizeof(char *) + 7);                    /* pointer + 6 letters + NUL */
    /* prefix queries of length 3 taken from existing names */
    const int Q = 20000;
    char (*qs)[4] = malloc(Q * 4);
    for (int i = 0; i < Q; i++) { const char *nm = names[next_rand() % n]; memcpy(qs[i], nm, 3); qs[i][3] = 0; }
    volatile long sink = 0;
    double t0 = now_us();
    for (int i = 0; i < Q; i++) sink += count_prefix(root, qs[i]);
    double trie_us = (now_us() - t0) / Q;
    t0 = now_us();
    for (int i = 0; i < Q; i++) sink += autocomplete(root, qs[i], 10, 1);
    double auto_us = (now_us() - t0) / Q;
    int Q2 = Q / 20;                                                          /* linear scan is slow: fewer queries */
    t0 = now_us();
    for (int i = 0; i < Q2; i++) { int c = 0; for (int j = 0; j < n; j++) if (strncmp(names[j], qs[i], 3) == 0) c++; sink += c; }
    double scan_us = (now_us() - t0) / Q2;
    if (show) {
        printf("%-8d %12ld %11.1f KB %10.0f KB %12.3f %12.3f %12.1f\n", n, nodes, trie_bytes / 1024.0, array_bytes / 1024.0, trie_us, auto_us, scan_us);
    }
    destroy(root); nodes_alive = 0; free(names); free(qs);
    (void)sink;
    return trie_us;
}

static void section3(void)
{
    printf("=== Q6 phone book with 5,000 names ===\n");
    char (*names)[8] = malloc(5000 * 8);
    Trie *root = node();
    for (int i = 0; i < 5000; i++) { make_name(i, names[i]); insert(root, names[i]); }
    printf("first names: %s %s %s %s %s ...\n", names[0], names[1], names[2], names[3], names[4]);
    printf("trie nodes = %ld, memory = %.1f KB  (%.1f nodes per name)\n", nodes_alive, nodes_alive * sizeof(Trie) / 1024.0, (double)nodes_alive / 5000);
    const char *pre[] = {"k", "ka", "kam", names[7]};
    char shown[4][8]; memcpy(shown[3], names[7], 3); shown[3][3] = 0;
    for (int i = 0; i < 3; i++) {
        int c = count_prefix(root, pre[i]);
        int lin = 0; size_t L = strlen(pre[i]);
        for (int j = 0; j < 5000; j++) if (strncmp(names[j], pre[i], L) == 0) lin++;
        printf("typed \"%s\": trie count = %d, strncmp scan count = %d  %s\n", pre[i], c, lin, c == lin ? "(match)" : "(MISMATCH)");
    }
    printf("autocomplete(\"%s\") first 5: ", "kam"); autocomplete(root, "kam", 5, 0); printf("\n");
    destroy(root); nodes_alive = 0; free(names);
}

static void section4(void)
{
    printf("=== Q6 scaling: prefix query of 3 letters ===\n");
    printf("%-8s %12s %14s %13s %12s %12s %12s\n", "names", "trie nodes", "trie memory", "array memory", "count (us)", "autocmp (us)", "strncmp scan(us)");
    bench(500, 1); bench(5000, 1); bench(50000, 1);
}

int main(int argc, char **argv)
{
    int sel = argc > 1 ? atoi(argv[1]) : 0;
    if (!sel || sel == 1) section1();
    if (!sel || sel == 2) section2();
    if (!sel || sel == 3) section3();
    if (!sel || sel == 4) section4();
    return 0;
}
