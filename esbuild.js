const esbuild = require('esbuild');

const isWatch = process.argv.includes('--watch');
const isMinify = process.argv.includes('--minify');

const ctx = esbuild.context({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  format: 'cjs',
  minify: isMinify,
  sourcemap: !isMinify,
  sourcesContent: false,
  platform: 'node',
  outfile: 'dist/extension.js',
  external: ['vscode'],
  logLevel: 'info',
});

ctx.then(async (context) => {
  if (isWatch) {
    await context.watch();
    console.log('👀 Watching for changes…');
  } else {
    await context.rebuild();
    await context.dispose();
    console.log('✅ Build complete.');
  }
}).catch(() => process.exit(1));
