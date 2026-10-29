# KalipheTiles — interface modernisée

## Interface
- Présentation inspirée des applications Microsoft Office : barre d'actions claire, boutons regroupés, onglets d'outils, états visuels et panneaux à coins arrondis.
- Espace de travail docké : image géoréférencée en haut à gauche, outils en bas à gauche et carte à droite.
- Faire glisser les séparateurs verticaux/horizontaux pour redimensionner les zones. Les autres panneaux s'adaptent automatiquement. Sur petit écran, les panneaux s'empilent.
- Le bouton de fenêtre agrandie permet d'agrandir temporairement un panneau ; le bouton moins le réduit.

## Page d'accueil et profil
- Import d'un logo SVG ou raster.
- Pour un logo SVG, la commande Couleur SVG recolore les couleurs hexadécimales et `currentColor` courants. Les SVG qui utilisent des dégradés, masques, filtres ou CSS complexes peuvent nécessiter une adaptation manuelle.
- Nom d'utilisateur conservé dans le stockage local du navigateur et affiché sous le logo.
- Ce profil n'est pas un système d'authentification sécurisé : il ne gère ni mot de passe, ni comptes serveur, ni synchronisation entre ordinateurs.

## Contrôles effectués
- Compilation syntaxique des modules Python.
- Vérification syntaxique du JavaScript intégré via Node.js.
- Pas de test de bout en bout effectué dans un navigateur connecté aux services distants.

## Correctif du 29 octobre 2026
- La page d'accueil a été isolée du nouveau ruban de travail : le ruban n'apparaît qu'une fois une image/projet ouvert, afin de ne pas remanier la landing page.
- Le ruban de travail Office propose les onglets Accueil, Image, Géoréférencement, Carte, Affichage et Export, avec des raccourcis vers les commandes existantes.
- La vue globe utilise d'abord MapLibre GL JS 5.6.2 depuis le CDN (projection globe prise en charge) et conserve la version locale en solution de repli hors ligne. La bascule attend le chargement du style et affiche les erreurs réelles dans la barre d'état.
- Contrôles de syntaxe JavaScript et compilation Python effectués. La vue globe distante et les fonds de carte doivent encore être validés sur une machine connectée.
