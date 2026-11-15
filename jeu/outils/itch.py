import requests, re, sys, json
def get(slug, want=None, out=None):
    s = requests.Session(); s.headers['User-Agent'] = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
    base = f'https://quaternius.itch.io/{slug}'
    r = s.get(base, timeout=30); csrf = s.cookies.get('itchio_token') or ''
    m = re.search(r'name="csrf_token" value="([^"]+)"', r.text); csrf = m.group(1) if m else csrf
    r = s.post(base + '/download_url', data={'csrf_token': csrf}, timeout=30); j = r.json(); url = j.get('url')
    if not url: print('no url', j); return
    page = s.get(url, timeout=30).text
    ups = re.findall(r'data-upload_id="(\d+)".*?<strong class="name" title="([^"]+)"', page, re.S)
    if not ups: ups = [(u, '?') for u in re.findall(r'data-upload_id="(\d+)"', page)]
    sizes = re.findall(r'class="file_size"><span>([^<]+)', page)
    print(slug, list(zip(ups, sizes)))
    if not want: return
    from urllib.parse import unquote
    key = unquote(url.rstrip('/').split('/')[-1])
    for uid, name in ups:
        if want == 'any' or want.lower() in name.lower():
            r = s.post(f'{base}/file/{uid}', params={'source': 'game_download'}, data={'csrf_token': csrf}, headers={'Referer': url}, timeout=30); cdn = r.json().get('url')
            print('downloading', name)
            with s.get(cdn, stream=True, timeout=600) as d, open(out or name, 'wb') as f:
                for ch in d.iter_content(1 << 20): f.write(ch)
            return
if __name__ == '__main__': get(*sys.argv[1:])
