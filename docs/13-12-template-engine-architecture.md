# 12. Template Engine Architecture

## 12.1 Design Philosophy

Templates should **not** be hard-coded into the application. The system supports dynamic, configurable templates that can be managed through the admin dashboard.

## 12.2 Template Configuration Schema

Each template is defined by a JSON configuration:

```json
{
  "template_id": "classic_strip_01",
  "name": "Classic Strip",
  "version": 1,
  "is_active": true,
  "canvas": {
    "width": 1200,
    "height": 1800,
    "background_color": "#FFFFFF",
    "background_image": "templates/classic_strip_01/background.png",
    "dpi": 300
  },
  "slots": [
    {
      "index": 0,
      "x": 50,
      "y": 50,
      "width": 1100,
      "height": 380,
      "rotation": 0,
      "border": {
        "width": 2,
        "color": "#000000",
        "radius": 0
      },
      "crop_mode": "cover"
    },
    {
      "index": 1,
      "x": 50,
      "y": 460,
      "width": 1100,
      "height": 380,
      "rotation": 0,
      "border": {
        "width": 2,
        "color": "#000000",
        "radius": 0
      },
      "crop_mode": "cover"
    },
    {
      "index": 2,
      "x": 50,
      "y": 870,
      "width": 1100,
      "height": 380,
      "rotation": 0,
      "border": {
        "width": 2,
        "color": "#000000",
        "radius": 0
      },
      "crop_mode": "cover"
    },
    {
      "index": 3,
      "x": 50,
      "y": 1280,
      "width": 1100,
      "height": 380,
      "rotation": 0,
      "border": {
        "width": 2,
        "color": "#000000",
        "radius": 0
      },
      "crop_mode": "cover"
    }
  ],
  "decorations": [
    {
      "type": "image",
      "path": "templates/classic_strip_01/logo.png",
      "x": 450,
      "y": 1700,
      "width": 300,
      "height": 80
    },
    {
      "type": "text",
      "content": "XYZ Photobooth",
      "x": 600,
      "y": 1750,
      "font_size": 24,
      "font_family": "Arial",
      "color": "#333333",
      "alignment": "center"
    }
  ],
  "metadata": {
    "category": "classic",
    "tags": ["strip", "vertical", "4-photo"],
    "created_at": "2026-08-01T00:00:00Z",
    "updated_at": "2026-08-15T00:00:00Z"
  }
}
```

### Key Schema Fields

| Field                      | Type    | Description                                          |
|----------------------------|---------|------------------------------------------------------|
| `canvas.width/height`      | int     | Final output image dimensions in pixels              |
| `canvas.background_image`  | string  | Optional background image path                       |
| `canvas.dpi`               | int     | DPI for print output                                 |
| `slots[].x/y`              | int     | Top-left position of the photo slot                  |
| `slots[].width/height`     | int     | Dimensions of the photo slot                         |
| `slots[].rotation`         | float   | Rotation angle in degrees                            |
| `slots[].border`           | object  | Optional border styling                              |
| `slots[].crop_mode`        | string  | How the photo fits: `cover`, `contain`, `stretch`    |
| `decorations[]`            | array   | Overlay elements: images, text, shapes               |
| `metadata.category`        | string  | For filtering in the template selection UI           |

## 12.3 Template Rendering Pipeline

```
Load Template Configuration (JSON)
        │
        ▼
Create Canvas (width × height, background color/image)
        │
        ▼
For each slot:
    │
    ├── Load processed photo for this slot index
    ├── Resize/crop photo to fit slot dimensions (using crop_mode)
    ├── Rotate if needed
    ├── Apply border if configured
    └── Paste onto canvas at (x, y)
        │
        ▼
For each decoration:
    │
    ├── If type == "image": load and paste at position
    └── If type == "text": render text at position with font/color
        │
        ▼
Save final composed image
        │
        ▼
Return final image path
```

## 12.4 Number of Photos

The number of required photos is determined **automatically** by the template's `slots` array length:

```
Template "Classic Strip"  → slots.length = 4 → 4 photos required
Template "Couple"         → slots.length = 2 → 2 photos required
Template "Grid"           → slots.length = 6 → 6 photos required
```

---