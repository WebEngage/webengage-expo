const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const WE_SPM_REPO_URL = "https://github.com/WebEngage/webengage-ios-sdk.git";
const WE_SPM_DEFAULT_BRANCH = "main";
const WE_SPM_DEFAULT_VERSION = "1.2.0";

function withWebEngageSPM(config, props = {}) {
  // Step 1: Inject SPM into pbxproj after prebuild
  config = withDangerousMod(config, [
    "ios",
    (config) => {
      const { projectRoot } = config.modRequest;
      const iosPath = path.join(projectRoot, "ios");
      const projectName = getProjectName(iosPath);
      const pbxprojPath = path.join(iosPath, `${projectName}.xcodeproj`, "project.pbxproj");

      if (!fs.existsSync(pbxprojPath)) {
        throw new Error(`project.pbxproj not found. Run expo prebuild first.`);
      }

      const repoUrl = props.spmRepoUrl || WE_SPM_REPO_URL;
      const branch = props.spmBranch || WE_SPM_DEFAULT_BRANCH;
      const version = props.spmVersion || WE_SPM_DEFAULT_VERSION;
      const useBranch = props.spmBranch ? true : false;
      const productName = props.useCore ? "WebEngageCore" : "WebEngage";

      let pbxproj = fs.readFileSync(pbxprojPath, "utf8");

      if (pbxproj.includes(repoUrl)) {
        console.log("ℹ️  WebEngage SPM already present in project.");
        return config;
      }

      pbxproj = injectSPMPackage(pbxproj, { repoUrl, branch, version, useBranch, productName });
      fs.writeFileSync(pbxprojPath, pbxproj, "utf8");
      console.log("✅ Injected WebEngage SPM package into Xcode project.");

      // Step 2: Patch react-native-webengage podspec to skip WebEngage pod
      const rnWePodspec = path.join(
        projectRoot, "node_modules", "react-native-webengage", "react-native-webengage.podspec"
      );
      if (fs.existsSync(rnWePodspec)) {
        let podspecContent = fs.readFileSync(rnWePodspec, "utf8");
        if (!podspecContent.includes("WEBENGAGE_USE_SPM")) {
          podspecContent = podspecContent.replace(
            /if ENV\['WEBENGAGE_USE_CORE'\] == 'true'\s*\n\s*s\.dependency 'WebEngage\/Core'.*\n\s*else\s*\n\s*s\.dependency 'WebEngage'.*\n\s*end/,
            `unless ENV['WEBENGAGE_USE_SPM'] == 'true'
    if ENV['WEBENGAGE_USE_CORE'] == 'true'
      s.dependency 'WebEngage/Core','>= 6.16.6'
    else
      s.dependency 'WebEngage','>= 6.16.6'
    end
  end`
          );
          fs.writeFileSync(rnWePodspec, podspecContent, "utf8");
          console.log("✅ Patched react-native-webengage podspec to skip WebEngage pod.");
        }
      }

      // Step 3: Set ENV in Podfile
      const podfilePath = path.join(iosPath, "Podfile");
      if (fs.existsSync(podfilePath)) {
        let podfile = fs.readFileSync(podfilePath, "utf8");
        if (!podfile.includes("WEBENGAGE_USE_SPM")) {
          podfile = `ENV['WEBENGAGE_USE_SPM'] = 'true'\n\n` + podfile;
          fs.writeFileSync(podfilePath, podfile, "utf8");
          console.log("✅ Set WEBENGAGE_USE_SPM=true in Podfile.");
        }
      }

      return config;
    },
  ]);

  return config;
}

function injectSPMPackage(pbxproj, { repoUrl, branch, version, useBranch, productName }) {
  const crypto = require("crypto");
  const pkgRefUUID = crypto.createHash("md5").update("WE_PKG_REF").digest("hex").substring(0, 24).toUpperCase();
  const productDepUUID = crypto.createHash("md5").update("WE_PROD_DEP").digest("hex").substring(0, 24).toUpperCase();

  // Add XCRemoteSwiftPackageReference
  let requirementBlock;
  if (useBranch) {
    requirementBlock = `\t\t\t\tbranch = ${branch};\n\t\t\t\tkind = branch;`;
  } else {
    requirementBlock = `\t\t\t\tkind = upToNextMajorVersion;\n\t\t\t\tminimumVersion = ${version};`;
  }
  const pkgRefEntry = `\t\t${pkgRefUUID} /* XCRemoteSwiftPackageReference "${productName}" */ = {
\t\t\tisa = XCRemoteSwiftPackageReference;
\t\t\trepositoryURL = "${repoUrl}";
\t\t\trequirement = {
${requirementBlock}
\t\t\t};
\t\t};`;

  // Add XCSwiftPackageProductDependency
  const productDepEntry = `\t\t${productDepUUID} /* ${productName} */ = {
\t\t\tisa = XCSwiftPackageProductDependency;
\t\t\tpackage = ${pkgRefUUID} /* XCRemoteSwiftPackageReference "${productName}" */;
\t\t\tproductName = ${productName};
\t\t};`;

  // Insert package reference section
  if (pbxproj.includes("/* Begin XCRemoteSwiftPackageReference section */")) {
    pbxproj = pbxproj.replace(
      "/* End XCRemoteSwiftPackageReference section */",
      `${pkgRefEntry}\n/* End XCRemoteSwiftPackageReference section */`
    );
  } else {
    pbxproj = pbxproj.replace(
      /(\n\/\* End XCBuildConfiguration section \*\/)/,
      `$1\n\n/* Begin XCRemoteSwiftPackageReference section */\n${pkgRefEntry}\n/* End XCRemoteSwiftPackageReference section */`
    );
  }

  // Insert product dependency section
  if (pbxproj.includes("/* Begin XCSwiftPackageProductDependency section */")) {
    pbxproj = pbxproj.replace(
      "/* End XCSwiftPackageProductDependency section */",
      `${productDepEntry}\n/* End XCSwiftPackageProductDependency section */`
    );
  } else {
    pbxproj = pbxproj.replace(
      /(\n\/\* End XCRemoteSwiftPackageReference section \*\/)/,
      `$1\n\n/* Begin XCSwiftPackageProductDependency section */\n${productDepEntry}\n/* End XCSwiftPackageProductDependency section */`
    );
  }

  // Add packageReferences to PBXProject object
  if (pbxproj.includes("packageReferences = (")) {
    pbxproj = pbxproj.replace(
      /packageReferences = \(\s*\n/,
      `packageReferences = (\n\t\t\t\t${pkgRefUUID} /* XCRemoteSwiftPackageReference "${productName}" */,\n`
    );
  } else {
    // Find the PBXProject section and add packageReferences after buildConfigurationList
    pbxproj = pbxproj.replace(
      /(isa = PBXProject;[\s\S]*?buildConfigurationList = [A-F0-9]+ \/\* .* \*\/;)/,
      `$1\n\t\t\tpackageReferences = (\n\t\t\t\t${pkgRefUUID} /* XCRemoteSwiftPackageReference "${productName}" */,\n\t\t\t);`
    );
  }

  // Add packageProductDependencies to the native target (app target)
  if (pbxproj.includes("packageProductDependencies = (")) {
    pbxproj = pbxproj.replace(
      /packageProductDependencies = \(\s*\n/,
      `packageProductDependencies = (\n\t\t\t\t${productDepUUID} /* ${productName} */,\n`
    );
  } else {
    // Add after productType = "com.apple.product-type.application"
    pbxproj = pbxproj.replace(
      /(productType = "com\.apple\.product-type\.application";)/,
      `$1\n\t\t\tpackageProductDependencies = (\n\t\t\t\t${productDepUUID} /* ${productName} */,\n\t\t\t);`
    );
  }

  return pbxproj;
}

function getProjectName(iosPath) {
  const files = fs.readdirSync(iosPath);
  const xcodeproj = files.find((f) => f.endsWith(".xcodeproj"));
  if (!xcodeproj) throw new Error("Could not find .xcodeproj in ios directory");
  return xcodeproj.replace(/\.xcodeproj$/, "");
}

module.exports = { withWebEngageSPM };
