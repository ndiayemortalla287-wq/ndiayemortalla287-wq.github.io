// service-worker.js
// Stratégie : les pages PHP dynamiques (admin, cartes, cotisations...) ne sont
// JAMAIS mises en cache automatiquement (données sensibles / changeantes).
// Seuls les fichiers statiques (logos, photos, polices, offline.html) sont mis
// en cache pour accélérer le chargement et permettre un minimum de mode hors ligne.

const CACHE_NAME = 'teranga-cache-v2';

// Liste de fichiers statiques à mettre en cache dès l'installation.
// ⚠️ Ces chemins doivent correspondre à des fichiers qui existent réellement
// à la racine du site.
const STATIC_ASSETS = [
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon-96x96.png',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png'
];

// ============================================================
// INSTALLATION : on met en cache les fichiers statiques essentiels.
// Chaque fichier est ajouté individuellement (au lieu de cache.addAll,
// qui annule TOUTE l'installation si un seul fichier est introuvable).
// Ainsi, un fichier manquant ou renommé ne bloque plus l'installation
// du Service Worker ni de l'application.
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[Service Worker] Impossible de mettre en cache :', url, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// ============================================================
// ACTIVATION : on supprime les anciens caches (version précédente)
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ============================================================
// FETCH : stratégie différente selon le type de requête
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // On ne touche jamais aux requêtes POST (formulaires : login, création
  // de membre, paiements, etc.) — elles doivent toujours aller au serveur.
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // 1) Navigation (chargement d'une page ?page=... du site) :
  //    on tente d'abord le réseau (contenu à jour), et si hors ligne,
  //    on affiche une page offline.html générique.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // 2) Fichiers statiques (uploads/logos, photos, polices, icônes) :
  //    on sert depuis le cache si présent, sinon on va au réseau et on
  //    met en cache la réponse pour la prochaine fois.
  if (
    url.pathname.startsWith('/uploads/') ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // 3) Tout le reste (appels ?action=... de l'admin, QR codes externes, etc.)
  //    part directement au réseau, sans passer par le cache.
});