// Prints a validated discovery snapshot. Publication is a separate reviewed file update.
const origin = 'https://ummahapi.com/api';
async function request(path) {
  const response = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Dua catalog request failed: ${response.status}`);
  const json = await response.json();
  if (!json.success || !json.data) throw new Error('Dua provider returned incomplete data.');
  return json.data;
}
async function get(path) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await request(path); }
    catch (error) {
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}
const directory = await get('/duas/categories');
if (!Array.isArray(directory.categories) || !directory.categories.length) throw new Error('Empty category directory.');
const categories = [];
for (let i = 0; i < directory.categories.length; i += 4) {
  const batch = await Promise.all(directory.categories.slice(i, i + 4).map(async category => {
    if (!/^[a-z][a-z0-9_-]*$/.test(category.id)) throw new Error('Invalid category ID.');
    const data = await get(`/duas/category/${category.id}`);
    if (!Array.isArray(data.duas) || !data.duas.length || data.category?.id !== category.id ||
        data.duas.some(dua => !dua.arabic?.trim())) throw new Error(`Incomplete category: ${category.id}`);
    return { id: category.id, count: data.duas.length };
  }));
  categories.push(...batch);
}
const names = await get('/asma-ul-husna');
if (!Array.isArray(names.names) || names.names.length !== 99 || names.names.some(name => !name.arabic?.trim())) {
  throw new Error('Incomplete names directory.');
}
process.stdout.write(JSON.stringify({ source: origin, checkedAt: new Date().toISOString(),
  namesAvailable: true, categories: categories.sort((a,b) => a.id.localeCompare(b.id)) }, null, 2) + '\n');
