# s3-d1cloud-io

## Development

* Generate Gemfile.lock if it does not exist yet: `docker run --rm -v "$PWD":/app -w /app ruby:3.2.2 bundle install`
* Add your production arch (e.g. aarch64-linux) to your bundle: `docker run --rm -v "$PWD":/app -w /app ruby:3.2.2-slim bundle lock --add-platform aarch64-linux`
* Build the image: `docker build -t versacommerce/versa-vision-versacloud-io --target development .`
* Run the container and mount working dir into it: `docker run --rm -p 3000:3000 -v "$(pwd)":/app versacommerce/versa-vision-versacloud-io`



## Production (kamal)

### ATTENTION

* kamal requires `curl` in the Docker image for kamal
* `build-essential`, `git`, `pkg-config` are required in the Docker image to be able to build gems with native extensions
* Depending on the gems, more packages might be required (e.g. `default-libmysqlclient-dev`)

### Before initial deploy

* Set up kamal: `kamal setup`

### Deployment

* Push env changes: `kamal env push`
* Deploy: `kamal deploy`