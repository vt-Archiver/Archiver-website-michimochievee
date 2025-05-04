"""
Load the config from .environment.json some fall-backs.

Returned dict always contains:

    persons_root   – absolute path to ".../persons”
    api_url        – base URL for the API
    cdn_url        – base URL for the CDN (media)
    streamer       – default streamer name (optional in JSON)
    
Env-vars override JSON values. If no JSON or env-vars provide
persons_root, the code attempts to auto-detect “.../Archiver/persons” 
two levels above this file.
"""
from __future__ import annotations
import json, os, pathlib, sys
from typing import Dict, Any

ENV_FILE = ".environment.json"


# helpers
def _json_or_empty(path: pathlib.Path) -> Dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        with path.open(encoding="utf-8") as fp:
            return json.load(fp)
    except Exception as err:
        print(f"[env_config] Could not parse {path}: {err}", file=sys.stderr)
        return {}


def _auto_persons_root() -> str:
    return str(pathlib.Path(__file__).resolve().parents[2] / "persons")


# public
def load_env_config() -> Dict[str, Any]:
    data = _json_or_empty(pathlib.Path(ENV_FILE))

    env_mode = os.environ.get("FLASK_ENV", "development").lower()
    base_cfg = data.get("default", {}).copy()
    base_cfg.update(data.get(env_mode, {}))

    if "API_URL" in os.environ:
        base_cfg["api_url"] = os.environ["API_URL"]
    if "CDN_URL" in os.environ:
        base_cfg["cdn_url"] = os.environ["CDN_URL"]
    if "PERSONS_ROOT" in os.environ:
        base_cfg["persons_root"] = os.environ["PERSONS_ROOT"]
    if "STREAMER" in os.environ:
        base_cfg["streamer"] = os.environ["STREAMER"]

    if "persons_root" not in base_cfg or not base_cfg["persons_root"]:
        base_cfg["persons_root"] = _auto_persons_root()

    base_cfg["persons_root"] = os.path.abspath(base_cfg["persons_root"])
    if not os.path.isdir(base_cfg["persons_root"]):
        raise FileNotFoundError(
            f"persons_root does not exist: {base_cfg['persons_root']}")

    if "streamer" not in base_cfg or not base_cfg["streamer"]:
        try:
            base_cfg["streamer"] = next(
                p.name for p in pathlib.Path(base_cfg["persons_root"]).iterdir()
                if p.is_dir()
            )
        except StopIteration:
            base_cfg["streamer"] = "UNKNOWN"

    return base_cfg


if __name__ == "__main__":
    import pprint
    pprint.pp(load_env_config())
