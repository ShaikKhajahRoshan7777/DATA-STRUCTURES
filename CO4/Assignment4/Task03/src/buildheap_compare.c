/* Task 3.3 - build-heap by repeated sift-down (Floyd, O(n)) versus n insertions (O(n log n)).
 * Counts key comparisons and swaps on random data. Min-heap of ints. */
#include <stdio.h>
#include <stdlib.h>
static long cmp_c, swp_c;

static void sift_down(int *a, int n, int i)
{
    for (;;) {
        int l = 2 * i + 1, r = l + 1, s = i;
        if (l < n) { cmp_c++; if (a[l] < a[s]) s = l; }
        if (r < n) { cmp_c++; if (a[r] < a[s]) s = r; }
        if (s == i) return;
        int t = a[i]; a[i] = a[s]; a[s] = t; swp_c++;
        i = s;
    }
}
static void floyd(int *a, int n) { for (int i = n / 2 - 1; i >= 0; i--) sift_down(a, n, i); }

static void insert_all(int *a, int n)            /* insert one by one with sift-up, in place */
{
    for (int k = 1; k < n; k++)
        for (int i = k; i > 0; i = (i - 1) / 2) {
            cmp_c++;
            if (a[i] < a[(i - 1) / 2]) { int t = a[i]; a[i] = a[(i - 1) / 2]; a[(i - 1) / 2] = t; swp_c++; }
            else break;
        }
}

int main(void)
{
    int sizes[] = {1000, 10000, 100000, 1000000};
    srand(7);
    printf("%-9s | %-26s | %-26s | %s\n", "n", "Floyd sift-down (cmp, swp)", "n x insert (cmp, swp)", "cmp/n  (Floyd, Insert)");
    for (int s = 0; s < 4; s++) {
        int n = sizes[s];
        int *a = malloc(n * sizeof *a), *b = malloc(n * sizeof *b);
        for (int i = 0; i < n; i++) a[i] = b[i] = rand();
        cmp_c = swp_c = 0; floyd(a, n);      long c1 = cmp_c, s1 = swp_c;
        cmp_c = swp_c = 0; insert_all(b, n); long c2 = cmp_c, s2 = swp_c;
        printf("%-9d | %12ld, %-12ld | %12ld, %-12ld | %.2f, %.2f\n", n, c1, s1, c2, s2, (double)c1 / n, (double)c2 / n);
        free(a); free(b);
    }
    /* worst case for n inserts into a MIN-heap: strictly decreasing input (every new key climbs to the root) */
    int n = 1000000, *w = malloc(n * sizeof *w);
    for (int i = 0; i < n; i++) w[i] = n - i;
    cmp_c = swp_c = 0; insert_all(w, n);
    printf("worst-case input (descending), n=%d: insert cmp=%ld swp=%ld (%.2f swaps per key, ~log2 n)\n", n, cmp_c, swp_c, (double)swp_c / n);
    free(w);
    return 0;
}
