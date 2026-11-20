/* Build: gcc -std=c11 -Wall -Wextra merge_stable.c -o merge_stable
 * Strict (<) variant to show what breaks:  gcc -std=c11 -Wall -Wextra -DSTRICT merge_stable.c -o merge_strict */
#include <stdio.h>
#include <string.h>
typedef struct { int order_id; int amount; } Order;
long comparisons = 0;

void merge(Order a[], Order tmp[], int lo, int mid, int hi)
{
    int i = lo, j = mid + 1, k = lo;                       /* TODO 1 */
    while (i <= mid && j <= hi) {
        comparisons++;
#ifdef STRICT
        if (a[i].amount < a[j].amount) tmp[k++] = a[i++];  /* equal -> takes RIGHT first: unstable */
#else
        if (a[i].amount <= a[j].amount) tmp[k++] = a[i++]; /* equal -> takes LEFT first: stable */
#endif
        else tmp[k++] = a[j++];
    }
    while (i <= mid) tmp[k++] = a[i++];
    while (j <= hi) tmp[k++] = a[j++];
    memcpy(&a[lo], &tmp[lo], (size_t)(hi - lo + 1) * sizeof(Order));
}

void merge_sort(Order a[], Order tmp[], int lo, int hi)
{
    if (lo >= hi) return;
    int mid = lo + (hi - lo) / 2;
    merge_sort(a, tmp, lo, mid);
    merge_sort(a, tmp, mid + 1, hi);
    merge(a, tmp, lo, mid, hi);
}

int main(void)
{
    Order o[8] = {{1, 450}, {2, 120}, {3, 450}, {4, 990},
                  {5, 120}, {6, 300}, {7, 780}, {8, 300}};
    Order tmp[8];
    merge_sort(o, tmp, 0, 7);
    for (int i = 0; i < 8; i++) printf("#%d:%d ", o[i].order_id, o[i].amount);
    printf("\ncomparisons = %ld\n", comparisons);
    return 0;
}
