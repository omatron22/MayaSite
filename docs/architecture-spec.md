# March 10

Maya Database — Architecture Changes & New Data Requirements

The current database at [mayasite.vercel.app](http://mayasite.vercel.app) merges entries from multiple independent Maya glyph cataloging systems into a single flat list of sign records. This results in duplicate entries, limited cross-system relationships, and no straightforward way to represent cases where different catalogs disagree on whether two forms are the same sign or different signs.

This document summarizes  some proposed structural improvements, the new tables to create, the new fields to add to existing tables, and the external data to be ingested and linked.

> Here's a wireframe for how entries might look with these changes (some other stuff in there too that you can ignore). The actual UI styles are not as pretty as the ones in the live database, but the layout is largely correct.
> See: wireframe.html

> Claude's suggested code for basic pipeline.
> See: ml-pipeline-readme.md

# 1. Core Structural Opportunity

The key opportunity is to introduce clearer distinctions between:

- A sign entry in a specific catalog (e.g., "1B7" in MHD)
- The same or related sign entry in another catalog (e.g., '0150' in TWKM, 'T150bc' in Thompson)
- A physical instance of a sign appearing in a specific inscription (usually in a glyph block)
- The relationship between catalogs — whether they agree, approximately agree, or disagree on sign identity

The fix is a **concordance model**: catalog entries are primary entities, and the links between them are explicit asserted relationships — not a synthetic "canonical sign" invented by us. No single catalog owns the ground truth. The Thompson number (extended by TWKM at T1500+) is used as the navigational spine because it is the most stable and widely cited identifier, not because it is authoritative.

---

# 2. New Tables to Create

## 2.1 CatalogEntry

One row per sign in one catalog system. This replaces the current flat sign record as the primary entity. Each entry belongs to exactly one catalog and carries that catalog's code, reading, gloss, and part-of-speech data.

| Field | Type | Notes |
| --- | --- | --- |
| entry_id | UUID | Primary key |
| catalog | ENUM | MHD, TWKM, Thompson1962, Grube1990, RingleSmithStark1996, MacriLooper2003, MacriVail2009, LooperEtAl2022, Zimmermann1956, Knorozov1963, Gates1931, CMGG |
| catalog_code | TEXT | The code as it appears in that catalog — e.g. 1B7, 0150, T150bc, "BT" |
| parent_entry | FK → CatalogEntry | For variants (1B7.1 → 1B7): points to the parent entry within the same catalog. NULL for top-level entries. |
| variant_code | TEXT | The variant suffix within this catalog — .1/.2 for MHD, st/bt/tt/fh/hc for TWKM, a/b/c for Thompson |
| reading_value | TEXT | Phonetic or logographic reading (e.g. ta, ki, AJAW). NULL if undeciphered. |
| reading_type | ENUM | syllabogram, logogram, numeral, diacritic, unknown |
| gloss_english | TEXT | English meaning where assigned by this catalog |
| gloss_mayan | TEXT | Mayan-language gloss |
| part_of_speech | TEXT[] | Array: NOUN, TRANSITIVE_VERB, NUMERAL, etc. |
| confidence_level | INT | TWKM 1–8 plausibility scale. NULL for catalogs that do not use it. |
| function_variant | TEXT | MHD fourth-letter designator for functional variants (painted, carved, codical) |
| image_url | TEXT | Idealized or representative drawing for this entry |
| source_url | TEXT | Link to this entry in the source catalog |
| notes | TEXT |  |

## 2.2 ConcordanceLink

Explicit cross-catalog alignment. One row per asserted equivalence between two catalog entries. The '≈' (approximate) vs '=' (exact) distinction is structurally important and should be preserved.

| Field | Type | Notes |
| --- | --- | --- |
| link_id | UUID | Primary key |
| entry_a | FK → CatalogEntry |  |
| entry_b | FK → CatalogEntry |  |
| correspondence | ENUM | exact, approximate, partial, disputed |
| asserted_by | TEXT | Which source asserts this link — e.g. 'TWKM concordance', 'mayaglyphs.org', 'Grube1990' |
| notes | TEXT |  |

The TWKM project publishes a concordance of 12,000+ entries across 11 catalog systems. This is the primary data source for populating this table. The mayaglyphs.org concordance (Pedersen & Lee, Feb 2026) covers MHD ↔ TWKM ↔ Thompson ↔ CMGG. Both should be ingested.

## 2.3 Graph

A specific visual variant of a sign — the concrete attested form as it appears in the corpus, distinguished from the abstract catalog entry. Follows the TWKM sign/graph/grapheme distinction. Each graph belongs to a CatalogEntry and is identified by a two-letter suffix (Prager & Gronemeyer 2018).

| Field | Type | Notes |
| --- | --- | --- |
| graph_id | UUID | Primary key |
| catalog_entry | FK → CatalogEntry | Which catalog entry this graph belongs to |
| variant_suffix | TEXT | Two-letter TWKM code: st (standard), bt (bottom), tt (top), fh (full human), hc (head creature), ex (pars pro toto), m (multiple), etc. |
| variant_type_label | TEXT | Human-readable label for the variant type |
| medium | ENUM | carved, painted, codical, stucco, ceramic — the medium of this specific variant |
| iconographic_tags | TEXT[] | Controlled vocabulary tags: bat, eye, solar, bone, etc. |
| image_url | TEXT | Image of this specific variant |
| notes | TEXT |  |

## 2.4 BlockSignSlot

The ordered sequence of signs within a glyph block. This corresponds to the MHD 'bl codes' field (e.g. '1B7 AW1a? 100 1G4a 000 000') which encodes the full sign sequence including uncertain and eroded slots.

| Field | Type | Notes |
| --- | --- | --- |
| slot_id | UUID | Primary key |
| block_id | FK → GlyphBlock |  |
| slot_position | INT | Ordinal position within the block: 1, 2, 3… |
| catalog_entry | FK → CatalogEntry | Which sign fills this slot. NULL if eroded (000). |
| certainty | ENUM | certain, uncertain, eroded, missing — MHD uses ? suffix for uncertain, 000 for eroded |
| position_in_block | ENUM | main, prefix, suffix, superfix, subfix, infix |
| graph | FK → Graph | Specific visual variant used in this slot, if identified |

---

# 3. Fields to Add to Existing Tables

## 3.1 GlyphBlock — additional MHD fields

Several fields present in the MHD TEXTS database are available to bring in. Per a comparison of the mayasite block page against the MHD record for PNGSt12-7208800, the following would be good to add:

| Field | Type | Notes |
| --- | --- | --- |
| coordinate | TEXT | Block coordinate within the inscription, e.g. D09. |
| event_long_count | TEXT | ev- fields: the Long Count date of the historical event described in this block. Distinct from the object date. |
| event_260_day | TEXT |  |
| event_365_day | TEXT |  |
| event_gregorian | DATE |  |
| transcription_logosyll | TEXT | bl logosyll field from MHD |
| transcription_hyphen | TEXT | bl hyphen field from MHD |
| transcription_1 | TEXT | bl transcr 1 |
| transcription_2 | TEXT | bl transcr 2 — alternate transcription where present |
| semantic_categories | TEXT[] | bl semantic field: e.g. [personal name, site title, agentive] |
| image_notes | TEXT | MHD image notes field |

Object date (when the monument was made) lives on ArtifactSurface; event date (what the block describes) stays on GlyphBlock. Keeping these two date types separate is important for data accuracy.

## 3.2 Attestation — new fields

Attestation records (linking a block to a catalog entry) need two new fields to support the UI requirements:

| Field | Type | Notes |
| --- | --- | --- |
| graph_id | FK → Graph | Which specific visual variant appears in this attestation. Enables filtering by variant across the corpus. |
| assigned_by | TEXT | Which scholar or project assigned this catalog entry to this instance. Important when systems disagree. |

---

# 4. External Data to Ingest

## 4.1 mayaglyphs.org concordances (Priority: High)

Pedersen & Lee (February 2026) publish four concordance tables covering MHD ↔ TWKM ↔ Thompson ↔ CMGG. These directly populate the ConcordanceLink table and include the '≈' vs '=' correspondence distinctions that are structurally important.

- TWKM Concordance — all TWKM signs with MHD, Thompson, CMGG equivalents
- MHD Concordance — all MHD codes with TWKM, Thompson, CMGG equivalents
- CMGG Concordance — syllabograms and logograms with TWKM, MHD, Thompson
- T-number Concordance — listed as 'coming soon' as of Feb 2026; monitor for release

Source: https://mayaglyphs.org/concordances.html — updated as of 2026-01-31 for TWKM, 2026-01-12 for MHD, 2025-11-15 for CMGG. Both systems are dynamic; the concordance may lag. Plan for periodic re-ingestion.

## 4.2 TWKM sign catalog (Priority: High)

The Bonn TWKM project (classicmayan.org) provides the most methodologically rigorous current catalog. It covers 482 validated Thompson entries plus new signs from T1500+, with the two-letter variant suffix system (Prager & Gronemeyer 2018), confidence levels 1–8, iconographic tags via controlled vocabulary, and the master concordance of 12,000+ entries spanning 11 historical catalogs (Gates 1931 through Looper et al. 2022).

- Graph variant images per entry (idealized drawings by Christian Prager)
- Iconographic tags per graph (controlled vocabulary)
- Confidence level (1–8 scale) per reading
- Earliest and latest attestation dates
- Full 12,000-entry historical concordance back to Gates 1931

Source: https://classicmayan.org/portal/signcatalog — updated daily. Working Paper 5 (August 2025) documents the full methodology.

## 4.3 MHD block-level fields (Priority: Medium)

Several fields present in the MHD TEXTS database are not currently imported:

- coordinate (block position within inscription, e.g. D09)
- bl codes (full sign sequence for the block — maps to BlockSignSlot)
- bl logosyll, bl hyphen, bl transcr 1, bl transcr 2 (transcription variants)
- semantic (semantic category of the block's content)
- image notes
- evcal, evlc, ev260, ev365, evGreg (event date fields)

## 4.4 Graph variant images (Priority: Medium)

The database currently shows one image per sign entry. The concordance and attestation UI would benefit from images at the graph variant level.

- TWKM provides idealized variant drawings per graph suffix (st, bt, tt, fh, hc, etc.)
- CMGG documents corpus examples per entry with medium annotation
- MHD block images can be linked to attestation records as instance-level images

## 4.5 Historical catalogs (Priority: Low)

The TWKM 12,000-entry concordance includes alignments back to Gates (1931), Zimmermann (1956), Evreinov (1961), Knorozov (1963), Grube (1990), and Ringle & Smith-Stark (1996).

- At minimum: ingest Thompson numbers as CatalogEntry rows (they are the stable spine)
- Next priority: Grube 1990 and Ringle & Smith-Stark 1996 revisions
- Lower priority: Gates, Zimmermann, Knorozov, Evreinov (primarily of historiographic interest)

---

# 5. What Stays the Same

- Site table — site codes, names, regions
- Artifact table — monument types, medium, material, collection
- The basic GlyphBlock → Artifact relationship
- Search and filter logic on existing fields

The main structural work is: replace the flat sign record with CatalogEntry + ConcordanceLink + Graph. Everything else is additive.

---

# 6. Migration Notes

- Existing sign records should be re-classified as CatalogEntry rows. Each record needs a `catalog` field assigned based on which system its code comes from.
- Entries like 1B7, 1B701, 1B702 that currently appear as three separate cards can be consolidated: 1B701 and 1B702 become CatalogEntry rows with `parent_entry` pointing to 1B7.
- Search results should default to showing parent entries only, with variant counts displayed. Variants are accessible on the sign detail page.
- The ≈ (approximate) correspondence type should be preserved when importing from mayaglyphs.org — approximate and exact correspondences carry different scholarly weight.
- Block import from MHD should treat the `bl codes` field as a parse target: split on spaces, create one BlockSignSlot row per token, flag tokens ending in `?` as `certainty: uncertain`, flag `000` tokens as `certainty: eroded`.
