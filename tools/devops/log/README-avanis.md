# Stack ELK

## Serveur

Il s'agit d'une VM hébergé chez OVH et gérée par Synalabs.

*Docker* et *docker compose* sont installés sur la VM.
ELK est lancé via docker compose (depuis le répertoire */usr/local/bin/log*).

Une partition de 2 To sur un disque séparé est montée sur */data* pour faciliter son resize ultérieure à chaud si nécessaire.
Les données de Elasticsearch sont stockées dans */data/elasticsearch/data*.

## Les entrées DNS et IPs

IP privée: 10.50.0.6
IP publique: 51.178.237.92 (uniquement pour les flux TLS input logstash/fleet)

DNS :
- logs.alltricks.sexy

Ports :
* 5044: Logstash Beats input (public)
* 50000: Logstash TCP input (public)
* 9600: Logstash monitoring API (private)
* 9200: Elasticsearch HTTP (public)
* 9300: Elasticsearch TCP transport (private)
* 5601: Kibana (private)
* 8220: Server fleet (public)
* 80: Let's encrypt (public)

## Configuration

Les directives de configuration sont disponibles dans le fichier *.env*. Si ce fichier n'existe pas, le créer à partir du modèle *.env.dist* (`cp .env.dist .env`).

Configurer les variables d'environement suivantes et bien laisser commenté `FLEET_SERVER_SERVICE_TOKEN`, `STAGING_GKE_FLEET_ENROLLMENT_TOKEN`, `PROD_GKE_FLEET_ENROLLMENT_TOKEN` et `KUBERNETES_FLEET_ENROLLMENT_TOKEN` pour le moment :

```bash
ELASTIC_PASSWORD='[générer un mot de passe]'
LOGSTASH_INTERNAL_PASSWORD='[générer un mot de passe]' 
KIBANA_SYSTEM_PASSWORD='[générer un mot de passe]'
#FLEET_SERVER_SERVICE_TOKEN=''
#STAGING_GKE_FLEET_ENROLLMENT_TOKEN=''
#PROD_GKE_FLEET_ENROLLMENT_TOKEN=''
#KUBERNETES_FLEET_ENROLLMENT_TOKEN=''
```

## Installation de la stack ELK - Fleet Server

### Etape 1 - Initialisation de la machine

Depuis le serveur hôte, exécuter le script `scripts/initialize-host-machine.sh (via `root` ou `sudo) qui va se charger de :
- installer docker et docker compose depuis le repository officiel de Docker.
- configurer le système pour répondre aux exigences d'Elasticsearch
- ajouter une *unit* systemd pour démarrer et arrêter la stack ELK au démarrage et arrêt du système.

### Etape 2 - Initialisation de la stack ELK

Lancer l'initialisation de la stack avec la commande `make init` (lancer elasticsearch et kibana mais pas fleet-server).

Depuis l'interface Kibana, d'ajout d'un Fleet Server, spécifier les données suivantes (https://logs.alltricks.sexy:5601/app/fleet/agents, puis le bouton "Add Fleet Server") :
- Name : Fleet Server
- URL : https://logs.alltricks.sexy:8220

Récupérer le token indiqué dans l'interface suite à l'ajout du fleet-server; renseigner et décommenter la variable d'environnement `FLEET_SERVER_SERVICE_TOKEN` dans le fichier `.env` avec ce token.

### Etape 3 - Lancement de la stack ELK (avec le Server Fleet)

Lancer toute la stack avec la commande `make up`.
Une fois le server Fleet démarré, le bouton *Continue enrolling Elastic Agent* est affiché (ne pas cliquer dessus et fermer la pop-in).

> En cas de mise à jour de la stack ELK, modifier le numéro de version dans le fichier `.env` et lancer un `make build`.

## Ajout des agents 

### Etape 1 - Créer les Policies d'un environnement

Pour chaque environnement, nous avons besoin de 2 Policies.
  1. Une pour récupérer les logs et APM des différentes nodes. Un agent sera installé sur chaque node via un Daemonset et cette Policy sera appliquée sur chaque agents. Nommer cette Policy *GKE Policy - XXX*.
  2. Une autre pour récupérer les metric du cluster Kubernetes. Un agent unique sera installé via un Deployment et cette Policy sera appliquée sur ce seul agent. Nommer cette Policy *KSM Policy - XXX*.

Par exemple pour notre environnement **staging**, créer les Policies **GKE Policy - staging** et **KSM Policy - staging**.

Créer ces deux nouvelles 'Agent policies' depuis l'interface *Fleet* > *Agent policies*.

### Etape 2 - Ajouter les agents liés à chaque Policy

Depuis l'interface Fleet, ajouter un agent (bouton *Add agent*).
Dans la nouvelle interface **Add agent** :
  1. Sélectionné l'agent policy *GKE Policy - XXX* précédemment créée.
  2. Récupérer le token présent dans les encarts "Enroll in fleet ?"

Renseigner la variable d'environnements `XXX_GKE_FLEET_ENROLLMENT_TOKEN` avec le token de l'interface d'ajout d'agents, dans le fichier *.env*.

Par exemple, pour l'environnement **staging** : ajouter la variable d'environnement `STAGING_GKE_FLEET_ENROLLMENT_TOKEN=my-token-gke`.

---

De nouveau depuis l'interface Fleet, ajouter un agent (bouton *Add agent*).
Dans la nouvelle interface **Add agent** :
1. Sélectionné l'agent policy *KSM Policy - XXX* précédemment créée.
2. Récupérer le token présent dans les encarts "Enroll in fleet ?"

Renseigner la variable d'environnements `XXX_KSM_FLEET_ENROLLMENT_TOKEN` avec le token de l'interface d'ajout d'agents, dans le fichier *.env*.

Par exemple, pour l'environnement **staging** : ajouter la variable d'environnement `STAGING_KSM_FLEET_ENROLLMENT_TOKEN=my-token-ksm`.

### Etape 3 - Déploiement des agents sur Kubernetes

Une fois que la stack est installée et bien lancée, exécuter la commande `make generate-k8s-resources XXX` et récupérer la sortie de ce script sous forme de manifeste Kubernetes afin de la placer dans un fichier `.yaml`.

Pour l'environnement de **staging** par exemple, la commande sera `make generate-k8s-resources staging`.

Il faudra ensuite appliquer ce manifeste depuis une machine qui a la possibilité de se connecter sur le cluster avec `kubectl`, par exemple depuis notre machine locale; exemple `kubectl apply -f my-file.yaml` (il faut également créer le namespace avant `kubectl create namespace elastic-agent`).

## Démarrage/arrêt de stack ELK avec le système

Une *unit* systemd de type service (cf *systemd/elk.service*) est copiée dans systemd afin de gérer le démarrage et l'arrêt de la stack ELK au démarrage et à l'arrêt du système.
Il s'agit d'une *unit* de type *oneshot* (pas de health check) : si une application de la stack crash, elle ne sera pas redémarrée par systemd; ceci est géré directement par *docker compose* via les directives `restart` présentes dans le fichier *docker-compose.yaml*.

Une *unit* systemd de type service (cf *systemd/notifier.service*) est mis en place de la même façon pour gérer les notifications à Discord (à l'heure actuelle, OnCall ne fait pas de notification sur les ack/resolve)

Une *unit* systemd de type service (cf *systemd/certbot-renew.service*) et un *timer* (cf *systemd/certbot-renew.timer*) permettent le renouvellement automatique du certificat let's encrypt.

## TLS/SSL & /etc/hosts

Afin que le HTTPS fonctionne, la config ELK utilise l'host "logs.alltricks.sexy", ce qui génère du traffic externe qui revient sur la machine.
Pour le traffic reste sur la machine, il faut ajouter la directive suivant dans le fichier `/etc/hosts` (avec l'IP correspondant à celle définie par docker) et notamment afin de résoudre le souci d'accessibilité de Kibana.

Ajouter l'IP dans le fichier `/etc/hosts` (en root) :

```bash
echo "$(docker network inspect -f '{{json .IPAM.Config}}' bridge | jq -r .[].Gateway) logs.alltricks.sexy" >> /etc/hosts
```

## Utilitaire : Démarrage/arrêt de stack ELK manuellement

Un `Makefile` est présent à la racine du projet. Il contient les targets :
- `init` : initialisation de la stack ELF sans fleet-server.
- `up` : démarrer la stack ELF manuellement avec la possibilité de spécifier des services; exemple : `make up elasticsearch`.
- `stop` : arrêter la stack ELF manuellement avec la possibilité de spécifier des services; exemple : `make stop elasticsearch fleet-server`.
- `reload` : équivalent de `stop` puis `up` avec la possibilité de spécifier des services; exemple : `make stop kibana`.
- `restart` : redémarrer (docker composer restart) avec la possibilité de spécifier des services; exemple : `make restart kibana`.
- `ps` : afficher l'état de conteneurs.
- `logs`: afficher les logs des conteneurs avec la possibilité de spécifier des services, exemple `make logs kibana`.
- `exec`: exécuter une commande dans un conteneur avec la possibilité de spécifier des services, exemple `make exec fleet-server bash`.
- `exec-as-root`: exécuter une commande en tant que root dans un conteneur avec la possibilité de spécifier des services, exemple `make exec-as-root fleet-server bash`.
- `generate-k8s-resources` : générer le manifeste Kubernetes des resources lié au monitoring/remonté des logs des conteneurs.
- `help` : afficher le résumé des targets disponibles.

# Configuration des intégrations :

## Intégration "Custom logs" pour les applications
Ajouter l'intégration des "Custom logs" et dans les paramètres avancés, définir les processors et la configuration avancées suivantes :

|               | Qualif                                          | Prod                                         |
|---------------|-------------------------------------------------|----------------------------------------------|
| Log file path | `/var/log/containers/*_pr-*_http-*.log`         | `/var/log/containers/*_alltricks_http-*.log` |
|               | `/var/log/containers/*_pr-*_php-*.log`          | `/var/log/containers/*_alltricks_php-*.log`  |
|               | `/var/log/containers/*_pr-*_check-commit-*.log` |                                              |
| Dataset       | `at_staging_log_kube`                           | `at_prod_log_kube`                           |

Processors :
```yaml
- add_kubernetes_metadata:
    in_cluster: true
    indexers:
      - pod_uid: ~
    matchers:
      - logs_path:
          logs_path: /var/log/containers/
          resource_type: container
    add_resource_metadata:
      deployment: true
      cronjob: true
- drop_fields:
    ignore_missing: true
    fields: ["host.ip", "host.mac"]
- if:
    regexp:
      message: "^{.*}$$"
  then:
    - decode_json_fields:
        fields: ["message"]
        target: entry
        overwrite_keys: true
    - drop_fields:
        fields: ["entry.datetime"]
        ignore_missing: true
  else:
    - if:
        regexp:
          message: ": PHP message:"
      then:
        - add_fields:
            target: ""
            fields:
              entry.log_source: php
      else:
        - add_fields:
            target: ""
            fields:
              entry.log_source: unknown
- if:
    has_fields: ["entry.message"]
  then:
    - drop_fields:
        fields: ["message"]
        ignore_missing: true
    - copy_fields:
        fields:
          - from: entry.message
            to: message
    - drop_fields:
        fields: ["entry.message"]
- if:
    has_fields: ["entry.time"]
  then:
    - timestamp:
        field: entry.time
        layouts: ["UNIX"]
- rename:
    fields:
      - from: "entry.extra.trace"
        to: "trace"
    ignore_missing: true
#- convert:
#    fields:
#      - {from: "entry.request_time", type: "float"}
#      - {from: "entry.time", type: "float"}
#      - {from: "entry.context.code", type: "string"}
#      - {from: "entry.context.error_code", type: "string"}
#      - {from: "entry.context.order", type: "string"}
#      - {from: "entry.context.id", type: "integer"}
#      - {from: "entry.context.order_id", type: "integer"}
#      - {from: "entry.context.product_id", type: "integer"}
#      - {from: "entry.context.product_offer_id", type: "integer"}
#      - {from: "entry.context.logistics_order_id", type: "integer"}
#    ignore_missing: true
#    fail_on_error: false
```

Custom configurations:
```yaml
type: container
scan_frequency: 2s
max_backoff: 2s
backoff_factor: 1
```

Mappings, ajouter un mapping custom et utiliser le bouton `Load JSON`:
```json
{
  "properties": {
    "entry.context.code": {
      "type": "keyword"
    },
    "entry.context.error_code": {
      "type": "keyword"
    },
    "entry.context.http.response.administration_fee_amount": {
      "type": "float"
    },
    "entry.context.http.response.effective_annual_percentage_rate": {
      "type": "float"
    },
    "entry.context.http.response.payment_amount": {
      "type": "float"
    },
    "entry.context.id": {
      "type": "integer"
    },
    "entry.context.logistics_order_id": {
      "type": "integer"
    },
    "entry.context.order": {
      "type": "keyword"
    },
    "entry.context.order_id": {
      "type": "integer"
    },
    "entry.context.price": {
      "type": "float"
    },
    "entry.context.product_id": {
      "type": "integer"
    },
    "entry.context.product_offer_id": {
      "type": "integer"
    },
    "entry.request_time": {
      "type": "float"
    },
    "entry.time": {
      "type": "float"
    }
  }
}
```

## Intégration "Custom logs" pour mysql replication watcher
Ajouter l'intégration des "Custom logs" et dans les paramètres avancés, définir les processors et la configuration avancées suivantes :

|               | Qualif | Prod                                                              |
|---------------|--------|-------------------------------------------------------------------|
| Log file path | -      | `/var/log/containers/*_alltricks_mysql-replication-watcher-*.log` |
| Dataset       | -      | `at-prod-log-mysql-replication-watcher`                           |

Processors :
```yaml
- add_kubernetes_metadata:
    in_cluster: true
    indexers:
      - pod_uid: ~
    matchers:
      - logs_path:
          logs_path: /var/log/containers/
          resource_type: container
    add_resource_metadata:
      deployment: true
      cronjob: true
- drop_fields:
    ignore_missing: true
    fields: ["host.ip", "host.mac"]
- if:
    regexp:
      message: "^{.*}$$"
  then:
    - decode_json_fields:
        fields: ["message"]
        target: entry
        overwrite_keys: true
    - drop_fields:
        fields: ["message"]
    - add_fields:
        target: ''
        fields:
          message: "Check entry for details"
```

Custom configurations:
```yaml
type: container
scan_frequency: 2s
max_backoff: 2s
backoff_factor: 1
```

## Configuration de "Kubernetes integration"

Pour les daemonset, activer *Collect Kubernetes metrics from Kubelet API* et toutes les fonctionnalités
- Bearer token file : `/var/run/secrets/kubernetes.io/serviceaccount/token`
- Host : `https://${env.NODE_IP}:10250`
- SSL Verification mode : `none`

Pour le déploiement principal, activer *Collect Kubernetes metrics from kube-state-metrics* et toutes les fonctionnalités
- Bearer token file : mettre à vide
- Host : `kube-state-metrics.kube-system.svc.cluster.local:8080`

## Configuration intégration système sur les daemonset

Le but est de faire remonter la data pour la partie "Infrastructure" native de Kibana.
Cela fait un peu doublon avec certaines données de l'intégration Kubernetes, mais apporte tout de même certaines data symp (par exemple les top process).
- Cocher uniquement `Collect metrics from System instances`
- Mettre des périodes de 30s
- Dans le paramètres `The following settings are applicable to all inputs below`, mettre `/hostfs`

## Configuration de "RabbitMQ"

Activer l'intégration RabbitMQ avec seulement la partie `Collect metrics from RabbitMQ instances`.

## Configuration de "Jenkins"

Activer une intégration `Logs UDP` sur le port 8085 et paramétrer les processors comme cela :

```yaml
- decode_json_fields:
      fields: ["message"]
      process_array: false
      max_depth: 1
      target: "entry"
      overwrite_keys: false
      add_error_key: true
```

## Configuration de rotation des logs

Depuis l'interface de gestion des polices de cycle de vie des indexes : [Menu : Management > Data > Index Lifecycle Policies](https://logs.alltricks.sexy:5601/app/management/data/index_lifecycle_management/policies), ajouter une police nommée *avanis-index-lifecycle-policy* avec les configurations suivantes :

"Hot phase" : rotation de l'index tous les 30 jours ou 50 Go.
"Warm phase" : vieux de 5 minutes
"Delete phase" : vieux de 30 jours

## Création d'un user superuser

Les indices liés à fleet ne sont pas modifiables par défaut. Nous allons donc créer un utilisateur `superuser` qui aura tous les droits.
Commencer par éditer le `.env` pour mettre dans `ELASTIC_PASSWORD_SUPERUSER` le mot de passe de l'utilisateur `superuser` (voir bitwarden).
Puis jouer les 2 curl ci dessous.

```bash
source .env.dist && source .env
curl -sk -XPOST --user elastic:$ELASTIC_PASSWORD -H 'content-type:application/json' \
    https://logs.alltricks.sexy:9200/_security/role/fleet_superuser -d '
        {
            "indices": [
                {
                    "names": [".fleet*"],
                    "privileges": ["all"],
                    "allow_restricted_indices": true
                }
            ]
        }'
curl -sk -XPOST --user elastic:$ELASTIC_PASSWORD -H 'content-type:application/json' \
    https://logs.alltricks.sexy:9200/_security/user/superuser -d '
        {
            "password": "'$ELASTIC_PASSWORD_SUPERUSER'",
            "roles": ["superuser", "fleet_superuser"]
        }'
```

## Ajout d'une cron

Le script `scripts/edit-indices-settings.sh` doit être cronné toutes les 15 minutes.
Celui ci va éditer les indexes existants pour forcer aucun réplicat, le nombre de champs, la lifecycle policy...

# Configuration d'APM

Utilisation du port custom 8222 pour l'APM (le port par défaut 8220 est utilisé par un autre service).
Uniquement les containers PHP ont un client elastic APM. Les serveurs APM chargé de collecter les données sont installés dans les agents Elastic via Fleet lors de l'ajout de l'intégration APM.

Server configuration :
- Host : 0.0.0.0:8222
- Url : http://local.node:8222

Disable RUM.

## Grafana

### Mise en route de Grafana

Dans le répertoire *grafana*, créer un fichier *.env* à partir du fichier *.env.dist*; puis éditer le fichier pour définir la variable *SECRET_KEY* (un secret d'au moins 32 caractères).
Lancer la stack grafana depuis le répertoire *grafana* : `make up` (la stack est issue de https://github.com/grafana/oncall).
Accéder à l'interface : 
- Url : http://logs.alltricks.sexy:3000/
- Les identifiants par défaut sont *admin/admin* (il sera demander de redéfinir le mot de passe du compte admin; mot de passe à mettre dans BitWarden).

### Installation/configuration de OnCall

Depuis l'Url http://logs.alltricks.sexy:3000/plugins/grafana-oncall-app, définir l'url vers *on call* dans le champ *OnCall backend URL* : `http://engine:8080`

### Ajout du datasource Elasticsearch

Depuis l'interface [*Grafana* > *Configuration* > *Datasource*](http://logs.alltricks.sexy:3000/datasources), sélectionner Elasticsearch, puis configurer les champs suivants :
- HTTP:
  - URL : `https://logs.alltricks.sexy:9200/`
- Auth
  - Basic auth : `On`
  - Basic Auth Details :
    - User : `elastic`
    - Password : *(mot de passe du compte présent dans BitWarden)*

# Backup

## Script

Les backup se trouvent dans `/data/backup`.

Le script `scripts/backup.sh` doit être cronné chaque jour afin de backuper :
- .env
- configurations fleet

## Elasticsearch

Un repo de snapshot est paramétré afin de sauvegarder la config de toutes les features.
Repository : `local` vers `/usr/share/elasticsearch/snapshots` (volume monté depuis `/data/elasticsearch/snapshots`)
Nom de la police : daily-config
Filtres : indexes `foo-*`, ignorer les erreurs, backup du statut du cluster et des features
Cron : daily
Nommage : <daily-config-{now/d}>
