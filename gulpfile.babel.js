/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import gulp from "gulp";

import babel from "gulp-babel";
import sourcemaps from "gulp-sourcemaps";
import babelRegister from "babel-register";

// Import testing modules.
import mocha from "gulp-mocha";
import istanbul from "gulp-istanbul";
const isparta = require("isparta");

// Eslint module.
import eslint from "gulp-eslint";

gulp.task("lint", () => {
  return gulp.src(["./*.js", "src/**/*.js", "test/**/*.js"])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

// Runs the Mocha test suite.
gulp.task("test", () => {
  gulp.src("src/**/*.js")
    .on("finish", () => {
      gulp.src("test/**/*.js")
        .pipe(mocha({
          reporter: "spec",
          timeout: 2000,
          compilers: {
            js: babelRegister
          }
        }));
    });
});

// Instrument for coverage.
gulp.task("coverage", () => {
  gulp.src("src/**/*.js")
    .pipe(istanbul({
      instrumenter: isparta.Instrumenter
    }))
    .pipe(istanbul.hookRequire())
    .on("finish", () => {
      gulp.src("test/**/*.js")
        .pipe(mocha({
          reporter: "spec",
          timeout: 2000,
          compilers: {
            js: babelRegister
          }
        }))
        .pipe(istanbul.writeReports());
    });
});

// Transpile with Babel.
gulp.task("dist", () => {
  gulp.src("src/**/*.js")
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(sourcemaps.write(".",  {sourceRoot: "../src/"}))
    .pipe(gulp.dest("dist"));
});

gulp.task("default", ["lint", "test", "dist"]);
