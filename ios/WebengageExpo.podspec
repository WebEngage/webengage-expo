require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'WebengageExpo'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.platforms      = {
    :ios => '13'
  }
  s.swift_version  = '5.4'
  s.source         = { git: 'https://github.com/WebEngage/webengage-expo.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.dependency 'React-Core'
  if ENV['WEBENGAGE_USE_SPM'] == 'true' && respond_to?(:spm_dependency, true)
    spm_dependency(s,
      url: 'https://github.com/WebEngage/webengage-ios-sdk.git',
      requirement: { kind: 'upToNextMajorVersion', minimumVersion: '2.0.0' },
      products: ['WebEngageCore']
    )
  else
    if ENV['WEBENGAGE_USE_CORE'] == 'true'
     s.dependency 'WebEngage/Core','>= 6.22.0'
    else
     s.dependency 'WebEngage','>= 6.22.0'
    end
  end
  s.dependency 'react-native-webengage'
  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"

end
