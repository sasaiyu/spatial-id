FROM mcr.microsoft.com/devcontainers/base:debian

RUN apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get upgrade -y \
    # && apt-get -y install --no-install-recommends <install packages> \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ARG USER_NAME
ARG GROUP_NAME
RUN mkdir node_modules && \
    chown ${USER_NAME}:${GROUP_NAME} node_modules

USER ${USER_NAME}
