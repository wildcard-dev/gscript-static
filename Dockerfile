FROM caddy:2.8-alpine

# Copy site files, excluding system files
COPY ./site/*.html /srv/
COPY ./site/*.css /srv/
COPY ./site/js/ /srv/js/
COPY ./site/images/ /srv/images/
COPY ./site/blog-posts/ /srv/blog-posts/

# Copy Caddyfile
COPY ./Caddyfile /etc/caddy/Caddyfile

# Set proper permissions (files readable, directories kept traversable)
RUN find /srv -type f -exec chmod 644 {} + && \
    find /srv -type d -exec chmod 755 {} +
