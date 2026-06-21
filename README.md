# Mak'Dal — Application de gestion

## 🚀 Déployer sur Vercel (gratuit)

### Étape 1 — Mettre le projet sur GitHub
1. Va sur https://github.com/new
2. Nom du dépôt : `makdal-app`
3. Laisse "Public" coché → clique **"Create repository"**
4. Sur la page suivante, clique **"uploading an existing file"**
5. Glisse-dépose **TOUS les fichiers et dossiers** de ce projet (garde la structure : `public/`, `src/`, `package.json`)
6. Clique **"Commit changes"**

### Étape 2 — Déployer sur Vercel
1. Va sur https://vercel.com et connecte-toi avec ton compte GitHub
2. Clique **"Add New..."** → **"Project"**
3. Trouve `makdal-app` dans la liste → clique **"Import"**
4. Laisse tous les réglages par défaut (Vercel détecte automatiquement React)
5. Clique **"Deploy"**
6. Attends 1-2 minutes → tu obtiens une URL du genre `makdal-app.vercel.app`

### Étape 3 — Installer sur ton téléphone
1. Ouvre l'URL Vercel sur ton téléphone (Safari sur iPhone, Chrome sur Android)
2. **iPhone** : appuie sur le bouton Partager (carré avec flèche) → "Sur l'écran d'accueil"
3. **Android** : menu (3 points) → "Ajouter à l'écran d'accueil" / "Installer l'application"
4. L'icône Mak'Dal apparaît sur ton écran d'accueil comme une vraie app !

## 💾 Sauvegarde des données
Toutes les données (CA, dépenses, employés, avances) sont automatiquement sauvegardées dans la mémoire de ton téléphone (localStorage). Rien ne disparaît, même si tu fermes l'app ou éteins ton téléphone.

⚠️ Si tu changes de téléphone ou vide le cache du navigateur, les données seront perdues (elles ne sont pas encore sur un serveur en ligne). Pour une sauvegarde encore plus solide, on pourra ajouter une vraie base de données dans une prochaine étape.

## 🔄 Mettre à jour l'app plus tard
Si tu veux changer quelque chose dans l'app, reviens sur cette conversation Claude, demande la modification, puis remplace les fichiers sur GitHub (Vercel redéploiera automatiquement).
