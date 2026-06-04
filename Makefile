
include .env
export KUBECONFIG

.PHONY: all build-images deploy

all: build-images deploy

build:
	cd ./src/poc_next && ./build-k8s_OVH.sh

deploy:
	cd ./src/poc_next/k8s && ./deploy.sh
	