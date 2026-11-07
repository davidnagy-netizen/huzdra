# Zene-API szerződés (tanítás + generálás)

A Húzdrá! bármely zenegeneráló / hangmodell-szolgáltatással működik, amely ezt a REST szerződést
megvalósítja (vagy egy vékony átjáró, ami a szolgáltató saját API-jára fordítja).
Beállítás: `MUSIC_API_URL` és `MUSIC_API_KEY`. Hitelesítés: `Authorization: Bearer <MUSIC_API_KEY>`.

## Tanítás

### `POST /v1/train`
```json
{
  "ref_id": "trn_…",
  "name": "Lakodalmas v1",
  "style_ids": ["lakodalmas-mulatos", "porgos-csardas"],
  "samples": [
    {
      "id": "ts_…",
      "url": "https://…/aláírt-letöltési-url (7 napig érvényes)",
      "title": "alapzene1",
      "bpm": 123,
      "key": "D-dúr?",
      "style_ids": ["lakodalmas-mulatos"],
      "instruments": ["hegedű", "cimbalom"],
      "mood": "pörgős"
    }
  ]
}
```
Válasz: `{ "id": "<szolgáltatói feladat-azonosító>" }`

A `key` mező végén lévő `?` azt jelzi, hogy a hangnem-becslés bizonytalan.

### `GET /v1/train/{id}`
Válasz: `{ "status": "queued" | "running" | "succeeded" | "failed", "progress": 0-100, "model_id": "…", "error": "…" }`

A Húzdrá! kb. 30 másodpercenként kérdezi le. Sikeres tanítás után az admin a **Zenék és tanítás**
oldalon aktiválja a modellt, és ettől kezdve az adott stílusú dalok ezzel készülnek.

## Generálás

### `POST /v1/generate`
```json
{
  "kind": "song" | "preview",
  "ref_id": "ord_… / prv_…",
  "duration_sec": 30,
  "tempo": "lassu" | "kozepes" | "porgos",
  "style_id": "lakodalmas-mulatos" | null,
  "style_model_id": "<aktív tanított modell>" | null,
  "mood": "vicces" | "meghato" | "unnepelyes",
  "instruments": { "violin": true, "cimbalom": false },
  "lyrics": "[1. versszak]\n…\n\n[Refrén]\n…",
  "voice_model_id": "<licencelt / hozzájárulással rendelkező hangmodell>",
  "pronunciation_hints": ["ZSÓ-fi, hosszú ó"],
  "watermark_id": "wm_…  (a kimenetbe hallhatatlan vízjelként + metaadatként kell beágyazni)",
  "title": "Éljen Zsófi!"
}
```
Válasz: `{ "id": "<szolgáltatói feladat-azonosító>" }`

### `GET /v1/generate/{id}`
Válasz: `{ "status": "queued" | "running" | "succeeded" | "failed", "progress": 0-100, "audio_url": "https://…", "error": "…" }`

Sikeres generálás után a Húzdrá! letölti az `audio_url`-t (MP3/WAV/FLAC), és a saját privát
tárhelyére (Supabase Storage, `songs` vagy `previews` tároló) menti. Az előnézet (`kind: "preview"`)
15 másodperces (adminból állítható).

## Követelmények

- A hangmodell kizárólag olyan énekes hangja lehet, aki ehhez **írásban hozzájárult** (saját hangok),
  illetve ismert előadónál **licencszerződés** alapján. A modell nem lehet külső fél számára elérhető.
- Minden kimenet kapjon hallhatatlan audio vízjelet a `watermark_id`-val.
- A tanítóanyag csak a Húzdrá! által átadott, jogtisztaként megerősített minta lehet.
