/* Task 3.4 - fairness: equal severity is served in order of arrival.
 * The key is the pair (severity, arrival sequence). Higher severity wins; on a tie the
 * SMALLER arrival number wins. The sequence number is unique, so no two keys are equal. */
#include <stdio.h>
#define MAX 32
typedef struct { int severity; int seq; int patient; } Case;
Case heap[MAX];
int size = 0, next_seq = 0;

static int before(Case a, Case b)           /* does a have to leave before b? */
{
    return a.severity > b.severity || (a.severity == b.severity && a.seq < b.seq);
}
static void swap(Case *a, Case *b) { Case t = *a; *a = *b; *b = t; }

void push(int severity, int patient)
{
    if (size == MAX) return;
    heap[size] = (Case){severity, next_seq++, patient};
    for (int i = size++; i > 0 && before(heap[i], heap[(i - 1) / 2]); i = (i - 1) / 2)
        swap(&heap[i], &heap[(i - 1) / 2]);
}

Case pop(void)
{
    Case top = heap[0];
    heap[0] = heap[--size];
    for (int i = 0;;) {
        int l = 2 * i + 1, r = l + 1, b = i;
        if (l < size && before(heap[l], heap[b])) b = l;
        if (r < size && before(heap[r], heap[b])) b = r;
        if (b == i) break;
        swap(&heap[i], &heap[b]); i = b;
    }
    return top;
}

int main(void)
{
    int sev[] = {5, 9, 5, 9, 5, 3, 9, 5};                /* many ties on purpose */
    for (int p = 0; p < 8; p++) push(sev[p], 201 + p);
    printf("Arrival order : ");
    for (int p = 0; p < 8; p++) printf("P%d(%d) ", 201 + p, sev[p]);
    printf("\nTreatment order: ");
    while (size) { Case c = pop(); printf("P%d(%d) ", c.patient, c.severity); }
    printf("\n");
    return 0;
}
