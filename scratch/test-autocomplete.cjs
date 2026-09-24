const path = require('path');
const { createClient } = require(path.resolve('./node_modules/@supabase/supabase-js'));
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testAutocomplete(query) {
  const clean = query.trim().toLowerCase();

  // 1. Match cities
  const { data: matchedCities } = await supabase
    .from('cities')
    .select('id, name, slug, states(code, name)')
    .or(`name.ilike.%${clean}%,slug.ilike.%${clean}%`)
    .limit(5);

  console.log('Matched cities:', matchedCities);

  // 2. Neighborhoods of the matched city
  let cityNeighborhoods = [];
  if (matchedCities && matchedCities.length > 0) {
    const city = matchedCities[0];
    const { data: nRows } = await supabase
      .from('neighborhoods')
      .select('id, name, slug, city_id')
      .eq('city_id', city.id)
      .order('name')
      .limit(15);

    cityNeighborhoods = (nRows || []).map(n => ({
      id: n.id,
      name: n.name,
      slug: n.slug,
      cityName: city.name,
      citySlug: city.slug,
      stateCode: city.states?.code
    }));
  }

  // 3. Direct neighborhoods matching text
  const { data: directN } = await supabase
    .from('neighborhoods')
    .select('id, name, slug, city_id, cities(name, slug, states(code))')
    .or(`name.ilike.%${clean}%,slug.ilike.%${clean}%`)
    .limit(15);

  const directList = (directN || []).map(n => ({
    id: n.id,
    name: n.name,
    slug: n.slug,
    cityName: n.cities?.name,
    citySlug: n.cities?.slug,
    stateCode: n.cities?.states?.code
  }));

  console.log('City Neighborhoods count:', cityNeighborhoods.length);
  console.log('Sample city neighborhoods:', cityNeighborhoods.slice(0, 5));
  console.log('Direct neighborhoods count:', directList.length);
  console.log('Sample direct neighborhoods:', directList.slice(0, 5));
}

testAutocomplete('pelotas').catch(console.error);
