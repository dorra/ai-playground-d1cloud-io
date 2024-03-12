require 'open-uri'
require 'json'
# require 'bundler'
# require 'redis'
# require 'sidekiq'
# require 'dotenv'

# url = "https://example.com/image.jpg"
#
# Beispiel für asynchronen Aufruf
# VisionJob.perform_async(url)
#
# Beispiel für synchronen Aufruf
# VisionJob.new.perform(url)

class VisionJob
  include Sidekiq::Worker

  # if ENV['RACK_ENV'] == 'production'
  #   puts "REDIS_URL: #{ENV['REDIS_URL']}"
  #   $redis_sinatra_sinatra = Redis.new(url: ENV['REDIS_URL'])
  # else
  #   puts "REDIS_URL: redis://host.docker.internal:6379/1"
  #   $redis_sinatra = Redis.new(url: 'redis://host.docker.internal:6379/1')
  # end

  def perform(url, cache_key)
    uri = URI.parse(url)
    # Hier kannst du den Code schreiben, der die URL verarbeitet
    # Zum Beispiel:
    require 'tempfile'
    image_file = Tempfile.new(['image', '.jpg'])
    image_file.binmode
    # image_file.write(open(url).read)
    image_file.write(uri.open(&:read))
    image_file.rewind

    begin
      process_image(url, image_file, cache_key)
    ensure
      (image_file.close rescue nil)
      (image_file.unlink rescue nil)
    end
  end

  def process_image(url, image_file, cache_key)
    original_sha256  = Digest::SHA256.file(image_file).hexdigest
    destination_path = "./public/uploads/#{original_sha256}.jpg"

    image = Vips::Image.new_from_file(image_file.path, access: :sequential)
    image = image.autorot

    # Entfernen des Alphakanals durch Hinzufügen eines weißen Hintergrundes
    if image.has_alpha?
      image = image.flatten(background: [255, 255, 255])
    end

    longest_edge = [image.width, image.height].max
    scale = 2048.0 / longest_edge
    resized_image = image

    if longest_edge > 2048
      resized_image = image.resize(scale)
    end

    resized_image.write_to_file(destination_path, Q: 100)

    prompt_combined = File.read('./prompt_combined.txt')

    puts result             = request_openai_chat_completion(prompt_combined, destination_path)
    puts content            = sanitize_result(result["choices"].first["message"]["content"]) rescue '-'
    puts content_blocks     = extract_content_blocks_and_convert_to_json(content)

    processing_result       = JSON.parse(content_blocks)
    product_classification  = JSON.parse(parse_html_to_json(processing_result['product_classification_html']))

    puts product_classification_json = JSON.pretty_generate(product_classification)

    output = {}
    output[:url] = url
    output[:hash] = original_sha256
    output[:image_description_html]      = processing_result['image_description_html']
    output[:product_description_html]    = processing_result['product_description_html']
    output[:product_classification_html] = processing_result['product_classification_html']
    output[:product_classification_json] = product_classification

    json_content = JSON.pretty_generate(output)

    File.open("./tmp/#{original_sha256}.txt", 'wb') do |f|
      f.write(json_content)
    end

    $redis.set(cache_key, json_content)

    json_content
  end


  def parse_html_to_json(html)
    # Define a mapping from the old keys to the new keys
    key_mapping = {
      'Produktname' => 'name',
      'Kategorie' => 'category',
      'Marke/Brand/Hersteller' => 'brand',
      'Tags/Schlagwörter' => 'tags',
      'Farbe' => 'color',
      'Geschlecht' => 'gender',
      'Material' => 'material',
      'Altersgruppe' => 'age_group',
      'EAN/GTIN' => 'gtin'
    }

    # Initialize a hash with all the new keys set to nil
    product_info = {
      'name' => nil,
      'category' => nil,
      'brand' => nil,
      'tags' => nil,
      'color' => nil,
      'gender' => nil,
      'material' => nil,
      'age_group' => nil,
      'gtin' => nil,
      'short_category' => nil
    }

    # Initialize the status message
    status = { 'status' => 'success', 'message' => nil }

    begin
      # Parse the HTML
      doc = Nokogiri::HTML(html)

      # Iterate over each `dt` and the following `dd` to extract the information
      doc.xpath('//dt').each do |node|
        old_key = node.text.strip.gsub(':', '')
        new_key = key_mapping[old_key]
        if new_key
          value_node = node.xpath('following-sibling::dd[1]')
          value = value_node.text.strip if value_node
          value = '' if value == 'NIL'
          product_info[new_key] = value.empty? ? nil : value

          # If the key is 'category', also extract 'short_category'
          if new_key == 'category' && !value.empty?
            # Split the category on '>' and remove white spaces
            categories = value.split('>').map(&:strip)
            product_info['short_category'] = categories.last
          end
        end
      end
    rescue => e
      status['status'] = 'error'
      status['message'] = "An error occurred: #{e.message}"
    end

    # Merge the product info and status message into one hash
    combined_info = product_info.merge(status)

    # Convert the combined hash to a JSON object
    combined_info.to_json
  end


  ## OPENAI API
  #
  def request_openai_chat_completion(prompt_text, file_path)
    # Lesen Sie Ihre API-Schlüssel aus einer Umgebungsvariablen oder einer Konfigurationsdatei
    api_key = ENV['OPEN_AI_API_KEY']
    image_content = File.open(file_path, 'rb') { |file| file.read }
    base64_image  = Base64.strict_encode64(image_content)
    mime_type     = 'image/jpg'
    base64_url    = "data:#{mime_type};base64,#{base64_image}"
    # Erstelle die JSON-Datenstruktur
    json_data = {
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt_text
            },
            {
              type: "image_url",
              image_url: {
                url: base64_url
              }
            }
          ]
        }
      ],
      max_tokens: 2048
    }

    response = HTTP.headers('Content-Type' => 'application/json',
                            'Authorization' => "Bearer #{api_key}")
                    .post('https://api.openai.com/v1/chat/completions', json: json_data)

    # Parse und gebe das Ergebnis zurück
    JSON.parse(response.body.to_s)
  end

  def sanitize_result(result_text)
    result_text = result_text.gsub('```html', '')
    result_text = result_text.gsub('```markdown', '')
    result_text = result_text.gsub('```', '')
    result_text
  end

  def extract_content_blocks_and_convert_to_json(content)
    # Zuerst splitten wir den Content anhand der '---' Trennzeichen
    split_content = content.split('---').reject(&:empty?)

    # Nun extrahieren wir die Inhalte zwischen <body>...</body> oder den gesamten Inhalt, falls diese Tags nicht vorhanden sind
    extracted_contents = split_content.map do |section|
      body_match = section.match(/<body>(.*?)<\/body>/m)
      if body_match
        body_match[1].strip # Extrahiert und entfernt führende/anhängende Leerzeichen
      else
        section.strip # Verwende den gesamten Abschnitt und entferne führende/anhängende Leerzeichen
      end
    end

    # Stellen Sie sicher, dass wir nicht mehr als drei Inhalte haben
    extracted_contents = extracted_contents.take(3)

    # Erzeugen eines Hashes mit den extrahierten Inhalten
    content_hash = {
      image_description_html: extracted_contents[0],
      product_classification_html: extracted_contents[1],
      product_description_html: extracted_contents[2]
    }

    # Konvertieren des Hashes in JSON
    JSON.pretty_generate(content_hash)
  end

end
