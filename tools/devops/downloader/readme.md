# Downloader

## MySQL Downloader

MySQL Downloader is a docker image that download MySQL data set of the production MySQL database.
This "tiny" database size more than 12 Gio, and it is a little boring to wait hours to download it.
So, this image is install on a local machine and download MySQL database every morning (at 12:05 from monday to friday).

The host machine requires the installation of *docker* and *docker compose*.

Install source in `/usr/local/bin/downloader` folder.

From the Google Console interface https://console.cloud.google.com/iam-admin/serviceaccounts/details/115250287780371185033/keys?project=avanis-infra-gke-dev, in "Keys" tab, create a new key (from account `84970010301-compute@developer.gserviceaccount.com`), download the key file and put it in /usr/local/bin/downloader/docker/mysql/avanis-infra-gke-dev.json (rename file as `avanis-infra-gke-dev.json`).

To build and run this image with docker compose :

```bash
cd /usr/local/bin/downloader/docker
docker compose up -d --force-recreate
```

If the machine is restart, the container will start automatically on linux boot.
