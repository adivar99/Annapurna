#!/usr/bin/env bash

# Wrapper for all the calls to build and deploy docker.
#
# HISTORY
# Initial - Ramanuj Pandey [rpandey@fortinet.com]

version=0.2
cur_dir=$(pwd)
container_dir=$cur_dir/container
project=GitAnalytics

# Local build are auto numbered.
rel_mjr=$(date +"%y")
rel_mnr=$((($(date +%-m) - 1) / 3 + 1)) # Get current quarter, not using %q as some systems has old util-linux pkg
rel_pch=0
rel_type="Interim"

bld_num=2
rel_ver="v${rel_mjr}.${rel_mnr}.${rel_pch}-devbuild${bld_num}"

# Load environment variables from .env if available
if [ -f "$cur_dir/.env" ]; then
    set -a
    source "$cur_dir/.env"
    set +a
fi

HASURA_ENDPOINT="${HASURA_ENDPOINT:-http://localhost:8080}"
HASURA_ADMIN_SECRET="${HASURA_GRAPHQL_ADMIN_SECRET:-myadminsecretkey}"
GRAPHQL_DIR="$cur_dir/graphql"

function hasura_export() {
    if command -v hasura &> /dev/null; then
        # Check if Hasura is reachable before attempting export
        if curl -s -f -o /dev/null "$HASURA_ENDPOINT/healthz"; then
            echo "📦 Exporting Hasura metadata to $GRAPHQL_DIR/metadata..."
            hasura metadata export --project "$GRAPHQL_DIR" --endpoint "$HASURA_ENDPOINT" --admin-secret "$HASURA_ADMIN_SECRET"
        else
            echo "⚠️ Hasura is not reachable at $HASURA_ENDPOINT, skipping metadata export."
        fi
    else
        echo "⚠️ Hasura CLI not found, skipping metadata export."
    fi
}

function hasura_reload() {
    if command -v hasura &> /dev/null; then
        echo "⏳ Waiting for Hasura to be ready at $HASURA_ENDPOINT..."
        local max_attempts=30
        local attempt=1
        while ! curl -s -f -o /dev/null "$HASURA_ENDPOINT/healthz"; do
            if [ $attempt -ge $max_attempts ]; then
                echo "❌ Hasura did not become ready in time, skipping metadata reload."
                return 1
            fi
            sleep 1
            attempt=$((attempt + 1))
        done
        echo "🔄 Reloading Hasura metadata from $GRAPHQL_DIR/metadata..."
        hasura metadata reload --project "$GRAPHQL_DIR" --endpoint "$HASURA_ENDPOINT" --admin-secret "$HASURA_ADMIN_SECRET"
    else
        echo "⚠️ Hasura CLI not found, skipping metadata reload."
    fi
}

function service_build() {
    bld_ver=$(whoami):${rel_ver}:${rel_type}:$(date +'%d%m%y-%H%M'):$(git rev-parse --abbrev-ref HEAD):$(git rev-parse --short HEAD)
    case "$2" in
    "baseimgs")
        echo "Building base images only."
        export VERSION=$bld_ver && cd $cur_dir/baseimgs/ && docker compose build
        ;;
    "backend")
        echo "Building backend image only"
        docker compose -f $cur_dir/docker-compose.yml build express
        ;;
    "frontend")
        echo "Building frontend image only, after this you need to do build to make it part of container."
        docker compose -f $cur_dir/docker-compose.yml build frontend
        ;;
    "dev")
        echo "Building dev image, Start dev service only."
        bld_ver=$(whoami):${rel_ver}:devel:$(date +'%d%m%y-%H%M'):$(git rev-parse --abbrev-ref HEAD):$(git rev-parse --short HEAD)
        docker compose build
        ;;
    "prod")
        echo "TODO: Building prod image, Start prod image only."
        service_build backend
        service_build frontend
        ;;
    *)
        echo "Supplied build option ($2) not present."
        ;;
    esac
}

function service_help() {
    echo "-----------------------------------------------------"
    echo "$0 build   - Builds baseimages, frontend and backend, generates final image."
    echo "      $0 build backend      - Builds backend image."
    echo "      $0 build frontend      - Builds frontend image."
    echo "      $0 build dev      - Builds dev images."
    echo "      $0 build prod     - Builds prod images. [TODO]"
    echo "      $0 build baseimgs - Builds baseimages only."
    echo "$0 release - Builds all images and generates release tar. [TODO]"
    echo "$0 run - Takes argument and runs as per subcommand below"
    echo "$0 start   - Starts prebuilt image."
    echo "      $0 start dev  - Starts dev image instance."
    echo "      $0 start prod - Starts production image instance. [TODO]"
    echo "$0 stop    - Stops running $project."
    echo "$0 status  - Current status of $project. [TODO]"
    echo "$0 logs [Service]    - Shows logs of given service or of all services by default."
    echo "$0 shell <Service> <sub-service>  - Gives access to shell of given service."
    echo "$0 setup   - Should run this for first time and when version of this file is changed). [TODO]"
    echo "-----------------------------------------------------"
}

if [ $# == 0 ]; then
    service_help
    exit
fi

case $1 in
"build")
    service_build $*
    if [ "$?" != "0" ]; then
        echo "Build error, check logs above"
        exit 2
    fi
    ;;
"start")
    case $2 in
    "dev")
        echo "Starting project in dev mode with reloads"
        docker compose up -d
        hasura_reload
        ;;
    "prod")
        echo "TODO: Start the project in prod mode without reload and scalable"
        ;;
    esac
    ;;
"logs")
    if [ $# == 1 ]; then
        docker compose logs -f
    else
        docker compose logs $2 -f
    fi
    ;;
"shell")
    if [ $# == 1 ]; then
        echo "Please provide a Service and a command to run"
        exit 1
    fi
    docker compose exec -it $1 $2
    ;;
"stop")
    hasura_export
    echo "Stopping running containers"
    docker compose down --remove-orphans
esac

