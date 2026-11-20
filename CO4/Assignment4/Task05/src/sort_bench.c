/* Task 5.1 - six sorting algorithms: time and comparisons.
 * Build: gcc -std=c11 -Wall -Wextra -O2 sort_bench.c -o sort_bench
 * Quick sort uses median-of-three + recursion on the smaller half (the repaired version of Task 4).
 * O(n^2) sorts are skipped for n = 1,000,000 (about 10^12 operations) and reported as N/A. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
typedef struct { int order_id; int amount; } Order;
static long cmpc;
#define LESS(x, y) (cmpc++, (x).amount < (y).amount)
static void swp(Order *a, Order *b) { Order t = *a; *a = *b; *b = t; }

static void bubble(Order *a, int n)
{
    for (int i = 0; i < n - 1; i++) {
        int sw = 0;
        for (int j = 0; j < n - 1 - i; j++) if (LESS(a[j + 1], a[j])) { swp(&a[j], &a[j + 1]); sw = 1; }
        if (!sw) break;
    }
}
static void insertion(Order *a, int n)
{
    for (int i = 1; i < n; i++) {
        Order k = a[i]; int j = i - 1;
        while (j >= 0 && LESS(k, a[j])) { a[j + 1] = a[j]; j--; }
        a[j + 1] = k;
    }
}
static void selection(Order *a, int n)
{
    for (int i = 0; i < n - 1; i++) {
        int m = i;
        for (int j = i + 1; j < n; j++) if (LESS(a[j], a[m])) m = j;
        if (m != i) swp(&a[i], &a[m]);
    }
}
static void msort(Order *a, Order *t, int lo, int hi)
{
    if (lo >= hi) return;
    int mid = lo + (hi - lo) / 2, i = lo, j = mid + 1, k = lo;
    msort(a, t, lo, mid); msort(a, t, mid + 1, hi);
    while (i <= mid && j <= hi) { cmpc++; t[k++] = (a[i].amount <= a[j].amount) ? a[i++] : a[j++]; }
    while (i <= mid) t[k++] = a[i++];
    while (j <= hi) t[k++] = a[j++];
    memcpy(&a[lo], &t[lo], (size_t)(hi - lo + 1) * sizeof(Order));
}
static void merge_sort(Order *a, int n) { Order *t = malloc((size_t)n * sizeof *t); msort(a, t, 0, n - 1); free(t); }

static void qs(Order *a, int lo, int hi)
{
    while (lo < hi) {
        if (hi - lo < 16) {                                    /* small range: insertion sort (also makes the sentinels safe) */
            for (int x = lo + 1; x <= hi; x++) {
                Order k = a[x]; int y = x - 1;
                while (y >= lo && LESS(k, a[y])) { a[y + 1] = a[y]; y--; }
                a[y + 1] = k;
            }
            return;
        }
        int mid = lo + (hi - lo) / 2;
        if (LESS(a[mid], a[lo])) swp(&a[mid], &a[lo]);          /* median of three -> a[mid] */
        if (LESS(a[hi], a[lo])) swp(&a[hi], &a[lo]);
        if (LESS(a[hi], a[mid])) swp(&a[hi], &a[mid]);
        swp(&a[mid], &a[hi - 1]);
        int p = a[hi - 1].amount, i = lo, j = hi - 1;
        for (;;) {
            while (cmpc++, a[++i].amount < p) ;
            while (cmpc++, a[--j].amount > p) ;
            if (i >= j) break;
            swp(&a[i], &a[j]);
        }
        swp(&a[i], &a[hi - 1]);
        if (i - lo < hi - i) { qs(a, lo, i - 1); lo = i + 1; } else { qs(a, i + 1, hi); hi = i - 1; }
    }
}
static void quick(Order *a, int n)
{
    if (n < 4) { insertion(a, n); return; }
    qs(a, 0, n - 1);
}
static void sift(Order *a, int n, int i)
{
    for (;;) {
        int l = 2 * i + 1, r = l + 1, b = i;
        if (l < n && LESS(a[b], a[l])) b = l;
        if (r < n && LESS(a[b], a[r])) b = r;
        if (b == i) return;
        swp(&a[i], &a[b]); i = b;
    }
}
static void heap(Order *a, int n)
{
    for (int i = n / 2 - 1; i >= 0; i--) sift(a, n, i);
    for (int e = n - 1; e > 0; e--) { swp(&a[0], &a[e]); sift(a, e, 0); }
}

typedef void (*sortfn)(Order *, int);
static int sorted_ok(const Order *a, int n) { for (int i = 1; i < n; i++) if (a[i - 1].amount > a[i].amount) return 0; return 1; }

int main(void)
{
    const char *names[] = {"Bubble", "Insertion", "Selection", "Merge", "Quick", "Heap"};
    sortfn fn[] = {bubble, insertion, selection, merge_sort, quick, heap};
    int quadratic[] = {1, 1, 1, 0, 0, 0};
    int sizes[] = {1000, 100000, 1000000};
    const char *pat[] = {"random", "sorted", "reverse"};
    srand(11);
    printf("algorithm,n,input,comparisons,seconds\n");
    for (int s = 0; s < 3; s++) {
        int n = sizes[s];
        Order *base = malloc((size_t)n * sizeof *base), *w = malloc((size_t)n * sizeof *w);
        for (int p = 0; p < 3; p++) {
            for (int i = 0; i < n; i++) base[i] = (Order){i, p == 0 ? rand() % 100000 : (p == 1 ? i : n - i)};
            for (int f = 0; f < 6; f++) {
                if (quadratic[f] && n > 100000) { printf("%s,%d,%s,NA,NA\n", names[f], n, pat[p]); continue; }
                memcpy(w, base, (size_t)n * sizeof *w);
                cmpc = 0; clock_t t0 = clock();
                fn[f](w, n);
                double sec = (double)(clock() - t0) / CLOCKS_PER_SEC;
                if (!sorted_ok(w, n)) { fprintf(stderr, "%s FAILED\n", names[f]); return 1; }
                printf("%s,%d,%s,%ld,%.4f\n", names[f], n, pat[p], cmpc, sec);
                fflush(stdout);
            }
        }
        free(base); free(w);
    }
    return 0;
}
