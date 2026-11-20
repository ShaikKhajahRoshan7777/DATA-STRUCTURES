#include <stdio.h>
#define MAX 32
typedef struct { int severity; int patient; } Case; /* higher = more urgent */
Case heap[MAX];
int size = 0;
void swap(Case *a, Case *b) { Case t = *a; *a = *b; *b = t; }

void push(int severity, int patient)
{
    if (size == MAX) return;
    heap[size] = (Case){severity, patient};
    int i = size++;
    while (i > 0 && heap[(i - 1) / 2].severity < heap[i].severity) {   /* TODO 1: sift up */
        swap(&heap[(i - 1) / 2], &heap[i]);
        i = (i - 1) / 2;
    }
}

Case pop(void)
{
    Case top = heap[0];
    heap[0] = heap[--size];
    int i = 0;
    for (;;) {                                                          /* TODO 2: sift down */
        int l = 2 * i + 1, r = l + 1, big = i;
        if (l < size && heap[l].severity > heap[big].severity) big = l;
        if (r < size && heap[r].severity > heap[big].severity) big = r;
        if (big == i) break;
        swap(&heap[i], &heap[big]);
        i = big;
    }
    return top;
}

static void show(void)
{
    printf("  heap: [");
    for (int i = 0; i < size; i++) printf("%s%d", i ? ", " : "", heap[i].severity);
    printf("]\n");
}

int main(void)
{
    int sev[] = {3, 9, 5, 7, 1, 8};
    for (int p = 0; p < 6; p++) { push(sev[p], 101 + p); printf("push %d", sev[p]); show(); }
    while (size) {
        Case c = pop();
        printf("P%d(%d) ", c.patient, c.severity);
    }
    printf("\n");
    return 0;
}
