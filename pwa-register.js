// pwa-register.js
// À inclure une seule fois, juste avant </body>, avec :
// <script src="/pwa-register.js"></script>
//
// Ce fichier fait deux choses :
// 1) Enregistre le Service Worker (nécessaire pour l'installation ET le mode hors ligne).
// 2) Affiche automatiquement un bouton "📲 Installer l'application" flottant
//    quand le navigateur détecte que le site est installable — sans avoir
//    besoin d'ajouter quoi que ce soit dans index.php.

// ============================================================
// 1) ENREGISTREMENT DU SERVICE WORKER
// ============================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/service-worker.js')
            .then((reg) => console.log('Service Worker enregistré :', reg.scope))
            .catch((err) => console.error('Erreur Service Worker :', err));
    });
}

// ============================================================
// 2) BOUTON D'INSTALLATION AUTOMATIQUE
// ============================================================
let deferredPrompt = null;

// Le navigateur déclenche cet événement uniquement si TOUTES les conditions
// d'installabilité sont réunies (manifest valide, icônes présentes, HTTPS
// valide, Service Worker actif). S'il ne se déclenche jamais, l'un de ces
// critères n'est pas encore rempli.
window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    showInstallButton();
});

window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    hideInstallButton();
    console.log('Application installée avec succès.');
});

function showInstallButton() {
    if (document.getElementById('pwaInstallBtn')) return;
    if (sessionStorage.getItem('pwaInstallDismissed') === '1') return;

    const btn = document.createElement('button');
    btn.id = 'pwaInstallBtn';
    btn.type = 'button';
    btn.setAttribute('aria-label', "Installer l'application");
    btn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 99999;
        display: flex;
        align-items: center;
        gap: 8px;
        background: #121B30;
        color: #fff;
        border: 2px solid #B8934B;
        border-radius: 50px;
        padding: 12px 18px;
        font-size: 14px;
        font-weight: 700;
        font-family: 'IBM Plex Sans', -apple-system, sans-serif;
        cursor: pointer;
        box-shadow: 0 8px 24px rgba(18,27,48,0.35);
        transition: transform 0.2s ease;
    `;
    btn.onmouseenter = () => { btn.style.transform = 'translateY(-3px)'; };
    btn.onmouseleave = () => { btn.style.transform = 'translateY(0)'; };

    const label = document.createElement('span');
    label.textContent = "📲 Installer l'application";
    btn.appendChild(label);

    const closeBtn = document.createElement('span');
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'Fermer');
    closeBtn.style.cssText = 'opacity:0.65; font-weight:400; padding-left:2px;';
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sessionStorage.setItem('pwaInstallDismissed', '1');
        hideInstallButton();
    });
    btn.appendChild(closeBtn);

    btn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log("Choix de l'utilisateur :", outcome);
        deferredPrompt = null;
        hideInstallButton();
    });

    document.body.appendChild(btn);
}

function hideInstallButton() {
    const btn = document.getElementById('pwaInstallBtn');
    if (btn) btn.remove();
}