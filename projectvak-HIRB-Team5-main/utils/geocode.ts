/**
 * Geocodes a Belgian address using the free Nominatim API (OpenStreetMap).
 * Returns { lat, lon } or null if the address could not be found.
 * Note: Nominatim rate-limits to 1 request/second.
 */
export async function geocodeAddress(
  straat: string,
  postcode: string,
  plaats: string
): Promise<{ lat: number; lon: number } | null> {
  const query = encodeURIComponent(`${straat}, ${postcode} ${plaats}, Belgium`);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=be`;

  try {
    const response = await fetch(url, {
      headers: {
        // Nominatim requires a User-Agent identifying your application
        'User-Agent': 'VDA-RealEstate-App/1.0',
      },
    });

    if (!response.ok) return null;

    const results = await response.json();
    if (!results || results.length === 0) return null;

    const { lat, lon } = results[0];
    return { lat: parseFloat(lat), lon: parseFloat(lon) };
  } catch (err) {
    console.warn('Geocoding failed:', err);
    return null;
  }
}

export type PostcodeInferenceResult =
  | { status: 'resolved'; postcode: string }
  | { status: 'ambiguous'; options: string[] }
  | { status: 'not_found' };

const extractBelgianPostcode = (value: string | undefined): string | null => {
  if (!value) return null;
  const match = value.match(/\b\d{4}\b/);
  return match ? match[0] : null;
};

/**
 * Tries to infer a Belgian postcode from place (and optionally street) via Nominatim.
 */
export async function inferBelgianPostcode(
  plaats: string,
  straat?: string
): Promise<PostcodeInferenceResult> {
  const cleanPlaats = (plaats || '').trim();
  if (!cleanPlaats) return { status: 'not_found' };

  const queryParts = [straat?.trim(), cleanPlaats, 'Belgium'].filter(Boolean);
  const query = encodeURIComponent(queryParts.join(', '));
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&addressdetails=1&limit=10&countrycodes=be&dedupe=1`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'VDA-RealEstate-App/1.0',
      },
    });

    if (!response.ok) return { status: 'not_found' };

    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      return { status: 'not_found' };
    }

    const postcodes = new Set<string>();

    for (const result of results) {
      const fromAddress = extractBelgianPostcode(result?.address?.postcode);
      const fromDisplayName = extractBelgianPostcode(result?.display_name);
      const postcode = fromAddress || fromDisplayName;
      if (postcode) postcodes.add(postcode);
    }

    if (postcodes.size === 0) return { status: 'not_found' };
    if (postcodes.size === 1) {
      return { status: 'resolved', postcode: Array.from(postcodes)[0] };
    }

    return {
      status: 'ambiguous',
      options: Array.from(postcodes).sort(),
    };
  } catch (err) {
    console.warn('Postcode inference failed:', err);
    return { status: 'not_found' };
  }
}
