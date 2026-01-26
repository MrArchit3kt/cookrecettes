const express = require('express');
const router = express.Router();

/**
 * GET /api/unsplash/photo?query=pasta
 * -> renvoie une photo cohérente "food" + infos d’attribution
 */
router.get('/photo', async (req, res) => {
  try {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      return res.status(500).json({ error: 'UNSPLASH_ACCESS_KEY manquant dans .env' });
    }

    const raw = String(req.query.query || 'food').trim();
    const forcedQuery = `${raw} food recipe`;

    // On récupère plusieurs résultats pour éviter “fleurs / bâtiments / chats”
    const url = new URL('https://api.unsplash.com/search/photos');
    url.searchParams.set('query', forcedQuery);
    url.searchParams.set('per_page', '12');
    url.searchParams.set('orientation', 'landscape');
    url.searchParams.set('content_filter', 'high');

    const r = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return res.status(r.status).json({ error: 'Unsplash error', details: text.slice(0, 300) });
    }

    const data = await r.json();
    const results = Array.isArray(data?.results) ? data.results : [];

    const looksFood = (photo) => {
      const alt = String(photo?.alt_description || photo?.description || '').toLowerCase();
      const okWords = [
        'food','recipe','dish','meal','cooking','kitchen',
        'pasta','pizza','salad','dessert','cake','bread','soup',
        'rice','noodles','chicken','beef','fish','vegetable'
      ];
      return okWords.some(w => alt.includes(w));
    };

    const pick = results.find(looksFood) || results[0];
    if (!pick) return res.json({ photo: null });

    // URL image (utilise "regular" : bon compromis)
    const imageUrl = pick.urls?.regular || pick.urls?.full || pick.urls?.small;

    const downloadLocation = pick.links?.download_location; // important (tracking)
    // On déclenche le tracking côté serveur (non bloquant)
    if (downloadLocation) {
      fetch(`${downloadLocation}?client_id=${accessKey}`).catch(() => {});
    }

    return res.json({
      photo: {
        id: pick.id,
        alt: pick.alt_description || pick.description || '',
        url: imageUrl,
        author: pick.user?.name || '',
        author_url: pick.user?.links?.html || '',
        // lien “Unsplash photo page”
        unsplash_url: pick.links?.html || '',
        download_location: downloadLocation || '',
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
