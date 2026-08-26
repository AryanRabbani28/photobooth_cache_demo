import type { PhotoboothTemplate } from "@/types";

/**
 * 3-Photo Vertical Strip Templates (300 DPI, 1200 x 1800 px)
 * Each template accommodates exactly 3 photos arranged vertically.
 */
function create3PhotoStripConfig(
  name: string,
  backgroundColor: string,
  accentColor: string,
  textColor: string,
  borderColor: string,
  brandingText = "CINEMA PHOTOBOOTH",
  subText = "{{date}}",
  fontFamily = "Georgia, serif"
) {
  const width = 1200;
  const height = 1800;
  const margin = 56;
  const gutter = 28;
  const footer = 150;
  const slots = 3;
  const slotW = width - margin * 2;
  const totalGutter = gutter * (slots - 1);
  const slotH = Math.floor((height - margin * 2 - footer - totalGutter) / slots);

  return {
    template_id: name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
    name,
    canvas: {
      width,
      height,
      background_color: backgroundColor,
      accent_color: accentColor,
      dpi: 300,
    },
    slots: [
      {
        index: 0,
        x: margin,
        y: margin,
        width: slotW,
        height: slotH,
        rotation: 0,
        border: { width: 4, color: borderColor, radius: 12 },
        crop_mode: "cover" as const,
      },
      {
        index: 1,
        x: margin,
        y: margin + slotH + gutter,
        width: slotW,
        height: slotH,
        rotation: 0,
        border: { width: 4, color: borderColor, radius: 12 },
        crop_mode: "cover" as const,
      },
      {
        index: 2,
        x: margin,
        y: margin + (slotH + gutter) * 2,
        width: slotW,
        height: slotH,
        rotation: 0,
        border: { width: 4, color: borderColor, radius: 12 },
        crop_mode: "cover" as const,
      },
    ],
    decorations: [
      {
        type: "text",
        content: brandingText,
        x: width / 2,
        y: height - footer + 60,
        font_size: 42,
        font_family: fontFamily,
        color: textColor,
        alignment: "center" as const,
        letter_spacing: 6,
      },
      {
        type: "text",
        content: subText,
        x: width / 2,
        y: height - footer + 108,
        font_size: 26,
        font_family: fontFamily,
        color: textColor === "#FFFFFF" ? "#A3A3A3" : "#737373",
        alignment: "center" as const,
      },
    ],
    metadata: {
      category: "vertical_strip",
      tags: ["strip", "3-photo", "vertical"],
    },
  };
}

export const PHOTOBOOTH_TEMPLATES: PhotoboothTemplate[] = [
  {
    id: "classic_white",
    name: "Classic Studio Strip",
    category: "Classic",
    description: "Timeless clean white photobooth strip with elegant typography.",
    themeColor: "#FFFFFF",
    accentColor: "#18181B",
    badge: "POPULAR",
    config: create3PhotoStripConfig(
      "Classic Studio Strip",
      "#FFFFFF", // Background
      "#18181B",
      "#18181B",
      "#E4E4E7", // Border
      "CINEMA PHOTOBOOTH"
    ),
  },
  {
    id: "spiderman",
    name: "Spider-Man Edition",
    category: "Pop Culture",
    description: "Web-slinger themed strip with bold red and blue heroic accents.",
    themeColor: "#FFFFFF",
    accentColor: "#E53935",
    badge: "MARVEL",
    config: create3PhotoStripConfig(
      "Spider-Man Edition",
      "#FFFFFF", // Background is white
      "#E53935", // Red accent
      "#1E88E5", // Blue text
      "#E53935", // Red borders
      "YOUR FRIENDLY NEIGHBORHOOD",
      "SPIDER-MAN × CINEMA",
      "Impact, sans-serif"
    ),
  },
  {
    id: "batman",
    name: "The Dark Knight",
    category: "Pop Culture",
    description: "Gritty Gotham style with black borders and warning-yellow accents.",
    themeColor: "#FFFFFF",
    accentColor: "#FFEB3B",
    badge: "DC",
    config: create3PhotoStripConfig(
      "The Dark Knight",
      "#FFFFFF", // White background
      "#000000",
      "#000000",
      "#212121", // Dark borders
      "GOTHAM CITY ARCHIVE",
      "I AM VENGEANCE",
      "Impact, sans-serif"
    ),
  },
  {
    id: "superman",
    name: "Man of Steel",
    category: "Pop Culture",
    description: "Kryptonian aesthetic featuring bright crimson and royal blue elements.",
    themeColor: "#FFFFFF",
    accentColor: "#1565C0",
    badge: "DC",
    config: create3PhotoStripConfig(
      "Man of Steel",
      "#FFFFFF",
      "#1565C0",
      "#D32F2F", // Red text
      "#1565C0", // Blue borders
      "DAILY PLANET EXCLUSIVE",
      "HOPE // {{date}}",
      "Impact, sans-serif"
    ),
  },
  {
    id: "odysseus",
    name: "Odysseus Epic",
    category: "Mythology",
    description: "Hellenic marble inspired borders with Greek styling.",
    themeColor: "#FFFFFF",
    accentColor: "#8D6E63",
    badge: "EPIC",
    config: create3PhotoStripConfig(
      "Odysseus Epic",
      "#FFFFFF",
      "#BCAAA4",
      "#4E342E", // Brown/Bronze text
      "#D7CCC8", // Marble-like light border
      "THE ILIAD COLLECTION",
      "A HERO'S JOURNEY",
      "Georgia, serif"
    ),
  },
  {
    id: "wonder_woman",
    name: "Amazonian Princess",
    category: "Pop Culture",
    description: "Fierce gold and red thematic borders for warriors of truth.",
    themeColor: "#FFFFFF",
    accentColor: "#FBC02D",
    badge: "DC",
    config: create3PhotoStripConfig(
      "Amazonian Princess",
      "#FFFFFF",
      "#FBC02D",
      "#B71C1C", // Dark red text
      "#FBC02D", // Gold borders
      "WARRIOR OF TRUTH",
      "AMAZON TEMPLATE",
      "Impact, sans-serif"
    ),
  },
];
