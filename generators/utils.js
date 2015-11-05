'use strict';

var path = require('path');
var url = require('url');
var baseDir = 'app/scripts/apps/';
var appsDir = 'apps/';
var lodash = require('lodash');
var glob = require('glob');
var fs = require('fs');
var hbsExt = '.hbs';
var testSuffix = 'test',
  templateSufix = 'template',
  _delimiter = '_',
  _jsext = '.js';

/**
 * Types of asserts for Mocha and Jasmine for simpler nad more compact use in test files
 */
var _assert = {
  'mocha': {
    'tobeok': 'to.be.ok',
    'toequal': 'to.equal',
    'createfakespy': 'sinon.spy',
    'createrealspy': 'sinon.spy',
    'callcount': 'callCount',
    'skipit': 'it.skip'
  },
  'jasmine': {
    'tobeok': 'toBeTruthy()',
    'toequal': 'toEqual',
    'createfakespy': 'jasmine.createSpy',
    'createrealspy': 'spyOn',
    'callcount': 'calls.count()',
    'skipit': 'xit'
  }
};

/**
 * Types of backbone components supported/generated by our subgenerators.
 * Used for file name creation in other utility functions.
 */
var _fileNames = {
  model: 'model',
  collection: 'collection',
  itemview: 'item' + _delimiter + 'view',
  collectionview: 'collection' + _delimiter + 'view',
  compositeview: 'composite'  + _delimiter + 'view',
  layoutview: 'layout'  + _delimiter +  'view',
  controller: 'controller',
  router: 'router'
};

/**
 * Creates a file name for source files in a desired format according to specified type.
 * Desired file name format is <name><delimeter><type>.
 *
 * @param {String} name The name
 * @param {String} type The type saved in this type
 * @return {String} file name in desired format
 */
function fileName(name, type) {
  if (name.lastIndexOf(type) === -1) {
    return name + _delimiter + type;
  }
  if (name.length < type.length) {
    return name + _delimiter + type;
  }
  if (name.lastIndexOf(type) === (name.length - type.length)) {
    return name;
  }
  return name + _delimiter + type;
}

/**
 * Creates a file name for test in a desired format according to specified type.
 * Desired file name format is <name><delimeter><type>.
 *
 * @param {String} name The name
 * @param {String} type The type saved in this type
 * @return {String} file name in desired format
 */
function testName(name, type) {
  return fileName(name, type) + _delimiter + testSuffix;
}

/**
 * NOTE: this is a duplicate of testName
 * Creates a file name for test in a desired format according to specified type.
 * Desired file name format is <name><delimeter><type>-test.
 *
 * @param {String} name The name
 * @param {String} type The type saved in this type
 * @return {String} file name in desired format
 */
function testfileName(name, type) {
  return fileName(name, type) + _delimiter + testSuffix;
}

/**
 * Creates a file name for template in a desired format according to specified type.
 * Desired file name format is <name><delimeter><type>-template.
 *
 * @param {String} name The name
 * @param {String} type The type saved in this type
 * @return {String} file name in desired format
 */
function templatefileName(name, type) {
  if (name.lastIndexOf(hbsExt) !== -1 && (name.length - hbsExt.length) > 0 && name.lastIndexOf(hbsExt) === (name.length - hbsExt.length)) {
    return name;
  }
  if (name.lastIndexOf(templateSufix) !== -1 && ((name.length - templateSufix.length) > 0) && (name.lastIndexOf(templateSufix) === (name.length - templateSufix.length))) {
    return name + hbsExt;
  }
  return fileName(name, type) + _delimiter + templateSufix + hbsExt;
}

/**
 * Shorland for creating file name of type collection.
 * Desired file name format is <name>-<collection>.
 *
 * @param {String} name The name
 * @return {String} file name in desired format
 */
function getCollectionFileName(name) {
  return fileName(name, _fileNames.collection);
}

/**
 * Creates a path to a file in a desired format according to specified type.
 * Desired path format is '<app-root>/app/scripts/apps/<directory>/<name><delimeter><type>.js'.
 *
 * @param {String} directory The directory of the file relative to 'app/scripts/apps'
 * @param {String} name The name
 * @param {String} type The type saved in this type
 * @return {String} file name in desired format
 */
function fileNameWithPath(directory, name, type) {
  var pathObject = path.parse(name);

  if (pathObject.ext.length !== 0) {
    return path.join(baseDir, directory, fileName(name, type));
  }
  return path.join(baseDir, directory, fileName(name, type) + _jsext);
}

/**
 * Creates a path to a test file in a desired format according to specified type.
 * Desired path format is '<app-root>/app/scripts/apps/<directory>/<name><delimeter><type>-test.js'.
 *
 * @param {String} directory The directory of the file relative to 'app/scripts/apps'
 * @param {String} name The name
 * @param {String} type The type saved in this type
 * @param {String} testDirectory base directory for tests (needed for tests in different directory option was selected)
 * @return {String} file name in desired format
 */
function testNameWithPath(directory, name, type, testDirectory) {
  return path.join(testDirectory, directory, testfileName(name, type) + _jsext);
}

function testWithPath(directory, name, type, testDirectory) {
  if (testDirectory !== undefined) {
    return testNameWithPath(directory, name, type, testDirectory);
  }
  return path.join(baseDir, directory, testfileName(name, type) + _jsext);
}

/**
 * Creates a path to a templates file in a desired format according to specified type.
 * Desired path format is '<app-root>/app/scripts/apps/<directory>/<name><delimeter><type>-template.hbs'.
 *
 * @param {String} directory The directory of the file relative to 'app/scripts/apps'
 * @param {String} name The name
 * @param {String} type The type saved in this type
 * @return {String} file name in desired format
 */
function templateNameWithPath(directory, name, type) {
  var pathObject = path.parse(name);
  if (pathObject.ext.length > 0) {
    return url.resolve(baseDir + directory + '/', pathObject.base);
  }
  return url.resolve(baseDir + directory + '/', templatefileName(name, type));
}

/**
 * Truncates base path (app/scripts/apps) from the given file path if the base path is present in the string.
 *
 * @param {String} filePath to a file
 * @return {String} path to a file with 'app/scripts/apps' truncated.
 */
function truncateBasePath(filePath) {
  if (filePath.substring(0, baseDir.length) === baseDir) {
    filePath = filePath.slice(baseDir.length);
  }

  return filePath;
}

/**
 * Creates relative AMD path from name and type if custom dir is not provided
 * otherwise it will create a path relative to projects scripts folder.
 *
 * @param {String} name The name
 * @param {String} type The type saved in this.type
 * @param {String} customDir path will be relative to this directory
 * @return {String} path to a file suitable to amd
 */
function amd(name, type, customDir) {
  if (!customDir) {
    return './' + fileName(name, type);
  }
  var mergedPath = path.join(appsDir, customDir, fileName(name, type));
  var unixFormOrPath = mergedPath.replace(/\\/g, '/');
  if (unixFormOrPath.search(baseDir) > -1) {
    return unixFormOrPath.replace(/app\/scripts\/apps\//, '');
  }
  return unixFormOrPath.replace(/\\/g, '/');
}

/**
 * Creates a capitalized camel case version of the component name.
 * Composes the name and the type into a JavaScript class.
 *
 * @param {String} name The name
 * @param {String} type The type saved in this.type
 * @return {String} class name of the component
 */
function className(name, type) {
  var pathObject = path.parse(name);
  if (pathObject.ext.length !== 0) {
    name = pathObject.name;
  }
  if (name.lastIndexOf(type) === (name.length - type.length)) {
    name = name.substring(0, name.length - 1 - type.length);
  }
  return lodash.capitalize(lodash.camelCase(name + lodash.capitalize(lodash.camelCase(type))));
}

/**
 * Creates a non-capitalized camel case version of the component name.
 * Composes the name and the type into a JavaScript class.
 *
 * @param {String} name The name
 * @return {String} name variable name of the component
 */
function variableName(name) {
  return name.substr(0, 1).toLowerCase() + name.substr(1);
}

/**
 * Checks whether the specified file exists in file system.
 *
 * @param {String} fileName representing the path to file.
 */
function verifyPath(fileName) {
  try {
    fs.statSync(fileName);
  }
  catch (e) {
    console.error(fileName + ' does not exist');
    process.exit(1);
  }
}

/**
 * Escapes a path string into a valid regexp string
 * Replaces '/' with '\/'
 *
 * @param {String} path representing a path to escape
 * @return {String} escaped path
 */
function escapePathForRegex(path) {
   return path.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}

/**
 * Function that takes a directory path.
 * Recursively traverses folders from that path and return
 */
function searchFilesInDir(dirPath) {
  var posixPath = dirPath.replace(/\\/g, '/');

  var files = glob.sync(dirPath + '/**/*', { nodir: true });
  return files.map(function(file) { return file.replace(posixPath, ''); });
}

/**
 * This module exports several utility functions for manipulating component
 * names, types and paths in order to fill out tempaltes during the copy phase
 * of the generator.
 */
module.exports = {
  fileName: fileName,
  testName: testName,
  templateName: templatefileName,
  getCollectionFileName: getCollectionFileName,
  fileNameWithPath: fileNameWithPath,
  testNameWithPath: testWithPath,
  templateNameWithPath: templateNameWithPath,
  amd: amd,
  className: className,
  varName: variableName,
  assert: _assert,
  type: _fileNames,
  truncateBasePath: truncateBasePath,
  verifyPath: verifyPath,
  escapePathForRegex: escapePathForRegex,
  delimiter: _delimiter,
  searchFilesInDir: searchFilesInDir
};
