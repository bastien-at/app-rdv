GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NOCOLOR='\033[0m'

set -e

# Check system
if docker version --format '{{.Server}}' | grep 'Experimental:false' > /dev/null; then
    echo -e "${RED}Your docker daemon is not in experimental mode. You need it to build prod images with squash option.${NOCOLOR}"
    echo -e "${RED}Please create or edit '/etc/docker/daemon.json' and add '{\"experimental\": true}'${NOCOLOR}"
    echo -e "${RED}Next, restart your daemon with 'sudo systemctl restart docker' and retry${NOCOLOR}"
    exit 1
fi

# Check variables
# IMAGE = image name (mandatory)
# BUILD_PATH = root path to build (default $IMAGE)
# DOCKERFILE = Dockerfile to use (default Dockerfile)
# PUSH = if set, push image after build
test "$IMAGE" != ""  || (echo -e "${RED}IMAGE variable is missing...${NOCOLOR}" && exit 1)
DOCKERFILE=${DOCKERFILE:-Dockerfile}
BUILD_PATH=${BUILD_PATH:-$IMAGE}

cd $SCRIPT_PATH/../$BUILD_PATH