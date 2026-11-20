/* Task 5.2 - merge sort with OpenMP tasks, 10,000,000 orders, 1/2/4/8 threads.
 * Build: gcc -std=c11 -Wall -Wextra -O2 -fopenmp parallel_merge.c -o parallel_merge   */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <omp.h>
#define N 10000000
#define CUTOFF 20000            /* below this size sort sequentially: task overhead would dominate */
typedef struct { int order_id; int amount; } Order;

static void merge(Order *a, Order *t, int lo, int mid, int hi)
{
    int i = lo, j = mid + 1, k = lo;
    while (i <= mid && j <= hi) t[k++] = (a[i].amount <= a[j].amount) ? a[i++] : a[j++];
    while (i <= mid) t[k++] = a[i++];
    while (j <= hi) t[k++] = a[j++];
    memcpy(&a[lo], &t[lo], (size_t)(hi - lo + 1) * sizeof(Order));
}
static void msort_seq(Order *a, Order *t, int lo, int hi)
{
    if (lo >= hi) return;
    int mid = lo + (hi - lo) / 2;
    msort_seq(a, t, lo, mid); msort_seq(a, t, mid + 1, hi);
    merge(a, t, lo, mid, hi);
}
static void msort_par(Order *a, Order *t, int lo, int hi)
{
    if (hi - lo < CUTOFF) { msort_seq(a, t, lo, hi); return; }
    int mid = lo + (hi - lo) / 2;
    #pragma omp task shared(a, t)
    msort_par(a, t, lo, mid);
    #pragma omp task shared(a, t)
    msort_par(a, t, mid + 1, hi);
    #pragma omp taskwait
    merge(a, t, lo, mid, hi);
}

int main(void)
{
    Order *base = malloc((size_t)N * sizeof *base), *a = malloc((size_t)N * sizeof *a), *t = malloc((size_t)N * sizeof *t);
    srand(5);
    for (int i = 0; i < N; i++) base[i] = (Order){i, rand() % 1000000};
    int threads[] = {1, 2, 4, 8};
    double t1 = 0;
    printf("hardware threads reported by OpenMP: %d\n", omp_get_num_procs());
    printf("%-8s %-12s %-9s %-11s\n", "threads", "seconds", "speed-up", "efficiency");
    for (int k = 0; k < 4; k++) {
        double best = 1e9;
        for (int rep = 0; rep < 3; rep++) {                  /* best of 3 runs */
            memcpy(a, base, (size_t)N * sizeof *a);
            omp_set_num_threads(threads[k]);
            double t0 = omp_get_wtime();
            #pragma omp parallel
            #pragma omp single
            msort_par(a, t, 0, N - 1);
            double el = omp_get_wtime() - t0;
            if (el < best) best = el;
        }
        for (int i = 1; i < N; i++) if (a[i - 1].amount > a[i].amount) { printf("NOT SORTED\n"); return 1; }
        if (k == 0) t1 = best;
        printf("%-8d %-12.3f %-9.2f %-11.2f\n", threads[k], best, t1 / best, t1 / best / threads[k]);
    }
    /* cost of the final, sequential merge of the two halves (the part that cannot be parallelised) */
    memcpy(a, base, (size_t)N * sizeof *a);
    msort_seq(a, t, 0, N / 2 - 1); msort_seq(a, t, N / 2, N - 1);
    double t0 = omp_get_wtime(); merge(a, t, 0, N / 2 - 1, N - 1); double fm = omp_get_wtime() - t0;
    printf("final sequential merge alone: %.3f s = %.1f%% of the 1-thread time\n", fm, 100.0 * fm / t1);
    free(base); free(a); free(t);
    return 0;
}
