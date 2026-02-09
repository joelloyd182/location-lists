export async function onRequestPost(context) {
  const { LOCATION_LISTS } = context.env;
  const data = await context.request.json();
  
  // Save to KV
  await LOCATION_LISTS.put('user-data', JSON.stringify(data));
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestGet(context) {
  const { LOCATION_LISTS } = context.env;
  const data = await LOCATION_LISTS.get('user-data');
  
  return new Response(data || '{}', {
    headers: { 'Content-Type': 'application/json' }
  });
}