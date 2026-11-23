#!/bin/sh
# The post-hoc rerun (added after the results, not declared): D on the real held-out answers, then the planted check
# with 40 replicates, count buckets, D and E's fitted spread.
cd /tmp/claude-0/-home-user-coral-id-imr/ea3574a7-6def-5bdd-aad6-789825693d57/scratchpad/ree112 || exit 1
node extra.js answers.json ../cs.json out_extra_real.json --only real --preds D --nosens
node extra.js answers.json ../cs.json out_extra_planted.json --only planted --planted 40 --taus 0.4,0.61,0.8,1.0
echo EXTRA-DONE
