# Michi Mochievee Archive — Website

Flask + vanilla-JS front-end that turns the files produced by the **Archiver tool-chain**  
(VOD & stream downloads, chat dumps, emotes, etc.) into a browsable site with search, lazy-loading and an in-browser HLS/MP4 player.

```

localhost:5000        ← landing page / hero
└─ /browse            ← infinite-scroll catalogue (streams / VODs / clips)
└─ /player            ← video player with chat replay & up-next rail
/api                  ← JSON & media helper endpoints (see below)

```

---

## Key features

| Area | What you get |
|------|--------------|
| **Landing + themes** | Animated hero section that auto-picks the active colour-theme based on `config.json`. One-click dark/light toggle. |
| **Browse grid** | Client-side filtering, type chips (streams / videos / clips) and search. Items are fetched in pages via `/api/browse` and rendered with the reusable *mediacard* component. |
| **Player** | Custom controls (HLS with fall-back to MP4), theatre/fullscreen, fine-grained scrubbing, OSD timer pill, keyboard shortcuts, volume fly-out & playback-speed panel. |
| **Chat replay** | Streams chat messages from an SQLite dumped by the archiver, replaces `:emote:` tokens with cached 7TV / official files served by `/api/media/emotes/<id|name>`.  |
| **Suggestion rail** | “Up next” list that adapts its layout (side-rail vs bottom grid) depending on chat visibility / viewport. |
| **API blueprint** | JSON browse endpoints, chat paging, emote listing, media proxy (thumbnails, HLS manifests, direct MP4 download flag, CDN stub). |
| **Responsive nav** | Hover-delay dropdowns on desktop, burger + slide-down panel on ≤ 980 px.  |

---

## Project layout (abridged)

```
website/
├─ app.py                      ← Flask bootstrap
├─ config.json                 ← public theme + streamer info
├─ env_config.py               ← reads `.env` → supplies paths & secrets
│
├─ api/                        ← REST helpers used by front-end
│
├─ templates/                  ← Jinja pages & HTML partials
│  ├─ index.html
│  ├─ browse.html
│  └─ player.html
│
└─ static/
├─ css/, nav/, browse/, player/ …  ← JS + CSS modules
└─ assets/placeholder.thumbnail.png

```

---

## Requirements

* **Python 3.11+**
* **ffmpeg** only if you plan to let `fetch_media.py` serve `vod.mp4` re-muxed on-the-fly.
* Python deps (all very small): `flask`, `python-dotenv`, `pillow`  
  *(pin versions in your root-level `requirements.txt`)*

---

## Configuration

### `.env` (private)

```ini
# where the archiver stored “persons/<streamer>/…”
PERSONS_ROOT=D:/Archiver/persons

# optional – if you want to proxy via a CDN
CDN_URL=https://cdn.example.com

# same Twitch creds you already used in the archiver
CLIENT_ID=xxxxxxxxxxxx
ACCESS_TOKEN=...
````

### `config.json` (public)

*Everything rendered in the UI lives here – feel free to extend.*

```jsonc
{
  "streamer": {
    "name": "Michi Mochievee",
    "pfp_url": "https://…/michi.jpg",
    "socials": { "twitch": "...", "twitter": "...", "youtube": { "url_name": "…" } }
  },
  "resources": {
    "michinomicon": "https://sites.google.com/view/michinomicon"
  },
  "themes": [
    {
      "name": "original",
      "start_time": 1713585600,
      "dark":   { "primary": ["#262A35"], "secondary": ["#A569C0"], "highlight": ["#FCFEEF","#FE2C38"] },
      "light":  { "primary": ["#FCFEEF"], "secondary": ["#A569C0"], "highlight": ["#262A35","#FE2C38"] }
    },
    {
      "name": "summer",
      [..]
    }
  ]
}
```

---

## First-time setup

```bash
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt

# copy .env.example → .env   (fill in PERSONS_ROOT + Twitch creds)
# edit config.json           (streamer name, socials, themes …)

python app.py               # → http://localhost:5000
```

The site auto-detects all sessions inside
`<PERSONS_ROOT>/<STREAMER>/twitch/**/<date>_<id>_<title>/`
and indexes every `metadata.*.json` it finds – no DB required.

---

## Handy API calls

```text
GET /api/browse?type=streams,vods,clips&limit=30&offset=0&include=minecraft
GET /api/media/thumbnail/<media_id>              ← best thumbnail or placeholder
GET /api/media/vod/<media_id>?download=true      ← force MP4 download
GET /api/chat/<media_id>?after=120               ← chat messages after 2 min
GET /api/emotes                                  ← [{ id, name }]
GET /api/media/emotes/:OMEGALUL:                 ← emote by name or id
```

*Everything uses simple GETs so you can experiment straight in your browser, or take a look at the swagger page*

---

## Development tips

* **Live-reload** – run with `flask --app app --debug run` or drop the site behind `watchmedo auto-restart`.
* **Static cache-busting** – templates link to files via `url_for('static', filename='…')`.
* **Production** – any WSGI runner (Gunicorn/Uvicorn) works.
  Example: `gunicorn -w 2 -b 0.0.0.0:8000 'app:app'`.

---

Enjoy browsing your archive! If you spot a missing thumbnail or a chat line that doesn’t decode properly, it’s usually because the underlying archiver session lacks a `thumbnail_main.jpg` or the chat DB’s column names differ – tweak the fetcher helpers and hit F5; the index is rebuilt on first request.
