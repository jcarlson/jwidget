#!/usr/bin/env ruby

require 'net/http'
require 'uri'

CLOSURE_API = "http://closure-compiler.appspot.com"
TARGET = "target"

BUNDLES = {
  "core_player.nocache.js" => ["src/js/core_player.nocache.js"],
  "jquery.min.js" => ["src/lib/jquery.js"],
  "jquery.wsdata.min.js" => ["src/lib/oauth.js", "src/lib/sha1.js", "src/js/jquery.wsdata.js"],
  "jquery.jwidget.min.js" => ["src/lib/jquery.ui.core.js","src/lib/jquery.ui.widget.js", "src/lib/jquery.ui.position.js", "src/lib/swfobject.js", "src/lib/json2.js", "src/js/jquery.jwidget.js"]
}

FILES = ["src/iframe.html"]

Dir::mkdir(TARGET) unless FileTest::directory? TARGET

BUNDLES.each do |bundle, scripts|
  puts "\nPreparing #{bundle} bundle...\n"
  
  content = ""
  
  scripts.each { |script| content << File.open(script, "rb").read }
  
  stats = Net::HTTP.post_form(URI.parse(CLOSURE_API + "/compile"), {
      "js_code" => content,
      "compilation_level" => "SIMPLE_OPTIMIZATIONS",
      "output_info" => "statistics",
      "output_format" => "text",
      "output_file_name" => bundle
  });
  puts stats.body
  path = stats.body.grep(/^\/code\/[A-Za-z0-9]*\/.*.js$/)[0]
  code = Net::HTTP.get(URI.parse(CLOSURE_API + path))
  File.open(TARGET + "/" + bundle, "w") { |file| file.write(code) }
  
end

FILES.each do |f|
  puts "\nUpdating #{f} with bundle names\n"
  contents = File.read(f)
  contents = contents.gsub(/<!-- begin (.*) -->.*<!-- end \1 -->/m) { "<script src=\"#{$1}\"></script>" }
  File.open(TARGET + "/" + File.basename(f), "w") { |output| output.write(contents) }
end

puts "\nDONE!\n\n"

