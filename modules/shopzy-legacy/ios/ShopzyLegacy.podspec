Pod::Spec.new do |s|
  s.name           = 'ShopzyLegacy'
  s.version        = '1.0.0'
  s.summary        = 'Reads the data the original (Swift) Shopzy app left on the device, for the one-time move to Firebase.'
  s.description    = 'Read-only access to the old SwiftData store and UserDefaults. Never writes to them.'
  s.license        = 'MIT'
  s.author         = 'MannieDev'
  s.homepage       = 'https://shopzyy.app'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.libraries = 'sqlite3'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
