/* eslint-env node */
'use strict';

const path = require('path');
const fs = require('fs');
const yaml = require('yaml-front-matter');
const lodash = require('lodash/string');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = (new JSDOM('')).window;
const DOMPurify = createDOMPurify(window);

// Side effects:
// - Root node of JSON is files key mapping to a dictionary of files
// - .preview will be first WIDTH characters of the raw content
//   (not translated), if width is not 0
// - .__content is removed (potentially too large)
// - if .date is detected, a formated date is added as .dateFormatted

const processFile = function(filename, width, content) {
    const _basename = path.basename(filename, path.extname(filename));
		const _fileContent = fs.readFileSync(filename, 'utf8');
		const _metadata = yaml.loadFront(_fileContent);
console.log(filename);
    if (_metadata) {
				_metadata.content = lodash.trim(_metadata['__content']);
				_metadata.content = _metadata.content.replace(/(\r\n|\n|\r)/gm, ' ').replace(/<img[\s\S]+>/g, '').replace(/{?\??[\s\S]+\??}?/g, '');
        _metadata.content = (_metadata.content.length > 0) ? DOMPurify.sanitize(_metadata.content, {ALLOWED_TAGS: ['#text'], SAFE_FOR_TEMPLATES: true}) : _metadata.content;

        delete _metadata['__content'];

        _metadata.basename = _basename;

				_metadata.type = lodash.capitalize(_metadata.type);
				_metadata.class_name = lodash.kebabCase(_metadata.type);
    }

    return {
        metadata: _metadata,
        basename: _basename,
    };
};

const getFiles = function(filename) {
  if (fs.lstatSync(filename).isDirectory()) {
    return fs.readdirSync(filename).filter((entry) => !entry.isDirectory);
  } else {
    return [filename];
  }
};

exports.parse = function(filenames, options) {
  const parseAllTheFiles = {};
  const files = filenames
    .map(getFiles)
    .reduce((collection, filenames) => collection.concat(filenames), []);

  files
    .map((file) => processFile(file, options.width, options.content))
    .forEach((data) => {
      parseAllTheFiles[data.basename] = data.metadata;
    });

  const json = JSON.stringify(parseAllTheFiles, null, options.minify ? 0 : 2);

  if (options.outfile) {
    const file = fs.openSync(options.outfile, 'w+');
    fs.writeSync(file, json + '\n');
    fs.closeSync(file);
    return;
  } else {
    return json;
  }
};
