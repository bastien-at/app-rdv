SCRIPT=$(realpath -s "$0")
SCRIPT_PATH=$(dirname "$SCRIPT")
. $SCRIPT_PATH/config.sh

echo -e "${PURPLE}== Push image $IMAGE ==${NOCOLOR}"

if [[ "$NEW_TAG" = "" ]]; then
    echo -e "${BLUE}New tag (x.y.z or as_target to use stage name directly or as_source_and_target to use base image tag combined with stage's name):${NOCOLOR}"
    read -p "" NEW_TAG
fi
[[ "$NEW_TAG" =~ ^([0-9]+\.[0-9]+\.[0-9]+)|as_target|as_source_and_target$ ]] || (echo -e "${RED}Tag is not on x.y.z format nor as_target nor as_source_and_target${NOCOLOR}" && exit 1)

STAGES=$(grep -Po "^(FROM .+ AS [a-z0-9-]+)$" $DOCKERFILE | grep -v 'not-final-'| tee)
echo "$STAGES" | while read STAGE ; do
    SOURCE=$(echo "$STAGE" | grep -Po "^FROM .+:(\K[^ ]+)" | tee)
    TARGET=$(echo "$STAGE" | grep -Po "^FROM .+ AS (\K[a-z0-9-]+)$" | tee)

    NEW_TAG_TO_PUSH="$NEW_TAG"
    test "" = "$TARGET" || NEW_TAG_TO_PUSH="$NEW_TAG-$TARGET"

    if [[ "$NEW_TAG" = "as_target" ]]; then
        NEW_TAG_TO_PUSH="$TARGET"
    fi

    if [[ "$NEW_TAG" = "as_source_and_target" ]]; then
        if [[ "" != "$SOURCE" ]] && [[ -z "$ORGINAL_SOURCE" ]]; then
          ORIGINAL_SOURCE="$SOURCE"
        fi

        if [[ "" = "$SOURCE" ]]; then
          SOURCE="$ORIGINAL_SOURCE"
        fi

        NEW_TAG_TO_PUSH="$SOURCE-$TARGET"
    fi

    echo -e "${GREEN}Push tag $IMAGE:$NEW_TAG_TO_PUSH...${NOCOLOR}"

    set -x
    docker push europe-west1-docker.pkg.dev/avanis-infra-gke-dev/docker/$IMAGE:$NEW_TAG_TO_PUSH
    { set +x; } 2>/dev/null
done
echo ""