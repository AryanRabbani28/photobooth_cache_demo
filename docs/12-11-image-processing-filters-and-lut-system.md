# 11. Image Processing, Filters, and LUT System

## 11.1 Filter Types

The customer should be able to select filters before capturing or after capture (depending on UX decision).

Initial filters to implement:

| Filter       | Description                    |
|--------------|--------------------------------|
| Normal       | No processing (original)       |
| Black & White| Grayscale conversion           |
| Vintage      | Warm, faded look via LUT       |
| Warm         | Orange/yellow tone shift       |
| Cool         | Blue/cyan tone shift           |
| Film Style   | Simulates analog film look     |
| Custom LUTs  | Owner-uploaded .cube files     |

> **Important:** Start with 4 filters. Do not start with 50.

## 11.2 LUT System Architecture

Each filter can be represented as a LUT (Look-Up Table) file:

```
Filter
   ├── ID
   ├── Name
   ├── LUT File (.cube format)
   ├── Preview Image (thumbnail showing effect)
   ├── Version
   └── is_active (boolean)
```

### LUT Metadata Schema

```
lut_id:          LUT_001
name:            Vintage
description:     Warm, faded colors with slight grain
file_location:   luts/vintage/vintage_v2.cube
preview_path:    luts/vintage/preview.jpg
version:         2
is_active:       true
created_at:      2026-08-20T10:00:00Z
```

### LUT Distribution Flow

```
Admin uploads LUT to Central Storage
        │
        ▼
Central Storage (Object Storage)
        │
        ▼
Booth Sync Service downloads active LUTs
        │
        ▼
Local LUT Cache on booth laptop
        │
        ▼
Customer Filter Interface displays available LUTs
```

## 11.3 Photo Capture Metadata

Every captured photo records which filter was applied:

```
photo_id:      123
session_id:    456
filter:        Vintage
lut_id:        LUT_001
captured_at:   2026-08-20 15:42:31
```

## 11.4 Photo Versions

The system saves multiple versions of each photo:

| Version        | Description                                  | Purpose                          |
|----------------|----------------------------------------------|----------------------------------|
| Original       | Raw image from the DSLR, unmodified          | Preserved for re-processing      |
| Processed      | Image after filter/LUT is applied            | Used in template composition     |
| Final Template | Completed photobooth design with all photos  | What gets printed and displayed  |

This separation is critical because:

- Filters can be changed later without re-capturing
- Final templates can be regenerated from originals
- Original photos remain permanently preserved
- The admin has flexibility to reprocess

---