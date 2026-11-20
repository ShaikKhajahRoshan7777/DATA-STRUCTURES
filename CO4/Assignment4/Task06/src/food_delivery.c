/* Task 6 - Order processing for a food-delivery platform.
 *   Hash table (chaining, multiplicative hash, auto-grow)  -> find an order by ID in O(1) average
 *   Indexed binary min-heap on (promised time, arrival)    -> most delayed order first, O(log n)
 *   Every order stores its own heap position               -> cancel = O(1) lookup + O(log n) heap removal
 *   Stable merge sort on (restaurant, amount)              -> hourly report, equal keys keep arrival order
 * Build: gcc -std=c11 -Wall -Wextra -O2 food_delivery.c -o food_delivery
 * Run  : ./food_delivery 50000    (or 100000)                                                         */
#define _POSIX_C_SOURCE 200809L
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

typedef struct Order {
    int id, restaurant, amount, arrival;
    long deadline;                 /* promised delivery time, seconds from start of the hour */
    int heap_pos;                  /* index in the heap, -1 when not in the heap */
    char status;                   /* 'P' pending, 'A' assigned, 'C' cancelled */
    struct Order *hnext;           /* hash-chain link */
} Order;

/* ------------------------- hash table ------------------------- */
static Order **tab; static unsigned bits, tabsize, count;
static unsigned hidx(int id, unsigned b) { return ((unsigned)id * 2654435769u) >> (32 - b); }   /* Knuth multiplicative */

static void table_init(unsigned b) { bits = b; tabsize = 1u << b; count = 0; tab = calloc(tabsize, sizeof *tab); }
static void table_grow(void)                       /* double the table, relink nodes (no allocation per node) */
{
    unsigned nb = bits + 1; Order **nt = calloc(1u << nb, sizeof *nt);
    for (unsigned i = 0; i < tabsize; i++)
        for (Order *o = tab[i]; o; ) { Order *nx = o->hnext; unsigned h = hidx(o->id, nb); o->hnext = nt[h]; nt[h] = o; o = nx; }
    free(tab); tab = nt; bits = nb; tabsize = 1u << nb;
}
static void table_put(Order *o)
{
    if (count + 1 > tabsize / 4 * 3) table_grow();     /* keep load factor <= 0.75 */
    unsigned h = hidx(o->id, bits); o->hnext = tab[h]; tab[h] = o; count++;
}
static Order *table_get(int id)
{
    for (Order *o = tab[hidx(id, bits)]; o; o = o->hnext) if (o->id == id) return o;
    return NULL;
}
static unsigned longest_chain(void)
{
    unsigned best = 0;
    for (unsigned i = 0; i < tabsize; i++) { unsigned c = 0; for (Order *o = tab[i]; o; o = o->hnext) c++; if (c > best) best = c; }
    return best;
}

/* ------------------------- indexed min-heap ------------------------- */
static Order **hp; static int hn;
static int earlier(const Order *a, const Order *b) { return a->deadline < b->deadline || (a->deadline == b->deadline && a->arrival < b->arrival); }
static void hset(int i, Order *o) { hp[i] = o; o->heap_pos = i; }
static void sift_up(int i)
{
    Order *x = hp[i];
    while (i > 0 && earlier(x, hp[(i - 1) / 2])) { hset(i, hp[(i - 1) / 2]); i = (i - 1) / 2; }
    hset(i, x);
}
static void sift_down(int i)
{
    Order *x = hp[i];
    for (;;) {
        int l = 2 * i + 1, r = l + 1, c = l;
        if (l >= hn) break;
        if (r < hn && earlier(hp[r], hp[l])) c = r;
        if (!earlier(hp[c], x)) break;
        hset(i, hp[c]); i = c;
    }
    hset(i, x);
}
static void heap_push(Order *o) { hp[hn] = o; o->heap_pos = hn; sift_up(hn++); }
static void heap_remove(int i)                     /* remove the element at position i */
{
    Order *gone = hp[i]; gone->heap_pos = -1;
    Order *last = hp[--hn];
    if (i == hn) return;
    hset(i, last); sift_up(i); sift_down(last->heap_pos);
}

/* ------------------------- the four operations ------------------------- */
static Order *pool; static int npool;
static void place(int id, int rest, int amount, long deadline)          /* O(1) avg + O(log n) */
{
    Order *o = &pool[npool];
    *o = (Order){id, rest, amount, npool, deadline, -1, 'P', NULL};
    npool++; table_put(o); heap_push(o);
}
static Order *assign(void)                                                /* O(log n) */
{
    if (hn == 0) return NULL;
    Order *o = hp[0]; heap_remove(0); o->status = 'A'; return o;
}
static int cancel(int id)                                                 /* O(1) avg + O(log n) */
{
    Order *o = table_get(id);
    if (!o || o->status != 'P') return 0;
    heap_remove(o->heap_pos); o->status = 'C'; return 1;
}
static int by_rest_amount(const Order *a, const Order *b) { return a->restaurant != b->restaurant ? a->restaurant - b->restaurant : a->amount - b->amount; }
static void msort(Order **a, Order **t, int lo, int hi)                  /* stable: <= takes the left element */
{
    if (lo >= hi) return;
    int mid = lo + (hi - lo) / 2, i = lo, j = mid + 1, k = lo;
    msort(a, t, lo, mid); msort(a, t, mid + 1, hi);
    while (i <= mid && j <= hi) t[k++] = (by_rest_amount(a[i], a[j]) <= 0) ? a[i++] : a[j++];
    while (i <= mid) t[k++] = a[i++];
    while (j <= hi) t[k++] = a[j++];
    memcpy(&a[lo], &t[lo], (size_t)(hi - lo + 1) * sizeof *a);
}
static Order **report(int *outn)                                          /* O(n log n) */
{
    int n = 0; Order **a = malloc((size_t)npool * sizeof *a), **t = malloc((size_t)npool * sizeof *t);
    for (int i = 0; i < npool; i++) if (pool[i].status != 'C') a[n++] = &pool[i];   /* arrival order in */
    msort(a, t, 0, n - 1); free(t); *outn = n; return a;
}

/* ------------------------- measurement ------------------------- */
static double now(void) { struct timespec ts; clock_gettime(CLOCK_MONOTONIC, &ts); return ts.tv_sec + ts.tv_nsec * 1e-9; }
static int cmp_deadline(const void *x, const void *y) { long a = ((const Order *)x)->deadline, b = ((const Order *)y)->deadline; return (a > b) - (a < b); }

int main(int argc, char **argv)
{
    int N = argc > 1 ? atoi(argv[1]) : 50000;
    srand(2026);
    pool = malloc((size_t)N * sizeof *pool); hp = malloc((size_t)N * sizeof *hp); table_init(10);
    int *ids = malloc((size_t)N * sizeof *ids);
    double t0, tp, tl, tc, ta, tr;

    t0 = now();
    for (int i = 0; i < N; i++) {
        ids[i] = 1000000 + i * 3;
        place(ids[i], rand() % 500, 100 + rand() % 1900, (long)(i * 3600L / N) + 1800 + rand() % 1800);
    }
    tp = now() - t0;

    int found = 0; t0 = now();
    for (int i = 0; i < N; i++) found += table_get(ids[rand() % N]) != NULL;
    tl = now() - t0;

    int ncancel = 0, want_cancel = N / 10; t0 = now();
    for (int i = 0; i < want_cancel; i++) ncancel += cancel(ids[rand() % N]);
    tc = now() - t0;

    int nassign = 0, want_assign = N * 8 / 10; long prev = -1; int ordered = 1, bad = 0; t0 = now();
    for (int i = 0; i < want_assign; i++) {
        Order *o = assign(); if (!o) break;
        if (o->deadline < prev) ordered = 0;                  /* must come out most-delayed first */
        if (o->status == 'C') bad = 1;
        prev = o->deadline; nassign++;
    }
    ta = now() - t0;

    int nrep; t0 = now(); Order **rep = report(&nrep); tr = now() - t0;
    int sorted = 1, stable = 1;
    for (int i = 1; i < nrep; i++) {
        int c = by_rest_amount(rep[i - 1], rep[i]);
        if (c > 0) sorted = 0;
        if (c == 0 && rep[i - 1]->arrival > rep[i]->arrival) stable = 0;
    }
    int heap_ok = 1;
    for (int i = 0; i < hn; i++) { if (hp[i]->heap_pos != i || hp[i]->status != 'P') heap_ok = 0; if (i && earlier(hp[i], hp[(i - 1) / 2])) heap_ok = 0; }

    printf("=== Food-delivery simulation, N = %d orders ===\n", N);
    printf("%-26s %12s %14s\n", "Operation", "total (ms)", "per op (us)");
    printf("%-26s %12.2f %14.3f   (%d orders)\n", "place (hash + heap)", tp * 1e3, tp * 1e6 / N, N);
    printf("%-26s %12.2f %14.3f   (%d found)\n", "look-up by order ID", tl * 1e3, tl * 1e6 / N, found);
    printf("%-26s %12.2f %14.3f   (%d cancelled)\n", "cancel", tc * 1e3, tc * 1e6 / want_cancel, ncancel);
    printf("%-26s %12.2f %14.3f   (%d assigned)\n", "assign to rider", ta * 1e3, ta * 1e6 / nassign, nassign);
    printf("%-26s %12.2f %14s   (%d rows)\n", "hourly report (stable)", tr * 1e3, "-", nrep);
    printf("hash table: size %u, load %.2f, longest chain %u\n", tabsize, (double)count / tabsize, longest_chain());
    printf("orders still waiting in heap: %d | sizeof(Order) = %zu bytes\n", hn, sizeof(Order));
    printf("CHECKS  assigned most-delayed-first ........ %s\n", ordered ? "PASS" : "FAIL");
    printf("        no cancelled order assigned ........ %s\n", !bad ? "PASS" : "FAIL");
    printf("        heap valid, positions exact ........ %s\n", heap_ok ? "PASS" : "FAIL");
    printf("        report sorted (restaurant, amount) . %s\n", sorted ? "PASS" : "FAIL");
    printf("        equal keys keep arrival order ...... %s\n", stable ? "PASS" : "FAIL");
    printf("        placed = assigned+cancelled+waiting  %s\n", (nassign + ncancel + hn == N) ? "PASS" : "FAIL");

    /* ---- baseline for the 'Alternative Concept': one array, re-sorted whenever a rider is free ---- */
    Order *arr = malloc((size_t)N * sizeof *arr); memcpy(arr, pool, (size_t)N * sizeof *arr);
    int reps = 5; t0 = now();
    for (int r = 0; r < reps; r++) qsort(arr, (size_t)N, sizeof *arr, cmp_deadline);
    double tsort = (now() - t0) / reps;
    volatile int hit = 0; t0 = now();
    for (int r = 0; r < 200; r++) { int want = ids[rand() % N]; for (int i = 0; i < N; i++) if (arr[i].id == want) { hit += 1; break; } }
    double tscan = (now() - t0) / 200;
    printf("\nBASELINE single array: re-sort per assignment = %.2f ms\n", tsort * 1e3);
    printf("   -> %d assignments = %.1f s   (heap: %.3f s)\n", nassign, tsort * nassign, ta);
    printf("BASELINE single array: linear look-up by ID = %.1f us\n", tscan * 1e6);
    printf("   (hash table: %.3f us per look-up)\n", tl * 1e6 / N);
    free(arr); free(rep); free(ids); free(pool); free(hp); free(tab);
    return 0;
}
