/**
 * Vietnamese address parsing utilities
 * Better extraction of key address components (đường, phường, quận, thành phố)
 */

// Vietnamese keyword dictionaries for address component identification
const DISTRICT_KEYWORDS = {
  vi: ["huyện", "quận", "thành phố", "thủ đức", "tp\\.\\s*thủ đức"],
  abbreviations: {
    q: "quận",
    h: "huyện",
    tp: "thành phố",
    "tp.": "thành phố",
  },
};

const WARD_KEYWORDS = {
  vi: ["phường", "xã", "thị trấn", "tổ", "tập thể"],
  abbreviations: {
    p: "phường",
    x: "xã",
  },
};

const ROAD_KEYWORDS = {
  vi: ["đường", "phố", "tuyến", "lộ", "con đường"],
  abbreviations: {
    đ: "đường",
    "đ.": "đường",
  },
};

const PLACE_KEYWORDS = {
  vi: ["tòa nhà", "tầng", "số", "căn hộ", "nhà", "lô", "ô"],
};

const CITY_KEYWORDS = {
  vi: [
    "thành phố",
    "tp",
    "hà nội",
    "hồ chí minh",
    "đà nẵng",
    "cần thơ",
    "hải phòng",
    "huế",
  ],
};

export interface ParsedAddressComponents {
  placeName?: string;
  road?: string;
  ward?: string;
  district?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

/**
 * Identify address component type (place, road, ward, district, city, etc)
 */
function identifyComponentType(segment: string): string {
  const lower = segment.toLowerCase().trim();

  // Check district keywords
  for (const keyword of DISTRICT_KEYWORDS.vi) {
    if (new RegExp(keyword, "i").test(lower)) return "district";
  }

  // Check ward keywords
  for (const keyword of WARD_KEYWORDS.vi) {
    if (new RegExp(keyword, "i").test(lower)) return "ward";
  }

  // Check road keywords
  for (const keyword of ROAD_KEYWORDS.vi) {
    if (new RegExp(keyword, "i").test(lower)) return "road";
  }

  // Check city keywords
  for (const keyword of CITY_KEYWORDS.vi) {
    if (new RegExp(keyword, "i").test(lower)) return "city";
  }

  // Check for postal code pattern
  if (/^\d{5,6}$/.test(lower)) return "postalCode";

  // Default to place name for first meaningful segment
  return "placeName";
}

/**
 * Extract value from component, handling abbreviations
 */
function extractComponentValue(segment: string, type: string): string {
  const trimmed = segment.trim();

  // Try to expand abbreviations
  if (type === "district") {
    const abbrev = trimmed.match(/^([qhtp]+\.?)\s+(.*)$/i);
    if (abbrev) {
      const prefix = abbrev[1].toLowerCase().replace(/\.$/, "");
      const suffix = abbrev[2];
      const expanded =
        DISTRICT_KEYWORDS.abbreviations[prefix as keyof typeof DISTRICT_KEYWORDS.abbreviations] ||
        prefix;
      return `${expanded} ${suffix}`.trim();
    }
  }

  if (type === "ward") {
    const abbrev = trimmed.match(/^([px]+\.?)\s+(.*)$/i);
    if (abbrev) {
      const prefix = abbrev[1].toLowerCase().replace(/\.$/, "");
      const suffix = abbrev[2];
      const expanded =
        WARD_KEYWORDS.abbreviations[prefix as keyof typeof WARD_KEYWORDS.abbreviations] ||
        prefix;
      return `${expanded} ${suffix}`.trim();
    }
  }

  if (type === "road") {
    const abbrev = trimmed.match(/^(đ+\.?)\s+(.*)$/i);
    if (abbrev) {
      const suffix = abbrev[2];
      return `đường ${suffix}`.trim();
    }
  }

  return trimmed;
}

/**
 * Parse Vietnamese address into components
 * @param address Full address string
 * @returns Parsed address components
 */
export function parseVietnameseAddress(address: string): ParsedAddressComponents {
  if (!address || address.trim().length === 0) {
    return {};
  }

  const segments = address
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const components: ParsedAddressComponents = {};

  // Analyze segments in order
  for (const segment of segments) {
    const type = identifyComponentType(segment);
    const value = extractComponentValue(segment, type);

    switch (type) {
      case "placeName":
        if (!components.placeName) components.placeName = value;
        break;
      case "road":
        if (!components.road) components.road = value;
        break;
      case "ward":
        if (!components.ward) components.ward = value;
        break;
      case "district":
        if (!components.district) components.district = value;
        break;
      case "city":
        if (!components.city) components.city = value;
        break;
      case "postalCode":
        if (!components.postalCode) components.postalCode = value;
        break;
    }
  }

  return components;
}

/**
 * Build formatted Vietnamese address label from components
 * Priority: place name → road → ward → district → city
 * @param components Parsed address components
 * @returns Formatted display label
 */
export function buildVietnameseLabel(components: ParsedAddressComponents): string {
  const parts: string[] = [];

  // Build in priority order: specific to general
  if (components.placeName) parts.push(components.placeName);
  if (components.road) parts.push(components.road);
  if (components.ward) parts.push(components.ward);
  if (components.district) parts.push(components.district);
  if (components.city) parts.push(components.city);
  if (components.postalCode) parts.push(components.postalCode);

  return parts.join(", ");
}

/**
 * Format address for consistent display
 * Combines parsing and formatting for unified output
 * @param address Raw address string
 * @returns Formatted Vietnamese address
 */
export function formatVietnameseAddress(address: string): string {
  const parsed = parseVietnameseAddress(address);
  return buildVietnameseLabel(parsed);
}
