/* Task 1.2 - Compare the poor state-code hash with better hash functions
 * on 100,000 generated vehicle registration numbers (e.g. "TN09AB1234").
 * Build: gcc -std=c11 -Wall -Wextra -O2 hash_compare.c -o hash_compare -lm */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <math.h>
#include <time.h>

#define N 100000
#define LEN 11
#define BAD_M 1000
#define GOOD_M 100003u            /* prime, load factor = 0.9999 */

static char keys[N + 64][LEN];

/* ---------- the four hash functions ---------- */
static unsigned h_bad(const char *reg) { return (unsigned)(reg[0] + reg[1]) % BAD_M; }

static unsigned h_poly(const char *s)             /* polynomial rolling, base 31 */
{
    uint32_t h = 0;
    while (*s) h = h * 31u + (unsigned char)*s++;
    return h % GOOD_M;
}

static unsigned h_mult(const char *s)             /* h = floor(M * frac(k * A)) */
{
    uint32_t k = 0;                               /* number formed from the registration */
    while (*s) k = k * 37u + (unsigned char)*s++;
    const double A = 0.6180339887498949;
    double x = (double)k * A;
    return (unsigned)(GOOD_M * (x - floor(x)));
}

static unsigned h_fnv(const char *s)              /* FNV-1a, 32-bit */
{
    uint32_t h = 2166136261u;
    while (*s) { h ^= (unsigned char)*s++; h *= 16777619u; }
    return h % GOOD_M;
}

/* ---------- data generation: 80% Tamil Nadu, 20% other states ---------- */
static int cmp(const void *a, const void *b) { return strcmp((const char *)a, (const char *)b); }

static void make_key(char *out)
{
    static const char *other[] = {"KA", "KL", "AP", "MH", "DL"};
    int r = rand() % 100;
    const char *st = (r < 80) ? "TN" : other[rand() % 5];
    snprintf(out, LEN, "%s%02u%c%c%04u", st, (unsigned)(rand() % 99 + 1),
             'A' + rand() % 26, 'A' + rand() % 26, (unsigned)(rand() % 10000));
}

static void generate(void)
{
    int n = 0;
    srand(2026);
    while (n < N) {                               /* top-up until N distinct numbers */
        for (int i = n; i < N; i++) make_key(keys[i]);
        qsort(keys, N, LEN, cmp);
        int w = 0;
        for (int i = 0; i < N; i++)
            if (i == 0 || strcmp(keys[i], keys[w - 1]) != 0) strcpy(keys[w++], keys[i]);
        n = w;
    }
}

/* ---------- measurement ---------- */
typedef unsigned (*hfn)(const char *);

static void measure(const char *name, hfn f, unsigned m)
{
    unsigned *cnt = calloc(m, sizeof *cnt);
    for (int i = 0; i < N; i++) cnt[f(keys[i])]++;
    unsigned longest = 0, used = 0;
    double succ = 0;                              /* avg comparisons, successful search */
    for (unsigned b = 0; b < m; b++) {
        if (cnt[b] > longest) longest = cnt[b];
        if (cnt[b]) used++;
        succ += (double)cnt[b] * (cnt[b] + 1) / 2.0;
    }
    succ /= N;

    volatile unsigned sink = 0;                   /* time to compute the hash */
    clock_t t0 = clock();
    for (int rep = 0; rep < 50; rep++)
        for (int i = 0; i < N; i++) sink += f(keys[i]);
    double ns = (double)(clock() - t0) / CLOCKS_PER_SEC * 1e9 / (50.0 * N);

    printf("%-26s %7u %9u %9u %10.2f %12.2f %9.2f %8.1f\n", name, m, used, longest,
           (double)N / m, (double)N / used, succ, ns);
    free(cnt);
}

int main(void)
{
    generate();
    printf("Generated %d distinct registration numbers, e.g. %s %s %s\n\n", N, keys[0], keys[N / 2], keys[N - 1]);

    int seen[1000] = {0}, distinct = 0;           /* how many outputs can the bad hash produce? */
    for (int c1 = 'A'; c1 <= 'Z'; c1++)
        for (int c2 = 'A'; c2 <= 'Z'; c2++)
            if (!seen[(c1 + c2) % BAD_M]) { seen[(c1 + c2) % BAD_M] = 1; distinct++; }
    printf("Max distinct outputs of (reg[0]+reg[1])%%1000 for letters A-Z: %d of 1000 buckets\n\n", distinct);

    printf("%-26s %7s %9s %9s %10s %12s %9s %8s\n", "Hash function", "Buckets", "NonEmpty",
           "LongChain", "Avg(all)", "Avg(nonempty)", "SuccCmp", "ns/hash");
    measure("Original (state code)", h_bad, BAD_M);
    measure("Polynomial rolling b=31", h_poly, GOOD_M);
    measure("Multiplication (A=.618)", h_mult, GOOD_M);
    measure("FNV-1a (32-bit)", h_fnv, GOOD_M);
    return 0;
}
