#!/usr/bin/env bash
# Compiles and runs every program of Assignment 3 and stores the output in Qx/output/.
# Usage: ./run_all.sh          (needs gcc; Python 3 + Pillow + pygments + matplotlib only for screenshots/figures)
set -e
cd "$(dirname "$0")"
SAN="-Wall -Wextra -g -fsanitize=address,undefined"
build_run () {   # dir  source  flags  args...
  local d=$1 s=$2 f=$3; shift 3
  ( cd "$d" && gcc $f "$s" -o "${s%.c}" -lm && echo "== $d/${s%.c} $*" && "./${s%.c}" "$@" )
}
build_run Q1_BST q1_predict_array_tree.c "-Wall -Wextra"
build_run Q1_BST q1_predict_bst_delete.c "-Wall -Wextra"
build_run Q1_BST q1_complete_code.c "-Wall -Wextra -g -fsanitize=address"
build_run Q1_BST q1_bst_full.c "$SAN"
build_run Q2_AVL q2_complete_code.c "-Wall -Wextra -g -fsanitize=address"
build_run Q2_AVL q2_avl_full.c "-Wall -Wextra -O2"            # sorted BST insertion of 100,000 keys takes ~20 s
build_run Q3_BTree q3_btree.c "-Wall -Wextra -O2"             # needs about 300 MB of RAM
build_run Q4_RedBlack q4_rbtree.c "$SAN"
build_run Q5_Splay q5_splay.c "$SAN"
build_run Q6_Trie q6_trie_complete.c "-Wall -Wextra -g -fsanitize=address"
build_run Q6_Trie q6_trie_full.c "-Wall -Wextra -g -fsanitize=address"
build_run Q7_Dictionary q7_dictionary.c "-Wall -Wextra -O2" 1
build_run Q7_Dictionary q7_dictionary.c "-Wall -Wextra -O2" 2 words_200k.txt
echo "All programs finished."
