Utiliser fpm en image de base
Install de package sans besoin d'installer les deps grace à install-php-extensions (ajouter de fixer les versions)
Php ini different pour cli et pour fpm, à voir comment faire, il faut que une commande php depuis le container ait une conf speciale (memoire illimité, apcache avec timstamp...)
install-php-extensions créé tjs un $PHP_INI_DIR/conf.d/docker-xxx qui active l'extension, faire donc des fichiers $PHP_INI_DIR/conf.d/zz-xxx.ini avec nos confs spécifiques