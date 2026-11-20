/* Task 2.3 - separate chaining with automatic rehashing (grow when load factor > 0.75) */
#include <stdio.h>
#include <stdlib.h>
typedef struct Node { unsigned key; struct Node *next; } Node;
typedef struct { Node **b; unsigned m, n; int rehashes; } Table;

static int is_prime(unsigned x) { if (x < 2) return 0; for (unsigned d = 2; d * d <= x; d++) if (x % d == 0) return 0; return 1; }
static unsigned next_prime(unsigned x) { while (!is_prime(x)) x++; return x; }

static void init(Table *t, unsigned m) { t->m = m; t->n = 0; t->rehashes = 0; t->b = calloc(m, sizeof *t->b); }

static void rehash(Table *t)
{
    unsigned nm = next_prime(2 * t->m);
    Node **nb = calloc(nm, sizeof *nb);
    for (unsigned i = 0; i < t->m; i++)                /* relink every node: no malloc, no free */
        for (Node *x = t->b[i]; x; ) {
            Node *nx = x->next;
            unsigned h = x->key % nm;
            x->next = nb[h]; nb[h] = x;
            x = nx;
        }
    free(t->b); t->b = nb; t->m = nm; t->rehashes++;
    printf("  rehash #%d at n=%u -> new table size %u (load %.2f)\n", t->rehashes, t->n, nm, (double)t->n / nm);
}

static void insert(Table *t, unsigned key)
{
    if ((double)(t->n + 1) / t->m > 0.75) rehash(t);
    Node *x = malloc(sizeof *x);
    x->key = key; x->next = t->b[key % t->m]; t->b[key % t->m] = x; t->n++;
}

static int find(const Table *t, unsigned key)
{
    for (Node *x = t->b[key % t->m]; x; x = x->next) if (x->key == key) return 1;
    return 0;
}

int main(void)
{
    Table t; init(&t, 11);
    for (unsigned k = 1; k <= 40000; k++) insert(&t, k * 7919u);
    int ok = 1;
    for (unsigned k = 1; k <= 40000; k++) if (!find(&t, k * 7919u)) ok = 0;
    printf("Final: n=%u, M=%u, load=%.3f, rehashes=%d, all keys found: %s\n", t.n, t.m, (double)t.n / t.m, t.rehashes, ok ? "YES" : "NO");
    for (unsigned i = 0; i < t.m; i++) while (t.b[i]) { Node *n = t.b[i]->next; free(t.b[i]); t.b[i] = n; }
    free(t.b);
    return 0;
}
