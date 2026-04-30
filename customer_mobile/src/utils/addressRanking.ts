/**
 * Address suggestion ranking utilities
 * Implements distance-based and query-quality scoring for autocomplete suggestions
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Start latitude
 * @param lon1 Start longitude
 * @param lat2 End latitude
 * @param lon2 End longitude
 * @returns Distance in kilometers
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate query match quality score (0-1)
 * Factors: substring position (earlier = better), case sensitivity, word order
 * @param query Search query
 * @param suggestion Address suggestion label
 * @returns Quality score from 0 to 1
 */
export function calculateMatchQuality(query: string, suggestion: string): number {
  const q = query.toLowerCase().trim();
  const s = suggestion.toLowerCase().trim();

  // Perfect match
  if (s === q) return 1.0;

  // Starts with query (very good)
  if (s.startsWith(q)) return 0.9;

  // Contains query as whole word (good)
  const words = s.split(/[\s,]+/);
  if (words.some((word) => word.startsWith(q))) return 0.8;

  // Contains query substring (okay)
  const index = s.indexOf(q);
  if (index >= 0) {
    // Earlier position = better score
    const positionRatio = 1 - index / s.length;
    return 0.5 + positionRatio * 0.3; // Range 0.5-0.8
  }

  // Fuzzy match: count matching characters in order
  let matchCount = 0;
  let queryIdx = 0;
  for (let i = 0; i < s.length && queryIdx < q.length; i++) {
    if (s[i] === q[queryIdx]) {
      matchCount++;
      queryIdx++;
    }
  }

  const fuzzyRatio = matchCount / q.length;
  return fuzzyRatio > 0.5 ? fuzzyRatio * 0.5 : 0; // Only score if 50%+ characters match
}

/**
 * Calculate proximity score (0-1)
 * Closer distances = higher scores, maxDistance caps score
 * @param distanceKm Distance in kilometers
 * @param maxDistanceKm Maximum distance to consider (default 100km)
 * @returns Proximity score from 0 to 1
 */
export function calculateProximityScore(distanceKm: number, maxDistanceKm: number = 100): number {
  if (distanceKm > maxDistanceKm) return 0;
  return 1 - distanceKm / maxDistanceKm;
}

/**
 * Calculate final ranking score
 * Formula: (0.6 * proximity) + (0.4 * matchQuality)
 * @param distanceKm Distance from user to suggestion in km
 * @param query Search query
 * @param suggestion Address suggestion
 * @returns Final ranking score (0-1)
 */
export function calculateRankingScore(
  distanceKm: number,
  query: string,
  suggestion: string,
): number {
  const proximity = calculateProximityScore(distanceKm);
  const quality = calculateMatchQuality(query, suggestion);
  return 0.6 * proximity + 0.4 * quality;
}

/**
 * Apply distance penalty for suggestions outside primary region
 * Used in Phase 4 for geographic bias optimization
 * @param distanceKm Distance in km
 * @param penaltyThreshold Distance threshold to apply penalty (default 50km)
 * @param penaltyFactor How much to reduce score (default 0.5 = 50% penalty)
 * @returns Penalty multiplier (0-1)
 */
export function applyDistancePenalty(
  distanceKm: number,
  penaltyThreshold: number = 50,
  penaltyFactor: number = 0.5,
): number {
  if (distanceKm <= penaltyThreshold) return 1.0;
  return penaltyFactor; // Apply penalty for far away results
}
