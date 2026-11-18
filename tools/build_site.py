#!/usr/bin/env python3
"""The deploy's build of a staged copy of the site, in place (never the source: development has no build step). Run by
the Pages deploy (pages.yml) and by the staged smoke (tests/staged.smoke.js, which then plays the copy), so what CI
checks on a PR is what goes live:

    NODE_PATH=<folder>/node_modules python3 tools/build_site.py DIR [--build N]

1. the players' curation (tools/curplay.py: curation-play.json, before the stamps: sw.js V hashes it);
2. the versions stamped once (tools/stamp_versions.py): every ?v=N becomes a 10-hex hash;
3. the scripts minified with source maps (tools/minify.js; terser pinned there, installed by the workflow outside the
   repository, found through NODE_PATH; architecture review of 2026-11-18, R4);
4. the versions stamped again, on the bytes served (and the build number, --build): each ?v= and sw.js V follow the
   minified files, so a new terser or a rollback of this step still reaches the phones' caches; 10 hex replace 10 hex,
   so the source maps stay exact;
5. tools/check_versions.py --dir on the result.
Prints Markdown for the deploy's summary. Any step failing fails the build (exit 1).
"""
import argparse, os, subprocess, sys

TOOLS = os.path.dirname(os.path.abspath(__file__))


def run(*cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.stderr.write(r.stdout + r.stderr)
        sys.exit(f'build_site: {" ".join(cmd[:2])} failed ({r.returncode})')
    return r.stdout


def build(d, build=None):
    py = lambda tool, *a: run(sys.executable, os.path.join(TOOLS, tool), *a)
    out = [py('curplay.py', d).strip(), '']
    py('stamp_versions.py', d)
    out += [run('node', os.path.join(TOOLS, 'minify.js'), d).strip(), '']
    stamped = py('stamp_versions.py', d, *(['--build', str(build)] if build is not None else []))
    out += [f'<details><summary>Stamped versions (build {build})</summary>', '', '```', stamped.strip(), '```', '</details>', '']
    out += [py('check_versions.py', '--dir', d).strip()]
    return '\n'.join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('dir', help='the staged copy (git archive of the commit), built in place')
    ap.add_argument('--build', help="the deploy's run number (index.html and admin.html: <meta name=build>)")
    a = ap.parse_args()
    print(build(a.dir, a.build))
    return 0


if __name__ == '__main__':
    sys.exit(main())
