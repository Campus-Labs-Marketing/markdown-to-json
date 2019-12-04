/* eslint-env node */
'use strict';

const moment = require('moment');
const path = require('path');
const fs = require('fs');
const yaml = require('yaml-front-matter');
const _string = require('lodash/string');
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
    const _metadata = yaml.loadFront(filename);

    if (_metadata) {
        _metadata['content'] = DOMPurify.sanitize(_metadata['__content']);

        delete _metadata['__content'];

        // map user-entered date to a better one using moment's great parser
        if (_metadata.date) {
            _metadata.iso8601Date = moment(_metadata.date).format();
        }

        _metadata.basename = _basename;

				_metadata['categories'] = _string.kebabCase(_metadata['categories']);
				_metadata['type'] = _string.capitalize(_metadata['type']);
				_metadata['class_name'] = _string.kebabCase(_metadata['type']);
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
  // http://i.qkme.me/3tmyv8.jpg
  const parseAllTheFiles = {};
  // http://i.imgur.com/EnXB9aA.jpg

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
