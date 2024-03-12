class ApplicationController < Sinatra::Base
  LOG_LEVEL = (ENV['DEBUG'].to_s == 'true') ? Logger::DEBUG : Logger::INFO

  set :logging, LOG_LEVEL unless test?
  set :show_exceptions, false
  set :public_folder, 'public'
  set :views, 'app/views'
  set :app_file, __FILE__

  set :session_secret, 'f1eb1761af76d00f3b9ddb1e82befeb48508f1c0d9279c89987a0a43bf8d524b'
  enable :sessions

  configure :development do
    set :logging, Logger::DEBUG

    register Sinatra::Reloader

    Dir.glob('./app/**/*.rb').each { |file| also_reload file }
    # dont_reload '/path/to/other/file'

    after_reload do
      puts 'App reloaded ...'
    end
  end

  if ENV['RACK_ENV'] == 'production'
    $redis = Redis.new(url: ENV['REDIS_URL'])
  else
    $redis = Redis.new(url: 'redis://host.docker.internal:6379/1')
  end

  CACHE_VERSION = 1


  class Object
    def blank?
      respond_to?(:empty?) ? empty? : !self
    end
  end

  get '/' do
    ''
  end

  get '/api/process-image' do
    unless params[:url]
      status 400
      return { error: "Missing url parameter" }.to_json
    end

    url = params[:url]

    begin
      response = HTTP.get(url)

      if response.status.success?
        tmpfile = Tempfile.new('download')

        File.open(tmpfile.path, 'wb') do |file|
          file.write(response.to_s)
        end

        original_sha256 = Digest::SHA256.file(tmpfile.path).hexdigest
        cache_key       = "cache:#{CACHE_VERSION}-#{original_sha256}"

        content   = $redis.get(cache_key)
        cache_hit = true
        cache_hit = false if content.blank?

        if cache_hit
          puts "CACHE EXISTS: #{cache_key}"
          puts "CONTENT: #{content}"
        else
          destination_original_image_path = "./public/uploads/original_#{original_sha256}.jpg"
          FileUtils.cp(tmpfile.path, destination_original_image_path)

          protocol   = request.env['rack.url_scheme']
          host       = request.env['HTTP_HOST']

          image_url  = "#{protocol}://#{host}/#{destination_original_image_path.gsub('./public/', '')}"
          puts "image_url: #{image_url}"
          # content    = VisionJob.perform_async(image_url, cache_key)
          content    = VisionJob.new.perform(image_url, cache_key)
        end

        # poll for results
        loop do
          content = $redis.get(cache_key)
          break unless content.blank?

          sleep 0.1
        end

        status 200
        content
      else
        status response.code
        { error: "Failed to download the file" }.to_json
      end
    rescue HTTP::ConnectionError => e
      status 500
      { error: "Connection Error: #{e.message}" }.to_json
    ensure
      tmpfile.unlink if tmpfile
    end
  end


  get '/demo' do
    @site_url = "#{request.env['rack.url_scheme']}://#{request.env['HTTP_HOST']}"
    erb :demo
  end

  post '/upload' do
    @site_url = "#{request.env['rack.url_scheme']}://#{request.env['HTTP_HOST']}"
    if params[:file] &&
      (tmpfile = params[:file][:tempfile]) &&
      (name = params[:file][:filename])

      original_sha256 = Digest::SHA256.file(tmpfile).hexdigest
      cache_key       = "cache:#{CACHE_VERSION}-#{original_sha256}"

      puts "sha256: #{original_sha256}"

      content = $redis.get(cache_key)

      cache_hit = true
      cache_hit = false if content.blank?

      if cache_hit
        content = $redis.get(cache_key)
        puts "CACHE EXISTS: #{cache_key}"
        puts "CONTENT: #{content}"
      else
        destination_original_image_path = "./public/uploads/original_#{original_sha256}.jpg"
        FileUtils.cp(tmpfile.path, destination_original_image_path)

        protocol   = request.env['rack.url_scheme']
        host       = request.env['HTTP_HOST']

        image_url  = "#{protocol}://#{host}/#{destination_original_image_path.gsub('./public/', '')}"
        puts "image_url: #{image_url}"
        # content    = VisionJob.perform_async(image_url, cache_key)
        content    = VisionJob.new.perform(image_url, cache_key)
      end
        # protocol   = request.env['rack.url_scheme']
        # host       = request.env['HTTP_HOST']
        # image_url  = "#{protocol}://#{host}/uploads/#{escaped_name}"

        # resized_image_base_url  = "https://img-app-1.versacommerce.io/resize=486x486/canvas=512x512/++/"
        # modified_image_base_url = "https://img-app-1.versacommerce.io/resize=486x486/canvas=512x512/remove-background=true/background-image=coldgrey.png/convert_to=png/++/"

        # uri = URI.parse(image_url)
        # @resized_image_url  = "#{resized_image_base_url}#{uri.host}#{uri.path}"
        # @modified_image_url = "#{modified_image_base_url}#{uri.host}#{uri.path}"


      # poll for results
      loop do
        content = $redis.get(cache_key)
        break unless content.blank?

        sleep 0.1
      end

      results       = JSON.parse(content)

      @resized_image_url = results["url"]

      @content_product_description    = results["product_description_html"]
      @content_product_classification = results["product_classification_html"]
      @content_image_description      = results["image_description_html"]

      erb :upload
  else
      redirect '/'
    end
  end


  ## HELPER METHODS
  #
  get '/up' do
    '<html><body style="background-color: green"></body></html>'
  end

  get '/robots.txt' do
    content_type 'text/plain'

    [200, "User-agent: *\n\rDisallow: *"]
  end

  get '/favicon.*' do
    status 404
  end


end