# KalipheTiles — mise à jour outils cartographiques

- Méthode de géoréférencement affine (3+ points) également visible dans le panneau Image.
- Fusion d'images accessible depuis le panneau Image (raccourci vers la fonction de fusion existante).
- Historique séparé pour les points de contrôle (Ctrl+Z/Ctrl+Y dans Image) et les mesures/dessins de la carte (Ctrl+Z/Ctrl+Y lorsque la souris est sur la carte).
- Les mesures terminées affichent une étiquette de distance ou de surface sur la carte.
- Menu contextuel sur les points de contrôle : supprimer / rendre fixe ou mobile. Les points fixes ne peuvent pas être déplacés.
- Menu contextuel sur les lignes/polygones dessinés : supprimer / rendre fixe ou mobile.
- Ordre des onglets réorganisé selon le flux : Projet, Image, Points, Calques, Localisation, Terrain, Cloud, Export.
- Fond Mapbox Satellite distinct ajouté, à côté de Satellite Streets, Rues et Outdoors. Le token Mapbox reste requis.

## Limites connues

- Ctrl+Z/Ctrl+Y est distinct entre les points de contrôle et les mesures/dessins, mais les traitements destructifs de pixels (rogner, pivoter, suppression de couleur, contraste) n'ont pas encore de véritable historique de versions image.
- La fusion est un export produit par le serveur : annuler une fusion ne peut pas rappeler un fichier déjà téléchargé. Le bouton du panneau Image lance la même fonction de fusion.
- La disponibilité des fonds IGN, Google et Mapbox dépend de leur accès réseau, des clés/tokens et des conditions d'utilisation. Google et Mapbox nécessitent les identifiants configurés dans Options/Clés.
- La vérification syntaxique ne remplace pas un test fonctionnel dans un navigateur avec des clés API valides.
