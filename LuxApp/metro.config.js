const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * Native modules recreate/delete `android/build` / `ios/build` during Gradle/Xcode runs.
 * Metro's Windows FallbackWatcher can try to `fs.watch` those paths after they vanish → ENOENT.
 * Ignoring those trees keeps the watcher out of ephemeral codegen folders (e.g. lottie-react-native).
 *
 * `blockList` as an array merges to one RegExp without a trailing `$`, so patterns may match any path segment.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    blockList: [
      /\/node_modules\/.*\/android\/build(\/|$)/,
      /\/node_modules\/.*\/ios\/build(\/|$)/,
      // Preserve default metro exclusion for nested test trees
      /\/__tests__\//,
      /\/android\/\.cxx\//,
      /\.cxx\//,
      /CMakeFiles\//,
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
