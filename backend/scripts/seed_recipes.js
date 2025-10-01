// backend/scripts/seed_recipes.js
// Usage: node scripts/seed_recipes.js [count] [--clear]
// ex: node scripts/seed_recipes.js 120 --clear

require('dotenv').config();
const pool = require('../src/db'); // <- adapte le chemin si besoin

// --- helpers ---------------------------------------------------
async function findOrCreateIngredient(name) {
  const n = (name || '').trim();
  if (!n) return null;
  const [rows] = await pool.execute('SELECT id FROM ingredients WHERE name = ?', [n]);
  if (rows.length) return rows[0].id;
  const [res] = await pool.execute('INSERT INTO ingredients (name) VALUES (?)', [n]);
  return res.insertId;
}

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[rand(0, arr.length - 1)]; }
function pickMany(arr, n) {
  const copy = [...arr]; const out = [];
  for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(rand(0, copy.length - 1), 1)[0]);
  return out;
}

const CUISINES = [
  'Française','Italienne','Espagnole','Mexicaine','Asiatique','Indienne','Méditerranéenne',
  'Libanaise','Japonaise','Thaïlandaise','Marocaine','Portugaise','Végétarienne'
];

const DISHES = [
  'Pâtes à la sauce tomate','Poulet rôti','Salade Caesar','Tacos au bœuf','Curry de légumes',
  'Soupe miso','Burger maison','Ratatouille','Paella','Sushi bowl','Tagliatelles au pesto',
  'Quiche lorraine','Shakshuka','Pho','Lasagnes','Risotto aux champignons','Falafels',
  'Poulet tikka masala','Pad thaï','Tajine de poulet au citron','Gnocchis sauce gorgonzola',
  'Poke bowl au saumon','Omelette aux herbes','Crêpes sucrées','Cookies moelleux',
  'Brownies','Tiramisu','Cheesecake','Soupe à l’oignon','Bruschetta','Chili sin carne',
  'Bœuf bourguignon','Gratin dauphinois','Wok de légumes','Brochettes teriyaki',
  'Poulet basquaise','Salade de quinoa','Houmous','Taboulé','Chou-fleur rôti',
  'Pizza margherita','Frites de patate douce','Shawarma','Bánh mì','Biryani',
  'Mafé','Gaspacho','Fish and chips','Ceviche','Gaufres croustillantes'
];

const ING_POOL = [
  'Tomate','Oignon','Ail','Poivron','Carotte','Courgette','Aubergine','Pomme de terre',
  'Champignon','Citron','Gingembre','Coriandre','Persil','Basilic','Paprika',
  'Riz','Pâtes','Quinoa','Lentilles','Pois chiches','Farine','Sucre','Sel',
  'Poivre','Huile d’olive','Beurre','Crème','Lait','Fromage râpé','Parmesan',
  'Poulet','Bœuf','Porc','Thon','Saumon','Tofu','Œufs','Yaourt','Noix','Amandes'
];

function imageFor(title, cuisine) {
  const keywords = encodeURIComponent(`${title.split(' ')[0]},${cuisine},food,dish`);
  // Unsplash Source : image libre aléatoire selon mots-clés
  return `https://source.unsplash.com/random/800x600/?${keywords}`;
}

function buildInstructions(title) {
  return [
    `1. Préparez les ingrédients pour ${title.toLowerCase()}.`,
    `2. Faites revenir les aromates avec un filet d’huile d’olive.`,
    `3. Ajoutez l’ingrédient principal et assaisonnez.`,
    `4. Laissez cuire/mijoter jusqu’à la texture souhaitée.`,
    `5. Rectifiez l’assaisonnement et servez chaud.`
  ].join('\n');
}

// --- main ------------------------------------------------------
(async () => {
  try {
    // 1) utilisateur "Seeder"
    const seederEmail = 'seeder@example.com';
    const seederName = 'Seeder';
    const seederPassHash = '$2a$10$k1r8y2bM2tZs3c4D5e6F7u8v9w0xYzA13bC45DEfGhIJ6KL78MNOP'; // fake hash (non utilisé)
    const [u] = await pool.execute('SELECT id FROM users WHERE email=?', [seederEmail]);
    let userId;
    if (u.length) {
      userId = u[0].id;
    } else {
      const [ins] = await pool.execute(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [seederName, seederEmail, seederPassHash, 'admin']
      );
      userId = ins.insertId;
    }

    // 2) options CLI
    const count = Number(process.argv[2]) || 100;
    const doClear = process.argv.includes('--clear');

    if (doClear) {
      console.log('→ CLEAR: suppression des anciennes données liées (favorites, comments, recipe_ingredients, recipes)');
      await pool.execute('DELETE FROM favorites');
      await pool.execute('DELETE FROM comments');
      await pool.execute('DELETE FROM recipe_ingredients');
      await pool.execute('DELETE FROM recipes');
    }

    console.log(`→ Insertion de ${count} recettes…`);

    for (let i = 0; i < count; i++) {
      const title = pick(DISHES) + ' ' + (rand(1, 999));
      const cuisine = pick(CUISINES);
      const time = rand(10, 75);
      const servings = pick([1,2,2,3,4]); // un peu de biais vers 2/4
      const description = `Une ${title.toLowerCase()} simple et savoureuse, inspirée de la cuisine ${cuisine.toLowerCase()}.`;
      const instructions = buildInstructions(title);
      const image_url = imageFor(title, cuisine);

      const [recIns] = await pool.execute(
        `INSERT INTO recipes (user_id, title, description, image_url, cuisine_type, prep_time_minutes, servings, instructions)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, title, description, image_url, cuisine, time, servings, instructions]
      );
      const recipeId = recIns.insertId;

      // ingrédients 3–7
      const ingCount = rand(3, 7);
      const chosen = pickMany(ING_POOL, ingCount);
      for (const name of chosen) {
        const ingId = await findOrCreateIngredient(name);
        await pool.execute(
          'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, `unit`) VALUES (?, ?, ?, ?)',
          [recipeId, ingId, rand(1, 500).toString(), pick(['g','ml','càs','càc','']) || null]
        );
      }

      if ((i + 1) % 10 === 0) console.log(`  … ${i + 1}/${count}`);
    }

    console.log('✅ Seed terminé.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
})();
