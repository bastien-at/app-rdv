## Général

Repository contenant divers outils devops réutilisés sur plusieurs projets.  
Ce projet est inclus en subtree sur ces projets (pour pouvoir utiliser les makefile de base par exemple).
```bash
git subtree pull --prefix path/to/subtree git@github.com:Alltricks/docker.git master --squash
```

Toute modification dans ce répertoire doit donc pliutot passer par des commits dans le repository https://github.com/Alltricks/devops
puis des pull des substree si besoin.
```bash
git subtree pull --prefix path/to/subtree git@github.com:Alltricks/docker.git master --squash
```

## Docker

Pour builder et pusher les images, aller dans le dossier docker et exécuter `make build-xxx` / `make build-and-push-xxx` / `make push-xxx`.  
Au build, le script demande la dernière version disponible pour forcer un pull et utiliser les layers existantes au maximum.  
Puis, pour chaque stage dans le Dockerfile (excepté ceux nommés `not-final-`), le script va builder l'image associée en taggant l'image avec `version-stage` (eg `3.0.0-dev`).  
Pour l'image de production principale (stage `prod`), le script va générer une image finale avec un seul layer pour optimiser la taille.
