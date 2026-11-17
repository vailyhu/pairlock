"""Publishes the 18+ games (game.json "nsfw": true) to a Hugging Face dataset and writes games/nsfw.json, the list the
server's --nsfw start downloads from (engine/nsfw.js). Run it after building or changing an 18+ game, then commit
games/nsfw.json.

usage: python3 tools/publish_nsfw.py <owner/dataset> [game ...]      upload (all 18+ games, or the ones named), then write the list
       python3 tools/publish_nsfw.py <owner/dataset> --list-only      only write the list from the local files (revision "main")

Upload needs `pip install huggingface_hub` and a write token (`hf auth login`). The dataset is public, tagged
not-for-all-audiences and not gated, so the server can download without an account.
"""
import hashlib, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAMES = os.path.join(ROOT, 'games')
SKIP = {'.DS_Store'}

CARD = """---
license: cc-by-nc-4.0
language:
- hu
tags:
- not-for-all-audiences
pretty_name: pAIr-lock 18+ games
---

# pAIr-lock 18+ games

Game packages of the adult (18+) games of pAIr-lock, a two-player escape room engine with a live AI narrator. The engine
downloads them with `node server.js --nsfw`; they are not meant to be used on their own.

The games are in Hungarian. Players only investigate; everyone depicted is clearly an adult. **The files contain spoilers.**

Images are AI-generated (FLUX klein by Black Forest Labs, Qwen-Image 2.1) and picked by hand. Content license: CC BY-NC 4.0.
"""


def nsfw_games():
    out = []
    for gid in sorted(os.listdir(GAMES)):
        f = os.path.join(GAMES, gid, 'game.json')
        if os.path.isfile(f) and json.load(open(f, encoding='utf-8')).get('nsfw'):
            out.append(gid)
    return out


def files_of(gid):
    base, out = os.path.join(GAMES, gid), {}
    for d, _, fs in os.walk(base):
        for f in sorted(fs):
            if f in SKIP or f.endswith('.part'):
                continue
            p = os.path.join(d, f)
            out[os.path.relpath(p, base).replace(os.sep, '/')] = [os.path.getsize(p), hashlib.sha256(open(p, 'rb').read()).hexdigest()]
    return dict(sorted(out.items()))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args or '/' not in args[0]:
        sys.exit(__doc__)
    repo, named, list_only = args[0], args[1:], '--list-only' in sys.argv
    games = nsfw_games()
    if named:
        bad = [g for g in named if g not in games]
        if bad:
            sys.exit(f'not 18+ games here: {", ".join(bad)}')
    revision = 'main'
    if not list_only:
        from huggingface_hub import HfApi
        api = HfApi()
        api.create_repo(repo, repo_type='dataset', exist_ok=True)
        api.upload_file(path_or_fileobj=CARD.encode(), path_in_repo='README.md', repo_id=repo, repo_type='dataset', commit_message='Dataset card')
        for gid in named or games:
            print(f'uploading {gid} ...', flush=True)
            api.upload_folder(folder_path=os.path.join(GAMES, gid), path_in_repo=gid, repo_id=repo, repo_type='dataset',
                              ignore_patterns=['.DS_Store', '*.part'], delete_patterns=['*'], commit_message=f'Update {gid}')
        revision = api.repo_info(repo, repo_type='dataset').sha
    old_path = os.path.join(GAMES, 'nsfw.json')
    old = json.load(open(old_path, encoding='utf-8')) if os.path.exists(old_path) else {}
    listed = dict(old.get('games', {})) if named else {}
    for gid in named or games:
        listed[gid] = files_of(gid)
    out = {'source': f'https://huggingface.co/datasets/{repo}', 'revision': revision, 'games': dict(sorted(listed.items()))}
    with open(old_path + '.tmp', 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    os.replace(old_path + '.tmp', old_path)
    n = sum(len(v) for v in listed.values())
    print(f'games/nsfw.json: {len(listed)} games, {n} files, revision {revision}')


if __name__ == '__main__':
    main()
