/* Task 2.4 - expected probes: theory vs measurement (chaining and linear probing) */
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#define M 100003u

static uint64_t s = 88172645463325252ULL;
static uint32_t rnd(void) { s ^= s << 13; s ^= s >> 7; s ^= s << 17; return (uint32_t)(s >> 16); }

int main(void)
{
    double alphas[] = {0.5, 0.75, 0.9};
    printf("Each cell: theory / measured (M = %u buckets)\n", M);
    printf("%-6s | %-17s | %-17s | %-17s | %-17s\n", "alpha", "Chain succ", "Chain unsucc", "Linear succ", "Linear unsucc");
    for (int a = 0; a < 3; a++) {
        unsigned n = (unsigned)(alphas[a] * M);
        uint32_t *lp = calloc(M, sizeof *lp);          /* 0 = empty, key+1 stored */
        unsigned *cnt = calloc(M, sizeof *cnt);        /* chain lengths */
        uint32_t *keys = malloc(n * sizeof *keys);
        double chain_succ = 0, lin_succ = 0;
        for (unsigned i = 0; i < n; i++) {
            uint32_t k = rnd() | 1u; keys[i] = k;
            uint32_t h = (k * 2654435761u) % M;
            chain_succ += cnt[h] + 1; cnt[h]++;        /* appended at the end of its chain */
            unsigned p = 1;
            while (lp[h]) { h = (h + 1) % M; p++; }
            lp[h] = k; lin_succ += p;                  /* probes to find it later = probes to insert it */
        }
        double chain_un = 0, lin_un = 0;
        unsigned trials = 200000;
        for (unsigned t = 0; t < trials; t++) {
            uint32_t k = rnd() & ~1u;                  /* even key: never stored */
            uint32_t h = (k * 2654435761u) % M;
            chain_un += cnt[h];
            unsigned p = 1;
            while (lp[h]) { h = (h + 1) % M; p++; }
            lin_un += p;
        }
        double al = (double)n / M;
        printf("%-6.2f | %7.3f / %-7.3f | %7.3f / %-7.3f | %7.3f / %-7.3f | %7.3f / %-7.3f\n", alphas[a],
               1 + al / 2, chain_succ / n, al, chain_un / trials,
               0.5 * (1 + 1 / (1 - al)), lin_succ / n,
               0.5 * (1 + 1 / ((1 - al) * (1 - al))), lin_un / trials);
        free(lp); free(cnt); free(keys);
    }
    return 0;
}
