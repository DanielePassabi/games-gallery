const catalogUrl = `${import.meta.env.BASE_URL}data/catalog.json`;

export async function loadCatalog() {
  const response = await fetch(catalogUrl);
  if (!response.ok) {
    throw new Error(`Impossibile caricare il catalogo (${response.status}).`);
  }

  const catalog = await response.json();
  if (catalog.schemaVersion !== 2 || !Array.isArray(catalog.years)) {
    throw new Error('Il catalogo ha un formato non supportato.');
  }
  return catalog;
}

export function assetUrl(relativePath) {
  return relativePath ? `${import.meta.env.BASE_URL}${relativePath}` : null;
}
