FROM ruby:3.2.2-slim AS base

RUN apt-get update && apt-get -y install build-essential git pkg-config curl libvips

WORKDIR /app
COPY . /app

EXPOSE 3000

CMD ["bundle", "exec", "foreman", "start"]


FROM base AS development

RUN bundle install --jobs $(nproc)


FROM base AS production
# Set production environment
ENV BUNDLE_WITHOUT="development:test" \
    BUNDLE_DEPLOYMENT="1"

RUN bundle install --jobs $(nproc)