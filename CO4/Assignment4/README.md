# CSA03 – Data Structures · Assignment 4 (CO4)
**Designing Fast Storage and Ordering of Data** – hashing, collision resolution, heaps, priority queues, sorting and parallel sorting.

| | |
|---|---|
| **Name** | `<YOUR NAME>` |
| **Register number** | `<YOUR REGISTER NUMBER>` |
| **Compiler** | `gcc 13.3.0` (Ubuntu 24.04) – check yours with `gcc --version` and edit this line |
| **Editor / terminal** | Visual Studio Code, integrated terminal |
| **Compile command** | `gcc -std=c11 -Wall -Wextra <file>.c -o <name>` (add `-O2` for the benchmarks, `-fopenmp` for Task 5.2, `-fsanitize=address -g` where stated, `-lm` for Task 1) |

> Rename this folder to `CSA03-<RegisterNumber>-Assignment4` before pushing to GitHub.

## Folder layout
```
CSA03-<RegisterNumber>-Assignment4/
├── README.md
├── Task01/  src/ output/ screenshots/     hash function design review
├── Task02/  src/ output/ screenshots/     collision strategy, load factor, probes
├── Task03/  src/ output/ screenshots/     heaps and priority queues
├── Task04/  src/ output/ screenshots/     sorting forensics
├── Task05/  src/ output/ screenshots/     sorting comparison, parallel merge sort
└── Task06/  src/ output/ screenshots/     food-delivery design challenge
```

## How to build and run each program
Open the folder in VS Code → open the integrated terminal (Ctrl+`) → `cd TaskNN/src`.

| Task | Program | Compile | Run | Result |
|---|---|---|---|---|
| 1 | `hash_compare.c` | `gcc -std=c11 -Wall -Wextra -O2 hash_compare.c -o hash_compare -lm` | `./hash_compare` | Original hash: longest chain 80,137 of 100,000. Polynomial / multiplication / FNV-1a: longest chain 7 / 7 / 8. |
| 2 | `predict_probing.c` | `gcc -std=c11 -Wall -Wextra predict_probing.c -o predict_probing` | `./predict_probing` | `42@2(1) 17@7(1) 52@3(2) 27@8(2) 99@9(1) 62@4(3)` |
| 2 | `library_chaining.c` (Complete the Code) | `gcc -std=c11 -Wall -Wextra -g -fsanitize=address library_chaining.c -o library_chaining` | `./library_chaining` | `0200130`, CSE1044 found in 3 probes, CSE9999 not found in 0 probes, ASan/LSan clean |
| 2 | `probe_experiment.c` | `gcc ... -O2 probe_experiment.c -o probe_experiment` | `./probe_experiment` | Measured probes match the theory formulas |
| 2 | `rehash_demo.c` | `gcc ... -fsanitize=address -g rehash_demo.c -o rehash_demo` | `./rehash_demo` | 13 rehashes for 40,000 inserts, all keys found |
| 3 | `predict_buildheap.c` | `gcc ... predict_buildheap.c -o predict_buildheap` | `./predict_buildheap` | `1 4 2 9 8 7 6` (4 swaps) |
| 3 | `triage_heap.c` (Complete the Code) | `gcc ... triage_heap.c -o triage_heap` | `./triage_heap` | `P102(9) P106(8) P104(7) P103(5) P101(3) P105(1)` |
| 3 | `triage_fair.c` | `gcc ... triage_fair.c -o triage_fair` | `./triage_fair` | Equal severities leave in arrival order |
| 3 | `buildheap_compare.c` | `gcc ... -O2 buildheap_compare.c -o buildheap_compare` | `./buildheap_compare` | Build-heap ≈ 1.88 n comparisons (linear) |
| 4 | `predict_partition.c` | `gcc ... predict_partition.c -o predict_partition` | `./predict_partition` | `2 4 3 5 9 8 7 \| pivot at 3, swaps 3` |
| 4 | `quick_forensics.c` | `gcc ... -O2 quick_forensics.c -o quick_forensics` | `./quick_forensics` and `ulimit -s 64; ./quick_forensics stack` | Sorted input: 49,995,000 comparisons, depth 9,999; repaired: 363,800 comparisons, depth 5 |
| 5 | `merge_stable.c` (Complete the Code) | `gcc ... merge_stable.c -o merge_stable` (add `-DSTRICT` for the `<` variant) | `./merge_stable` | 15 comparisons, #2 before #5 (stable) |
| 5 | `sort_bench.c` | `gcc ... -O2 sort_bench.c -o sort_bench` | `./sort_bench > ../output/sort_bench.csv` | Six sorts × 3 sizes × 3 input orders (about 2 minutes) |
| 5 | `parallel_merge.c` | `gcc ... -O2 -fopenmp parallel_merge.c -o parallel_merge` | `./parallel_merge` | Speed-up for 1, 2, 4, 8 threads (**re-run on your own multi-core machine**) |
| 6 | `food_delivery.c` | `gcc ... -O2 food_delivery.c -o food_delivery` | `./food_delivery 50000` and `./food_delivery 100000` | All six self-checks PASS; per-operation times printed |

## Notes on the results
* Every program was compiled with `-std=c11 -Wall -Wextra` with no warnings. Task 2 programs also ran under AddressSanitizer without errors or leaks.
* The timing numbers in `output/` were measured on a Linux cloud VM with **one hardware thread**. Re-run the benchmarks on your own computer, replace the files in `output/`, and update the report tables. In particular the Task 5.2 speed-up can only be observed on a machine with several cores.
* The images in `screenshots/` are rendered from the real program output in a VS Code layout. Replace them with your own screenshots of the same programs running in VS Code before submission (see the report, Appendix B).

## Commit plan (at least one commit per task)
```
git init && git add README.md && git commit -m "Add README"
git add Task01 && git commit -m "Task 1: diagnose and repair hash function, measurements"
git add Task02 && git commit -m "Task 2: collision strategy, chaining program, probe table, rehash"
git add Task03 && git commit -m "Task 3: heaps, triage priority queue, build-heap analysis"
git add Task04 && git commit -m "Task 4: quicksort forensics and repair"
git add Task05 && git commit -m "Task 5: sort comparison and parallel merge sort"
git add Task06 && git commit -m "Task 6: food-delivery design and demonstration"
git branch -M main && git remote add origin https://github.com/<user>/CSA03-<RegisterNumber>-Assignment4.git && git push -u origin main
```
