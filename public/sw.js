// Service Worker pour les notifications push Lotysis
// Gère les notifications en arrière-plan et les interactions utilisateur

const CACHE_NAME = 'lotysis-notifications-v1'
const NOTIFICATION_CACHE = 'lotysis-notification-data'
const urlsToCache = [
  "/",
  "/manifest.json",
  "/icon-192x192.png",
  "/icon-512x512.png",
  '/icons/lottery.png',
  '/icons/accuracy.png',
  '/icons/trend.png',
  '/icons/suggestion.png',
  '/icons/system.png',
  '/icons/default.png',
  '/icons/badge.png'
]

// Installation du service worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    }),
  );
});

// Activation du service worker
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
});

// Interception des requêtes
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        // Retourner la réponse du cache si disponible
        if (response) {
          return response;
        }

        // Sinon, faire la requête réseau
        return fetch(event.request).then((response) => {
          // Vérifier si la réponse est valide
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }

          // Cloner la réponse
          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        });
      })
      .catch(() => {
        // Retourner une page hors ligne si disponible
        if (event.request.destination === "document") {
          return caches.match("/");
        }
      }),
  );
});

// Gestion des notifications push
self.addEventListener('push', (event) => {
  console.log('📨 Notification push reçue')

  if (!event.data) {
    console.warn('Notification push sans données')
    return
  }

  try {
    const data = event.data.json()

    event.waitUntil(
      showNotification(data)
    )
  } catch (error) {
    console.error('Erreur traitement notification push:', error)
  }
})

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Clic sur notification:', event.notification.tag)

  event.notification.close()

  const notificationData = event.notification.data || {}
  const action = event.action

  event.waitUntil(
    handleNotificationClick(action, notificationData, event.notification)
  )
})

// Gestion de la fermeture des notifications
self.addEventListener('notificationclose', (event) => {
  console.log('❌ Notification fermée:', event.notification.tag)

  // Enregistrer la fermeture pour les statistiques
  const notificationData = event.notification.data || {}

  event.waitUntil(
    recordNotificationEvent('closed', notificationData)
  )
})

// Fonction pour afficher une notification
async function showNotification(data) {
  try {
    const {
      title,
      body,
      icon = '/icons/default.png',
      badge = '/icons/badge.png',
      tag,
      data: notificationData = {},
      actions = [],
      requireInteraction = false,
      silent = false,
      vibrate = [200, 100, 200]
    } = data

    const options = {
      body,
      icon,
      badge,
      tag,
      data: notificationData,
      actions: actions.slice(0, 2), // Maximum 2 actions sur la plupart des plateformes
      requireInteraction,
      silent,
      vibrate: silent ? undefined : vibrate,
      timestamp: Date.now(),
      renotify: true // Remplacer les notifications avec le même tag
    }

    // Ajouter des actions par défaut si aucune n'est fournie
    if (options.actions.length === 0) {
      options.actions = [
        {
          action: 'view',
          title: 'Voir',
          icon: '/icons/view.png'
        },
        {
          action: 'dismiss',
          title: 'Ignorer',
          icon: '/icons/dismiss.png'
        }
      ]
    }

    await self.registration.showNotification(title, options)

    // Enregistrer l'affichage pour les statistiques
    await recordNotificationEvent('shown', notificationData)

    console.log('✅ Notification affichée:', title)
  } catch (error) {
    console.error('Erreur affichage notification:', error)
  }
}

// Fonction pour gérer les clics sur les notifications
async function handleNotificationClick(action, notificationData, notification) {
  try {
    // Enregistrer le clic pour les statistiques
    await recordNotificationEvent('clicked', notificationData, action)

    let url = '/'

    // Déterminer l'URL de destination selon l'action et le type
    switch (action) {
      case 'view':
      case '': // Clic sur la notification elle-même
        url = getNotificationUrl(notificationData)
        break

      case 'view_prediction':
        url = '/predictions/history'
        break

      case 'view_results':
        url = `/results/${notificationData.drawName || ''}`
        break

      case 'view_trends':
        url = '/statistics'
        break

      case 'view_suggestion':
        url = '/predictions'
        break

      case 'view_history':
        url = '/predictions/history'
        break

      case 'dismiss':
        // Ne rien faire, juste fermer
        return

      default:
        url = '/'
    }

    // Ouvrir ou focuser la fenêtre de l'application
    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })

    // Chercher une fenêtre existante avec l'URL cible
    for (const client of clients) {
      if (client.url.includes(url.split('?')[0]) && 'focus' in client) {
        await client.focus()

        // Envoyer les données de notification au client
        client.postMessage({
          type: 'NOTIFICATION_CLICKED',
          data: notificationData,
          action
        })

        return
      }
    }

    // Ouvrir une nouvelle fenêtre si aucune n'est trouvée
    if (self.clients.openWindow) {
      const newClient = await self.clients.openWindow(url)

      // Attendre que la nouvelle fenêtre soit chargée
      if (newClient) {
        setTimeout(() => {
          newClient.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: notificationData,
            action
          })
        }, 1000)
      }
    }

  } catch (error) {
    console.error('Erreur gestion clic notification:', error)
  }
}

// Fonction pour déterminer l'URL selon le type de notification
function getNotificationUrl(notificationData) {
  const { type, drawName } = notificationData

  switch (type) {
    case 'draw_result':
      return drawName ? `/results/${drawName}` : '/results'

    case 'prediction_accuracy':
      return '/predictions/history'

    case 'trend_alert':
      return '/statistics'

    case 'smart_suggestion':
      return '/predictions'

    case 'system_update':
      return '/settings'

    default:
      return '/'
  }
}

// Fonction pour enregistrer les événements de notification
async function recordNotificationEvent(eventType, notificationData, action = null) {
  try {
    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      notificationId: notificationData.id || 'unknown',
      notificationType: notificationData.type || 'unknown',
      action,
      userAgent: navigator.userAgent,
      platform: navigator.platform
    }

    // Stocker dans le cache pour synchronisation ultérieure
    const cache = await caches.open(NOTIFICATION_CACHE)
    const eventKey = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    await cache.put(
      new Request(eventKey),
      new Response(JSON.stringify(event), {
        headers: { 'Content-Type': 'application/json' }
      })
    )

    // Essayer d'envoyer immédiatement si en ligne
    if (navigator.onLine) {
      await syncNotificationEvents()
    }

  } catch (error) {
    console.error('Erreur enregistrement événement notification:', error)
  }
}

// Fonction pour synchroniser les événements avec le serveur
async function syncNotificationEvents() {
  try {
    const cache = await caches.open(NOTIFICATION_CACHE)
    const requests = await cache.keys()

    for (const request of requests) {
      if (request.url.includes('event-')) {
        const response = await cache.match(request)
        const eventData = await response.json()

        // Envoyer au serveur (à implémenter selon l'API)
        try {
          await fetch('/api/notifications/events', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
          })

          // Supprimer du cache après envoi réussi
          await cache.delete(request)

        } catch (fetchError) {
          console.warn('Erreur envoi événement notification:', fetchError)
          // Garder dans le cache pour retry ultérieur
        }
      }
    }

  } catch (error) {
    console.error('Erreur synchronisation événements notifications:', error)
  }
}

console.log('🔔 Service Worker Lotysis Notifications chargé')
