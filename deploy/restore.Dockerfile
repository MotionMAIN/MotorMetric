FROM postgres:17-alpine

COPY deploy/motormetric.dump /seed/motormetric.dump
COPY deploy/restore.sh /usr/local/bin/motormetric-restore

RUN chmod 0555 /usr/local/bin/motormetric-restore

ENTRYPOINT ["/usr/local/bin/motormetric-restore"]
CMD []
