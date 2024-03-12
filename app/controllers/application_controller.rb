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
    #$redis = Redis.new(url: ENV['REDIS_URL'])
    $redis = Redis.new(url: 'redis://host.docker.internal:6379/1')
  else
    $redis = Redis.new(url: 'redis://localhost:6379/1')
  end

  CACHE_VERSION = 1


  class Object
    def blank?
      respond_to?(:empty?) ? empty? : !self
    end
  end

  get '/' do
    erb :index
  end

  get '/text' do
    erb :text
  end

  get '/image' do
    @site_url = "#{request.env['rack.url_scheme']}://#{request.env['HTTP_HOST']}"
    erb :demo
  end

  post '/process' do
    api_key = ENV['OPEN_AI_API_KEY']
    puts "openai_api_key: #{api_key}"

    # API endpoint
    url = params[:url]
    puts "url: #{url}"

    # Data payload
    # data = JSON.parse(ARGV[1]) # Nimmt an, dass die Daten als zweites Argument im JSON-Format übergeben werden
    data =
    data = JSON.parse(params[:data]) # Nimmt an, dass die Daten als zweites Argument im JSON-Format übergeben werden
    puts "data: #{data}"
puts "Sending request to OpenAI API..."
    response = HTTP.headers('Content-Type' => 'application/json', 'Authorization' => "Bearer #{api_key}")
                   .post('https://api.openai.com/v1/chat/completions', json: data)
puts "Response: #{response}"
    content_type 'application/json'
    response.body.to_s
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
