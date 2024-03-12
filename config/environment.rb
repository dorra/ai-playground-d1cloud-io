ENV['BUNDLE_GEMFILE'] ||= File.expand_path('../Gemfile', __dir__)

require 'rubygems'
require 'bundler'

# load all the default and environment specific gems
require 'sinatra'
Bundler.require(:default, Sinatra::Base.environment)

require 'dotenv/load' if Sinatra::Base.development? || Sinatra::Base.test?
require 'active_support'
require 'active_support/core_ext/object/blank'
require 'active_support/core_ext/integer/time'

files = Dir.glob('./app/**/*.rb').sort do |file|
  case file
  when %r{/application_.*?}
    -1
  else
    1
  end
end
files.each { |file| require file }