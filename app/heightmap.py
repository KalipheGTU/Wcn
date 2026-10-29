"""Heightmap depuis OpenTopography : emprise réelle de l'image, des points de référence ou de la vue, découpe au contour, GeoTIFF / PNG 16 bits / JSON."""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from . import georef, opentopo

def rings_of(layers):
    return [(l.name, georef.footprint(l.w, l.h, l.gcps, l.method)) for l in layers]

def bbox_from_layers(layers, mode="footprint", margin=0.0, view=None):
    """(ouest, sud, est, nord) : 'footprint' = contour réel des images, 'gcps' = rectangle des points de référencement, 'view' = vue de la carte."""
    if mode == "view" and view: w, s, e, n = view
    else:
        pts = [(g["lon"], g["lat"]) for l in layers for g in l.gcps] if mode == "gcps" else [p for _, r in rings_of(layers) for p in r]
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]; w, s, e, n = min(xs), min(ys), max(xs), max(ys)
    m = float(margin or 0)
    return (max(-180, w - m), max(-90, s - m), min(180, e + m), min(90, n + m))

def read_dem(path):
    """Lit un GeoTIFF d'altitudes. Retourne (tableau float32 avec NaN, x0, y0, dx, dy) en degrés, x0/y0 = coin haut-gauche."""
    with Image.open(path) as im:
        im.load(); arr = np.asarray(im).astype(np.float32); tg = im.tag_v2
        sc, tie = tg.get(33550), tg.get(33922)
        if not sc or not tie: raise ValueError("GeoTIFF sans géoréférencement (tags ModelPixelScale/Tiepoint absents)")
        nod = tg.get(42113); keys = tg.get(34735) or ()
    dx, dy = float(sc[0]), float(sc[1]); x0, y0 = float(tie[3]), float(tie[4])
    for i in range(4, len(keys) - 3, 4):                      # RasterPixelIsPoint -> décalage d'un demi-pixel
        if keys[i] == 1025 and keys[i + 3] == 2: x0 -= dx / 2; y0 += dy / 2
    bad = ~np.isfinite(arr) | (arr <= -9000)
    try:
        if nod is not None: bad |= arr == float(str(nod).strip("\x00 "))
    except ValueError: pass
    arr[bad] = np.nan
    return arr, x0, y0, dx, dy

def clip_to_rings(arr, x0, y0, dx, dy, rings):
    H, W = arr.shape; mask = Image.new("L", (W, H), 0); d = ImageDraw.Draw(mask)
    for _, ring in rings: d.polygon([((lon - x0) / dx, (y0 - lat) / dy) for lon, lat in ring], fill=255)
    out = arr.copy(); out[np.asarray(mask) == 0] = np.nan
    return out

def build(layers, key, out_dir, name, o):
    """o : {mode, margin, bbox(view), demtype, clip, max_side, outputs:[tif,png16,json]}. Retourne la liste des fichiers créés."""
    out_dir = Path(out_dir); out_dir.mkdir(parents=True, exist_ok=True)
    dem = o.get("demtype", "COP30"); outs = o.get("outputs") or ["tif"]
    bbox = bbox_from_layers(layers, o.get("mode", "footprint"), o.get("margin", 0), o.get("bbox"))
    raw = out_dir / f"{name}_{dem}_brut.tif"
    opentopo.fetch_dem(bbox, dem, key, raw)
    arr, x0, y0, dx, dy = read_dem(raw)
    clipped = False
    if o.get("clip"):
        arr = clip_to_rings(arr, x0, y0, dx, dy, rings_of(layers)); clipped = True
    ms = int(o.get("max_side") or 0)
    if ms and max(arr.shape) > ms:                            # ré-échantillonnage (largeur/hauteur max)
        f = ms / max(arr.shape); nw, nh = max(2, round(arr.shape[1] * f)), max(2, round(arr.shape[0] * f))
        nan = ~np.isfinite(arr); lo = np.nanmin(arr) if (~nan).any() else 0
        a2 = np.asarray(Image.fromarray(np.where(nan, lo, arr).astype(np.float32), "F").resize((nw, nh), Image.BILINEAR))
        m2 = np.asarray(Image.fromarray(nan.astype(np.uint8) * 255, "L").resize((nw, nh), Image.NEAREST)) > 0
        dx, dy = dx * arr.shape[1] / nw, dy * arr.shape[0] / nh; arr = np.where(m2, np.nan, a2).astype(np.float32)
    valid = np.isfinite(arr); lo, hi = (float(np.nanmin(arr)), float(np.nanmax(arr))) if valid.any() else (0.0, 0.0)
    files = []
    from . import exports
    if "tif" in outs:
        final = out_dir / f"{name}_{dem}_altitudes.tif"
        exports.write_dem_geotiff(final, arr, x0, y0, dx, "4326"); files.append(final.name)
    if "png16" in outs:
        span = max(hi - lo, 1e-6); u16 = np.where(valid, (arr - lo) / span * 65535, 0).clip(0, 65535).astype(np.uint16)
        Image.fromarray(u16, "I;16").save(out_dir / f"{name}_{dem}_heightmap16.png"); files.append(f"{name}_{dem}_heightmap16.png")
    if "json" in outs or "png16" in outs:
        meta = {"name": name, "dem": dem, "crs": "EPSG:4326", "bbox_demandee": list(bbox),
                "bbox_obtenue": [x0, y0 - dy * arr.shape[0], x0 + dx * arr.shape[1], y0],
                "taille_px": [arr.shape[1], arr.shape[0]], "taille_pixel_deg": [dx, dy], "decoupe_au_contour": clipped,
                "altitude_min_m": lo, "altitude_max_m": hi,
                "png16": {"fichier": f"{name}_{dem}_heightmap16.png", "formule": "altitude(m) = min + valeur/65535 × (max − min) ; 0 = pas de données"}}
        (out_dir / f"{name}_{dem}_heightmap.json").write_text(json.dumps(meta, indent=1)); files.append(f"{name}_{dem}_heightmap.json")
    if "tif" not in outs or raw.name != files[0]: raw.unlink(missing_ok=True)   # le fichier brut n'est gardé que si rien d'autre
    return files
