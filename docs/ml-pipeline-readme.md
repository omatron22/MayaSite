# Maya Glyph Pipeline

Three-step pipeline: build reference library → segment & match blocks → query new images.

## Setup

```bash
pip install -r requirements.txt

# SAM2 (for real segmentation — skip for initial testing)
pip install git+https://github.com/facebookresearch/segment-anything-2.git
wget https://dl.fbaipublicfiles.com/segment_anything_2/072824/sam2_hiera_base_plus.pt
```

## Step 1 — Build Reference Library (run once)

Fetches all grapheme catalog images from your API, embeds with DINOv2, saves FAISS index.

```bash
python 01_build_reference_library.py
```

Output: `./embeddings/grapheme_index.faiss` + `grapheme_metadata.pkl` + `grapheme_embeddings.npy`

**Before running:** edit `API_BASE` and `fetch_all_graphemes()` to match your actual API endpoint
for listing all unique graphemes. Based on your data structure, this is probably something like
`GET /api/graphemes` or you may need to pull them from blocks. Check your API routes.

## Step 2 — Segment & Match Blocks

For each block: downloads image → SAM2 segments → embeds segments → Hungarian assignment to grapheme codes.

```bash
python 02_segment_and_match.py
```

Output: `./matched_crops/{block_id}/seg{N}_{code}.png` + `result.json` per block.

**Notes:**
- If SAM2 is not installed, falls back to a simple 2x2 grid split (useful for testing the rest of the pipeline)
- Tune `MIN_MASK_AREA` and `MAX_MASK_AREA` based on how your blocks look
- Assignment confidence scores tell you which matches are reliable vs. uncertain

## Step 3 — Query Interface

Given any image crop, find the top-K matching graphemes.

```bash
# From local file
python 03_query.py --image ./some_crop.png --top_k 5

# From URL (e.g. a grapheme primary_image_url)
python 03_query.py --url https://mhd2.s3.us-east-2.amazonaws.com/grapheme_png/d60bA2b.png --top_k 5
```

## Adapting to Your API

Your JSON structure has:
- `block.block_graphcodes`: space-separated codes like `"1B9 MR4s ZF7"` ✔
- `block.block_image2_url`: S3 image URL ✔
- `graphemes[].primary_image_url`: catalog image per grapheme ✔
- `graphemes[].grapheme_code`: the code string ✔

The main thing to verify: what endpoints exist in your API for:
1. Listing all unique graphemes (for step 1)
2. Paginating through all blocks with their graphemes (for step 2)

Once you know those, the code needs minimal changes.

## Pipeline Diagram

```
MHD Catalog images
  │  (primary_image_url per grapheme)
  ▼
DINOv2 embeddings ──► FAISS index
                           │
Block image (S3)           │
  │                        │
  ▼                        │
SAM2 segments              │
  │                        │
  ▼                        │
DINOv2 embeddings          │
  │                        │
  └──► Hungarian match ◄───┘
            │
            ▼
   (crop image, grapheme_code, confidence)
            │
            ▼
     Verified dataset
```

## Expected Performance (Before Fine-tuning)

- Clean line drawing crops vs. catalog images: ~0.7–0.85 cosine similarity for correct matches
- Photographic/carved stone crops: lower (~0.4–0.6), more noise
- Rare graphemes with few examples will be weakest
- Common graphemes (high frequency in training) will be strongest

## Next Steps After This Works

1. **Human review UI**: Build a simple web interface to confirm/reject assignments
2. **Contrastive fine-tuning**: Use confirmed pairs to fine-tune DINOv2 specifically on Maya glyphs
3. **Allograph handling**: Add multiple reference images per grapheme code (stone, codex, jade variants)
4. **Spatial metadata**: Store bbox + relative position for eventually reconstructing reading order
