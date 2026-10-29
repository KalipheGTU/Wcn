# KalipheTiles (Windows 11)

Géoréférencement d'images (JPG, PNG, TIFF, MNT 16/32 bits), onglets d'images, collage avec synchronisation des couleurs,
aperçu en direct, relief 3D, heightmap OpenTopography, tuiles XYZ / MBTiles / GeoPackage, GeoTIFF, Shapefile, GeoJSON, JSON des limites, KMZ, S3.
Dossier de travail : Documents\KalipheTiles — journal : kaliphetiles.log — bouton « 🔧 Diagnostic ».
Icône : static/icon.png (le workflow en fait l'icône de l'exe) — marqueurs : static/loupe.png — accueil : static/world.png.
Raccourcis : Ctrl+Z / Ctrl+Y, Suppr, Échap, Ctrl+S (enregistrer), Ctrl+Maj+S (enregistrer sous).


## Import vectoriel, DXF et PMTiles (ajouts)
- L'en-tête propose l'import GeoJSON, KML, Shapefile compressé en ZIP et DXF, avec affichage des entités sur la carte.
- Le bouton DXF exporte le dernier jeu de vecteurs importé. Le module `ezdxf` est inclus dans les dépendances.
- Le bouton PMTiles convertit le fichier MBTiles produit par le géoréférencement. Le binaire officiel `pmtiles` doit être installé et accessible dans le PATH de la machine.
- Les fichiers DWG, SKP, RVT et 3DM ne sont pas convertis nativement par cette version. Pour les échanger, utiliser un convertisseur spécialisé ou exporter depuis le logiciel d'origine vers DXF (2D), IFC (BIM) ou un format maillé tel que OBJ/glTF (3D). La conversion intermédiaire peut perdre des données.


## UX et outils de carte ajoutés
- Barre Fichier compacte avec import vecteur/DXF/PDF/SVG et export DXF/PMTiles.
- Mesure de ligne, polyligne, surface, ligne de repère et grille métrique configurable (mètres).
- Réorganisation des calques par glisser-déposer dans la liste Calques.
- Dépôt de fichiers raster/vectoriels dans la fenêtre pour lancer leur import.

Limites : le quadrillage est une grille métrique approximée localement en latitude/longitude (adaptée à une zone de travail, pas aux grandes emprises). Les formats propriétaires DWG/SKP/RVT/3DM ne sont pas convertis nativement. Les outils sont ajoutés au front-end existant et doivent être validés avec les jeux de données réels de l’installation.
