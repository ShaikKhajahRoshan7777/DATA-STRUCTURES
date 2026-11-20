/* Task 4 - Sorting forensics: original quicksort vs repaired quicksort vs stable sorts.
 *   ./quick_forensics          full evidence report
 *   ./quick_forensics stack    run ONLY the original quicksort on 10,000 sorted marks
 *                              (use:  ulimit -s 64 && ./quick_forensics stack   -> stack overflow) */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#define N 10000
typedef struct { int roll; int marks; } Rec;

static long cmpc;
static int depth, maxdepth;
static void swap(int *a, int *b) { int t = *a; *a = *b; *b = t; }

/* ---------- ORIGINAL (defective) quicksort, instrumented ---------- */
static void quick(int a[], int lo, int hi)
{
    if (lo >= hi) return;
    if (++depth > maxdepth) maxdepth = depth;
    int p = a[hi], i = lo - 1;
    for (int j = lo; j < hi; j++) { cmpc++; if (a[j] <= p) { i++; swap(&a[i], &a[j]); } }
    swap(&a[i + 1], &a[hi]);
    quick(a, lo, i);
    quick(a, i + 2, hi);
    depth--;
}

/* ---------- REPAIRED: median-of-three, 3-way partition, recurse on smaller part ---------- */
static int med3(int a, int b, int c)
{
    cmpc += 3;
    if ((a <= b && b <= c) || (c <= b && b <= a)) return b;
    if ((b <= a && a <= c) || (c <= a && a <= b)) return a;
    return c;
}
static void quick_fixed(int a[], int lo, int hi)
{
    if (++depth > maxdepth) maxdepth = depth;
    while (lo < hi) {
        int p = med3(a[lo], a[lo + (hi - lo) / 2], a[hi]);
        int lt = lo, gt = hi, i = lo;                 /* a[lo..lt-1] < p, a[lt..i-1] == p, a[gt+1..hi] > p */
        while (i <= gt) {
            cmpc++;
            if (a[i] < p) swap(&a[lt++], &a[i++]);
            else { cmpc++; if (a[i] > p) swap(&a[i], &a[gt--]); else i++; }
        }
        if (lt - lo < hi - gt) { quick_fixed(a, lo, lt - 1); lo = gt + 1; }  /* smaller part by recursion */
        else                   { quick_fixed(a, gt + 1, hi); hi = lt - 1; }  /* larger part by the loop   */
    }
    depth--;
}

/* ---------- stable alternatives on records ---------- */
static void quick_rec(Rec a[], int lo, int hi)        /* same algorithm as the original, on records */
{
    if (lo >= hi) return;
    int p = a[hi].marks, i = lo - 1;
    for (int j = lo; j < hi; j++)
        if (a[j].marks <= p) { i++; Rec t = a[i]; a[i] = a[j]; a[j] = t; }
    Rec t = a[i + 1]; a[i + 1] = a[hi]; a[hi] = t;
    quick_rec(a, lo, i); quick_rec(a, i + 2, hi);
}
static void msort(Rec a[], Rec t[], int lo, int hi, long *c)
{
    if (lo >= hi) return;
    int mid = lo + (hi - lo) / 2, i = lo, j = mid + 1, k = lo;
    msort(a, t, lo, mid, c); msort(a, t, mid + 1, hi, c);
    while (i <= mid && j <= hi) { (*c)++; t[k++] = (a[i].marks <= a[j].marks) ? a[i++] : a[j++]; }
    while (i <= mid) t[k++] = a[i++];
    while (j <= hi) t[k++] = a[j++];
    memcpy(&a[lo], &t[lo], (size_t)(hi - lo + 1) * sizeof(Rec));
}
static void counting_sort(Rec a[], Rec out[], int n)  /* marks 0..100, stable */
{
    int cnt[102] = {0};
    for (int i = 0; i < n; i++) cnt[a[i].marks + 1]++;
    for (int m = 0; m < 101; m++) cnt[m + 1] += cnt[m];
    for (int i = 0; i < n; i++) out[cnt[a[i].marks]++] = a[i];
}

static void print_recs(const char *label, Rec a[], int n)
{
    printf("%-16s", label);
    for (int i = 0; i < n; i++) printf(" R%d:%d", a[i].roll, a[i].marks);
    printf("\n");
}

int main(int argc, char **argv)
{
    static int base[N], work[N];
    srand(42);
    if (argc > 1 && strcmp(argv[1], "stack") == 0) {
        for (int i = 0; i < N; i++) base[i] = i / 100;           /* 10,000 already-sorted marks */
        quick(base, 0, N - 1);
        printf("finished without overflow, depth %d\n", maxdepth);
        return 0;
    }
    printf("== Task 4.2: comparisons and maximum recursion depth, n = %d, marks 0..100 ==\n", N);
    printf("%-26s %-8s %14s %10s\n", "Algorithm", "Input", "Comparisons", "MaxDepth");
    for (int mode = 0; mode < 2; mode++) {
        for (int i = 0; i < N; i++) base[i] = mode == 0 ? rand() % 101 : i / 100;   /* random / sorted */
        const char *in = mode == 0 ? "random" : "sorted";
        memcpy(work, base, sizeof base); cmpc = depth = maxdepth = 0; quick(work, 0, N - 1);
        printf("%-26s %-8s %14ld %10d\n", "Original quicksort", in, cmpc, maxdepth);
        memcpy(work, base, sizeof base); cmpc = depth = maxdepth = 0; quick_fixed(work, 0, N - 1);
        printf("%-26s %-8s %14ld %10d\n", "Repaired quicksort", in, cmpc, maxdepth);
    }

    printf("\n== Task 4.1: stability, 12 scripts, equal marks (roll numbers R1..R12) ==\n");
    int mk[12] = {70, 85, 70, 92, 85, 70, 60, 92, 85, 60, 70, 92};
    Rec r[12], a[12], t[12], o[12]; long c = 0;
    for (int i = 0; i < 12; i++) r[i] = (Rec){i + 1, mk[i]};
    print_recs("input order", r, 12);
    memcpy(a, r, sizeof r); quick_rec(a, 0, 11);          print_recs("original quick", a, 12);
    memcpy(a, r, sizeof r); msort(a, t, 0, 11, &c);       print_recs("merge sort", a, 12);
    counting_sort(r, o, 12);                              print_recs("counting sort", o, 12);

    printf("\n== Alternative: merge sort and counting sort on %d marks ==\n", N);
    Rec *big = malloc(N * sizeof *big), *tmp = malloc(N * sizeof *tmp);
    for (int mode = 0; mode < 2; mode++) {
        for (int i = 0; i < N; i++) big[i] = (Rec){i, mode == 0 ? rand() % 101 : i / 100};
        c = 0; msort(big, tmp, 0, N - 1, &c);
        printf("merge sort    %-7s comparisons = %ld\n", mode == 0 ? "random" : "sorted", c);
    }
    printf("counting sort (any input) comparisons = 0, passes: n + k + n = %d\n", N + 101 + N);
    free(big); free(tmp);
    return 0;
}
