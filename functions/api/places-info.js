// Google Places API proxy to avoid CORS issues
// This function calls Google Places API server-side

export async function onRequestPost(context) {
  try {
    const { query, apiKey } = await context.request.json();
    
    if (!query || !apiKey) {
      return new Response(JSON.stringify({ error: 'Missing query or API key' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Step 1: Find the place
    const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id&key=${apiKey}`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    if (!searchData.candidates || searchData.candidates.length === 0) {
      return new Response(JSON.stringify({ error: 'Store not found. Try a more specific name or address.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const placeId = searchData.candidates[0].place_id;

    // Step 2: Get place details including hours
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,opening_hours,business_status,rating,user_ratings_total,formatted_phone_number&key=${apiKey}`;
    
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();
    
    if (detailsData.status !== 'OK') {
      return new Response(JSON.stringify({ error: 'Failed to get store details' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return the relevant info
    return new Response(JSON.stringify({
      name: detailsData.result.name,
      address: detailsData.result.formatted_address,
      opening_hours: detailsData.result.opening_hours || null,
      phone: detailsData.result.formatted_phone_number || null,
      rating: detailsData.result.rating || null,
      ratings_total: detailsData.result.user_ratings_total || null,
      business_status: detailsData.result.business_status || null
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Places API error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
