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

3. Modèle de données (résumé pour le jury)
3.1. USERS

id, name, email (unique), password_hash, role (user/admin),
created_at, updated_at

Rôle :

stocker l’identité des utilisateurs

gérer l’authentification et les permissions (admin / user)

3.2. RECIPES

id, user_id (FK → users.id), title, description,
image_url, video_url (nullable), cuisine_type,
prep_time_minutes, servings, views, avg_rating (optionnel),
created_at, updated_at

Rôle :

représenter chaque recette

lier la recette à son auteur (user_id)

stocker les infos nécessaires pour filtrer et trier (temps, type, note, vues)

3.3. INGREDIENTS & RECIPES_INGREDIENTS

INGREDIENTS

id, name (unique), created_at

RECIPES_INGREDIENTS

id, recipe_id (FK → recipes.id),
ingredient_id (FK → ingredients.id),
quantity, unit

Choix technique :

normalisation : un ingrédient n’est stocké qu’une seule fois

table de liaison N–N qui ajoute la donnée métier (quantité + unité)

facilite la réutilisation des ingrédients et le filtrage par ingrédient

3.4. FAVORITES

user_id (FK → users.id)

recipe_id (FK → recipes.id)

created_at, updated_at

contrainte UNIQUE (user_id, recipe_id)

Rôle :

gérer le bouton ❤ Favori dans l’UI

empêcher un utilisateur d’ajouter plusieurs fois la même recette en favori

alimenter le “carnet de recettes” dans la page profil

3.5. COMMENTS

id, recipe_id (FK → recipes.id), user_id (FK → users.id),
content, rating (1–5), created_at

Rôle :

permettre aux utilisateurs de commenter une recette

stocker une note de 1 à 5 par commentaire

servir de base au calcul de recipes.avg_rating (moyenne des notes)

3.6. NEWSLETTER_SUBSCRIPTIONS

id, email (unique), user_id (nullable, FK → users.id), created_at

Rôle :

gérer les emails abonnés à la newsletter CookRecettes

supporter à la fois :

des visiteurs anonymes (email seul),

des utilisateurs connectés (lien avec un compte).

4. Parcours utilisateur (résumé fonctionnel)

Arrivée sur la page d’accueil

Hero avec présentation du site et bouton Ajouter une recette

Liste des recettes avec image, temps, portions, type de cuisine, note, favoris.

Recherche & filtres

Recherche textuelle

Filtres :

ingrédients inclus / exclus

type de cuisine

temps minimum / maximum

portions

avec image / avec vidéo

Tri : plus récentes, temps croissant / décroissant, titre A–Z.

Détail d’une recette

Image + description

Liste d’ingrédients (quantité, unité)

Instructions

Auteur, temps de préparation, portions

Bouton ❤ pour ajouter/enlever des favoris

Zone de commentaires (avec note 1–5) si l’utilisateur est connecté.

Création / édition de recette

Formulaire complet :

titre, description

type de cuisine, temps, portions

image (URL), vidéo (URL facultative)

ingrédients dynamiques (nom, quantité, unité)

instructions

Contrôle d’accès :

seul l’auteur ou un admin peut modifier/supprimer la recette.

Profil / carnet de recettes

Informations du compte

Recettes créées par l’utilisateur

Recettes ajoutées en favoris (carnet / mini book)

Newsletter

Formulaire en bas de la page d’accueil

Enregistrement de l’email dans newsletter_subscriptions

5. Authentification & sécurité

Inscription

vérification email unique

hash du mot de passe (bcrypt)

création d’un JWT signé

Connexion

vérification du couple email / mot de passe

renvoi d’un JWT (utilisé par le frontend)

Middleware d’authentification

vérifie le token Authorization: Bearer <token>

ajoute req.user (id, rôle, email) pour les routes protégées

Autorisation

modification / suppression de recette :

auteur de la recette ou admin

suppression de commentaire :

auteur du commentaire ou admin

6. Installation & lancement (rappel rapide)
Backend
cd backend
npm install
# configurer le fichier .env (DB + JWT)
npm run dev    # API en mode développement

Frontend
cd frontend/recettes-client
npm install
# configurer VITE_API_URL dans .env
npm run dev    # lancement du frontend (Vite)


Frontend : http://localhost:5174

Backend : http://localhost:3001

7. Pistes d’amélioration (évolution possible)

Recherche full-text dans MySQL (titre + description + ingrédients)

Système complet de tags (tables tags, recipes_tags) et filtrage par tag

Système de recommandations (“recettes similaires”, “tu pourrais aimer…”)

Dashboard admin (statistiques, modération avancée)

Déploiement complet (hébergement API + base + frontend)

Ce document est pensé pour que le jury puisse :

comprendre rapidement le périmètre du projet,

voir que le modèle de données est cohérent et évolutif,

retrouver les étapes d’installation et de lancement.

