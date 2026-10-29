# KalipheTiles — paquet de travail mis à jour

## Lancer
1. Décompresser l'archive dans un nouveau dossier.
2. Installer Python 3.11 ou 3.12 (si Python n'est pas déjà installé).
3. Ouvrir PowerShell dans ce dossier et lancer :
   ```powershell
   py -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   .\.venv\Scripts\python.exe launcher.py
   ```
4. Ne pas désactiver Microsoft Defender pour lancer l'application. Cette archive contient les scripts Python, pas un exécutable autonome.

## Fonctions ajoutées dans cette itération
- Accueil / liste des images récentes.
- Fusion des calques géoréférencés visibles en PNG et GeoTIFF avec un fichier JSON d'emprise.
- Export d'un paquet ZIP pour logiciel externe : originaux, images courantes, versions conservées, métadonnées du projet et fusion lorsque possible.
- Historique des images avant chaque manipulation; option pour exporter chaque résultat de recadrage, rotation, suppression de couleur ou harmonisation.
- Choix d'un dossier de sortie des tuiles via le sélecteur natif Windows; les résultats générés sont copiés dans ce dossier.
- Ajout d'un modèle de tuiles XYZ personnalisé (par exemple un service accessible sur le NAS).
- Afficher/masquer les clés API dans la fenêtre Clés et tutoriel de configuration.
- Taille des points de contrôle réglable.
- Réorganisation et visibilité des calques, réglages visuels de l'image dans Maps et rafraîchissement de l'ordre des images après activation du relief 3D.

## Limites à connaître
- Le sélecteur natif de dossier est destiné à l'application bureau sous Windows. Dans un navigateur ordinaire, il peut ne pas être disponible.
- Les services de cartes personnalisés doivent être accessibles depuis l'ordinateur et fournir des tuiles XYZ dans une URL contenant `{z}`, `{x}` et `{y}`. Un NAS ne rend pas automatiquement un service de tuiles : il faut qu'un serveur de tuiles y soit configuré.
- L'export de fusion est limité à une résolution maximale de rendu de 12 000 pixels sur le côté. Les images très grandes peuvent demander beaucoup de mémoire.
- La fusion géoréférencée est calculée à partir des points de contrôle des calques visibles; vérifiez les points et le résultat avant utilisation scientifique ou cartographique.
- Le choix d'un calque particulier comme masque de découpe du contour et une page d'accueil cartographique autonome restent à intégrer.
- Le problème du rendu 3D a reçu un correctif de réordonnancement après le chargement du relief, mais doit encore être confirmé sur votre ordinateur et vos données.

## Vérifications effectuées
- Compilation syntaxique de tous les modules Python.
- Vérification syntaxique JavaScript avec Node.js.
- Démarrage de l'application FastAPI et test HTTP des routes d'accueil, de liste récente, d'import d'image et de fusion sur une image de test.
- Intégrité de l'archive ZIP vérifiée.

Les tests ne remplacent pas une validation de bout en bout sur votre ordinateur Windows. Conservez une copie de vos données avant de remplacer une ancienne installation.
