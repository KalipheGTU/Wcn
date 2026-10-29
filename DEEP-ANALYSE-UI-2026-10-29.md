# Revue UX/UI et corrections — 2026-10-29

## Diagnostic effectué
- L'application utilisait déjà un ruban Office et trois panneaux dockés, mais les commandes de configuration générale, d'aide et de licence étaient absentes.
- Les contrôles de points étaient définis par une icône personnalisée fixe ; l'utilisateur ne pouvait pas ajuster leur taille, opacité, couleur et taille de numéro depuis les paramètres.
- Les fenêtres Image et Outils n'avaient pas de boutons d'historique dans leur barre de titre ; Carte avait seulement les commandes dans la palette de dessin.
- La palette de dessin/mesure n'avait pas de commande dédiée pour être masquée/affichée.
- La licence exacte n'est pas confirmable dans cette archive car aucun fichier LICENSE n'a été trouvé.

## Changements de cette livraison
- Agrandissement du logo sur la landing page sans modifier ses actions ni sa structure générale.
- Ruban plus explicite avec icônes et groupes par tâche.
- Paramètres généraux : taille, couleur, opacité et taille de numéro des marqueurs, précision décimale d'affichage, couleur et épaisseur par défaut des dessins.
- Historique visible dans les trois fenêtres : Image et Outils contrôlent l'historique des points ; Carte contrôle l'historique de dessin/mesure.
- Afficher/masquer les outils de dessin et mesure depuis la barre de titre de Carte et le ruban.
- Menus Aide, À propos, Licence, GitHub et Wiki. Le dialogue Licence indique explicitement qu'aucun fichier de licence n'a été trouvé plutôt que d'inventer une licence.
- Préservation de la landing page d'origine, hormis l'agrandissement du logo et l'amélioration responsive des commandes de profil.

## Vérifications
- `node --check` exécuté sur les scripts JavaScript intégrés.
- `python -m py_compile` exécuté sur les fichiers Python de l'application.
- Contrôle des identifiants HTML : aucune duplication détectée.

## Limites connues
- Les boutons Image et Outils partagent l'historique des points de contrôle, car ces points constituent un même état de géoréférencement ; ils ne créent pas deux historiques incompatibles.
- La précision réglable agit sur le nombre de décimales affichées dans la liste des points, pas sur la précision physique des données ou la précision des sources cartographiques.
- La recoloration de l'icône raster des points utilise un filtre de teinte CSS : le rendu dépend de l'image et la correspondance couleur n'est pas aussi exacte qu'une icône vectorielle paramétrique.
- Les traitements destructifs des pixels ne gagnent pas de nouvel historique complet dans cette livraison.
- Aucun test d'interface en navigateur réel n'a été exécuté ; les vérifications sont statiques.
