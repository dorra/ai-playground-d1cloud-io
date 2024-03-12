require_relative 'config/environment'

use Rack::Cors do
  allow do
    origins /\Ahttps?:\/\/(?:.*\.)?versacommerce\.(test(?::\d+)?|de|eu)\z/
    resource '/api/*', headers: :any, methods: :any
  end
end

use Rack::Logger

map('/') { run ApplicationController }