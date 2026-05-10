// Records process.cwd() at hook invocation. The CLI is expected to chdir
// into the template package root before calling this hook so older
// templates (which then shell out to `npm run ...` with no cwd option)
// can find their own package.json.
const fs = require('fs');

module.exports = function ({ markerPath }) {
  fs.writeFileSync(markerPath, process.cwd());
};
