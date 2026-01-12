#!/bin/bash

set -ex

ROOT_DIR="$(realpath "$(dirname -- "$0")/..")"
DOMAIN="logs.alltricks.sexy"
EMAIL="devops@alltricks.com"
CERT_PATH="${ROOT_DIR}/certs/live/${DOMAIN}/fullchain.pem"
CERTBOT_IMAGE="certbot/certbot"
NGINX_CONTAINER_NAME="certbot-http"
NETWORK_NAME="certbot"
VOLUMES=(
    -v "${ROOT_DIR}/certs:/etc/letsencrypt"
    -v "${ROOT_DIR}/certbot/www:/var/www/certbot"
)

show_help() {
    echo "Usage: $0 [MODE]"
    echo "Modes:"
    echo "  create     Generate certificates for the first time."
    echo "  renew      Renew existing certificates (default mode)."
    echo "  help       Display this help message."
    exit 0
}

build_nginx_image() {
    docker build -t "$NGINX_CONTAINER_NAME" "${ROOT_DIR}/certbot/" || {
        exit 1
    }
}

generate_certificates() {
    docker run \
        --rm \
        --network "$NETWORK_NAME" \
        --name certbot \
        "${VOLUMES[@]}" \
        "$CERTBOT_IMAGE" \
        certonly \
            --webroot \
            --webroot-path /var/www/certbot \
            -d "$DOMAIN" \
            --email "$EMAIL" \
            --agree-tos \
            --non-interactive || {
                exit 1
            }
}

start_nginx() {
    stop_nginx
    docker network create "$NETWORK_NAME" >/dev/null 2>&1 || true
    docker run -d \
        --name "$NGINX_CONTAINER_NAME" \
        --network "$NETWORK_NAME" \
        -p 80:80 \
        "${VOLUMES[@]}" \
        "$NGINX_CONTAINER_NAME"|| {
            exit 1
        }
}

renew_certificates() {
    docker run \
        --rm \
        --network "$NETWORK_NAME" \
        --name certbot \
        "${VOLUMES[@]}" \
        "$CERTBOT_IMAGE" \
        renew || {
            exit 1
        }
}

stop_nginx() {
    docker stop "$NGINX_CONTAINER_NAME" >/dev/null 2>&1 || true
    docker rm "$NGINX_CONTAINER_NAME" >/dev/null 2>&1 || true
}

MODE="renew"  # Default
if [ $# -gt 0 ]; then
    case "$1" in
        create)
            MODE="create"
            ;;
        renew)
            MODE="renew"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            show_help
            exit 1
            ;;
    esac
fi

main() {
    build_nginx_image
    start_nginx

    case "$MODE" in
        create)
            generate_certificates
            ;;
        renew)
            renew_certificates
            ;;
    esac

    chmod -R 755 "${ROOT_DIR}/certs/"

    stop_nginx
}

main
