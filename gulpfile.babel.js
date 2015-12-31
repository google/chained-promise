"use strict";
import gulp from "gulp";

import exit from "gulp-exit";
import babel from "gulp-babel";
import sourcemaps from "gulp-sourcemaps";
import babelRegister from "babel-register";

// Import testing modules.
import mocha from "gulp-mocha";
import istanbul from "gulp-istanbul";
const isparta = require('isparta');

// Runs the Mocha test suite.
gulp.task('test', () => {
  gulp.src('src/**/*.js')
    .on('finish', () => {
      gulp.src('test/**/*.js')
        .pipe(mocha({
          reporter: 'spec',
          timeout: 2000,
          compilers: {
            js: babelRegister
          }
        }))
    });
});

// Instrument for coverage.
gulp.task('coverage', () => {
  gulp.src('src/**/*.js')
    .pipe(istanbul({
      instrumenter: isparta.Instrumenter
    }))
    .pipe(istanbul.hookRequire())
    .on('finish', () => {
      gulp.src('test/**/*.js')
        .pipe(mocha({
          reporter: 'spec',
          timeout: 2000,
          compilers: {
            js: babelRegister
          }
        }))
        .pipe(istanbul.writeReports())
    });
});

// Transpile with Babel.
gulp.task('dist', () => {
  gulp.src('src/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(sourcemaps.write('.',  {sourceRoot: '../src/'}))
    .pipe(gulp.dest('dist'));
});

gulp.task('default', ['test', 'dist']);
