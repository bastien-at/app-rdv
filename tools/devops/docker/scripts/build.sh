SCRIPT=$(realpath -s "$0")
SCRIPT_PATH=$(dirname "$SCRIPT")
. $SCRIPT_PATH/config.sh

echo -e "${PURPLE}== Build image $IMAGE ==${NOCOLOR}"

if [[ ! "$NEW_TAG" =~ ^([0-9]+\.[0-9]+\.[0-9]+)$ ]] && [[ "$NEW_TAG" != "as_target" ]] && [[ "$NEW_TAG" != "as_source_and_target" ]]; then
  echo -e "${GREEN}Last image tags.${NOCOLOR}"
  gcloud container images list-tags europe-west1-docker.pkg.dev/avanis-infra-gke-dev/docker/$IMAGE --format='get(tags)' --limit 10 | grep -E ".+" | sort -rV

  echo -e "${BLUE}Last tag to pull to use as cache (x.y.z or empty):${NOCOLOR}"
  read -p "" LAST_TAG
  [[ "$LAST_TAG" =~ ^(|[0-9]+\.[0-9]+\.[0-9]+)$ ]] || (echo -e "${RED}Tag is not on x.y.z format${NOCOLOR}" && exit 1)

  if [[ "$NEW_TAG" = "" ]]; then
    echo -e "${BLUE}New tag (x.y.z or as_target to use stage name directly or as_source_and_target to use base image tag combined with stage's name):${NOCOLOR}"
    read -p "" NEW_TAG
  fi
fi

[[ "$NEW_TAG" =~ ^([0-9]+\.[0-9]+\.[0-9]+)|as_target|as_source_and_target$ ]] || (echo -e "${RED}Tag is not on x.y.z format nor as_target nor as_source_and_target$${NOCOLOR}" && exit 1)

STAGES=$(grep -Po "^(FROM .+ AS [a-z0-9-]+)$" $DOCKERFILE | grep -v 'not-final-'| tee)
echo "$STAGES" | while read STAGE ; do
    SOURCE=$(echo "$STAGE" | grep -Po "^FROM .+:(\K[^ ]+)" | tee)
    TARGET=$(echo "$STAGE" | grep -Po "^FROM .+ AS (\K[a-z0-9-]+)$" | tee)

    NEW_TAG_TO_BUILD="$NEW_TAG"
    test "" = "$TARGET" || NEW_TAG_TO_BUILD="$NEW_TAG-$TARGET"

    if [[ "$NEW_TAG" = "as_target" ]]; then
        LAST_TAG_TO_PULL="$TARGET"
        NEW_TAG_TO_BUILD="$TARGET"
    fi

    if [[ "$NEW_TAG" = "as_source_and_target" ]]; then
        if [[ "" != "$SOURCE" ]] && [[ -z "$ORGINAL_SOURCE" ]]; then
          ORIGINAL_SOURCE="$SOURCE"
        fi

        if [[ "" = "$SOURCE" ]]; then
          SOURCE="$ORIGINAL_SOURCE"
        fi

        LAST_TAG_TO_PULL="$SOURCE-$TARGET"
        NEW_TAG_TO_BUILD="$SOURCE-$TARGET"
    fi

    if [[ "" != "$LAST_TAG" ]] && [[ ! "$TARGET" =~ prod$ ]]; then
        LAST_TAG_TO_PULL="$LAST_TAG"
        test "" = "$TARGET" || LAST_TAG_TO_PULL="$LAST_TAG-$TARGET"
        echo -e "${GREEN}Pull image with tag '$LAST_TAG_TO_PULL'...${NOCOLOR}"
        set -x
        docker pull europe-west1-docker.pkg.dev/avanis-infra-gke-dev/docker/$IMAGE:$LAST_TAG_TO_PULL | tee
        { set +x; } 2>/dev/null
    fi

    echo -e "${GREEN}Build tag $IMAGE:$NEW_TAG_TO_BUILD...${NOCOLOR}"

    set -x
    docker build --build-context docker-common=$SCRIPT_PATH/../common --progress=plain -f "$DOCKERFILE" --build-arg DOCKER_BASE_IMAGE_VERSION=europe-west1-docker.pkg.dev/avanis-infra-gke-dev/docker/$IMAGE:$NEW_TAG_TO_BUILD --target "$TARGET" -t europe-west1-docker.pkg.dev/avanis-infra-gke-dev/docker/$IMAGE:$NEW_TAG_TO_BUILD .
    { set +x; } 2>/dev/null

    if [[ "$TARGET" = "prod" ]]; then
        echo -e "${GREEN}Squash prod image $IMAGE:$NEW_TAG_TO_BUILD...${NOCOLOR}"
        set -x
        echo -e "FROM scratch\n$(docker image inspect europe-west1-docker.pkg.dev/avanis-infra-gke-dev/docker/$IMAGE:$NEW_TAG_TO_BUILD -f '{{join .Config.Env "\n"}}' | grep -Ev "^PATH" | sed -E "s#^#ENV #")\nCOPY --from=europe-west1-docker.pkg.dev/avanis-infra-gke-dev/docker/$IMAGE:$NEW_TAG_TO_BUILD / /" | docker build --progress=plain -t europe-west1-docker.pkg.dev/avanis-infra-gke-dev/docker/$IMAGE:$NEW_TAG_TO_BUILD -
        { set +x; } 2>/dev/null
    fi
done
echo ""

if [[ "$PUSH" != "" ]] || [[ "$PUSH_ONLY" != "" ]]; then
    NEW_TAG=$NEW_TAG bash $SCRIPT_PATH/push.sh
fi
