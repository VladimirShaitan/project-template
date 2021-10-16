'use strict';
const APP = 'app';
let gulp = require('gulp');
let sass = require('gulp-sass')(require('sass'));
let cleanCSS = require('gulp-clean-css');
let autoprefixer = require('gulp-autoprefixer');
let rename = require('gulp-rename');
let sourcemaps = require('gulp-sourcemaps');
var scsslint = require('gulp-scss-lint');
let changed = require('gulp-changed');
let imagemin = require('gulp-imagemin');
let replace = require('gulp-replace');
let htmlhint = require("gulp-htmlhint");
let htmlmin = require('gulp-htmlmin');
let webp = require('gulp-webp');

var fs = require('fs');
var path = require('path')

function getFolders(dir) {
    return fs.readdirSync(dir)
        .filter(function(file) {
            return fs.statSync(path.join(dir, file)).isDirectory();
        });
}

function buildStyles() {
    return gulp.src(`./${APP}/scss/pages/*.scss`)
        .pipe(scsslint())
        .pipe(sourcemaps.init())
        .pipe(sass({
            includePaths: ['node_modules'],
        }).on('error', sass.logError))
        .pipe(replace('url("~/fonts/', 'url("./../fonts/'))
        .pipe(autoprefixer('last 3 versions'))
        .pipe(cleanCSS({compatibility: 'ie8'}))
        .pipe(rename({suffix: '.min'}))
        .pipe(sourcemaps.write(`./`))
        .pipe(gulp.dest(`./${APP}/dist/styles`));
}
//
// function minifyImages() {
//     const imgSrc = `./${APP}/images/*.+(png|jpg|gif)`;
//     const imgDst = `./${APP}/dist/images`;
//     const imgsWebpDst = `./${APP}/dist/images/webp`;
//
//     return gulp.src(imgSrc)
//             .pipe(changed(imgDst))
//             .pipe(imagemin())
//             .pipe(gulp.dest(imgDst))
//             .pipe(webp())
//             .pipe(gulp.dest(imgsWebpDst));
// }

function minifyImages() {
    const imgSrc = `./${APP}/images/*.+(png|jpg|gif)`;
    const imgDst = `./${APP}/dist/images`;
    const imgsWebpDst = `./${APP}/dist/images/webp`;

    return gulp.src(imgSrc)
            .pipe(changed(imgDst))
            .pipe(imagemin())
            .pipe(gulp.dest(imgDst))
            .pipe(webp())
            .pipe(gulp.dest(imgsWebpDst));
}



const fonts = {
    createFontIndexScssFile() {
        return gulp.src(`./${APP}/fonts/**/*.css`)
            .pipe(rename({
                basename: 'index',
                extname: '.scss'
            }))
            .pipe(replace("url('", "url('~/fonts/"))
            .pipe(gulp.dest(({base}) => base))
    },

    createGlobalIndex() {
        return new Promise(function(resolve, reject) {
            const folders = getFolders(`./${APP}/fonts/`);
            const importsString = (folders => {
                return folders
                    .map(folder => `@import './${folder}';`)
                    .join('\n');
            })(folders);

            fs.writeFile(`./${APP}/fonts/index.scss`, importsString, () => {});
            resolve()
        })
   },

    moveFiles() {
        const distDir = `./${APP}/dist/`;
        const dir = `./${APP}/fonts/`;
        const extensions = ['.eot', '.svg', '.ttf', '.woff', '.woff2'];

        if (fs.existsSync(distDir)) {
            fs.rmdirSync(distDir + 'fonts', { recursive: true });
        }

        fs.mkdirSync(distDir + 'fonts', '0744');

        return new Promise( (resolve, reject) => {
            fs.readdir(dir, (err, files) => {
                for(const fileName of files) {
                    const dirPath = dir + fileName;
                    const fontsDirectory = fs.statSync(dirPath);
                    if(!fontsDirectory.isDirectory()) continue;

                    fs.readdir(dirPath, (err, files) => {
                        for(let fileName of files) {
                            const filePath = dirPath + '/' + fileName;
                            if(!extensions.includes(path.extname(filePath))) continue;
                            fs.copyFile(
                                filePath,
                                `./${APP}/dist/fonts/` + fileName,
                                null,
                                () => {}
                            );
                        }
                    })
                }
            });


            resolve();
        })
    }
}

function buildHtml() {
    let regexp = /<img.*?src="(.*?)"[^\>]+>/g
    return gulp.src(`./${APP}/*.html`)
        .pipe(htmlhint('.htmlhintrc'))
        .pipe(htmlhint.failOnError())
        .pipe(replace('@styles', './styles'))
        .pipe(replace(regexp, (match, p1, offset, string) => {
            let newPath = p1.split('.');
            newPath[newPath.length-1] = 'webp';
            newPath = newPath.join('.');
            newPath = newPath.replace('@images', './images/webp')
            match = match.replace('@images', './images');

            return (
                `<picture>
                    <source srcset="${newPath}" type="image/webp">
                    ${match}
                </picture>`
            )

        } ) )
        // .pipe(htmlmin({collapseWhitespace: true}))
        .pipe(gulp.dest(`./${APP}/dist`))
}


exports.buildHtml = buildHtml;
exports.buildStyles = buildStyles;
exports.minifyImages = minifyImages;
exports.cfisf = fonts.createFontIndexScssFile;
exports.fontsCreateIndex = fonts.createGlobalIndex;
exports.moveFiles = fonts.moveFiles;

exports.default = async function() {
    gulp.watch(`./${APP}/scss/**/*.scss`, gulp.series(buildStyles));
    gulp.watch(`./${APP}/*.html`, gulp.series(buildHtml));
    gulp.watch(`./${APP}/fonts/**/*.css`, gulp.series(fonts.createFontIndexScssFile, fonts.createGlobalIndex, fonts.moveFiles));
    gulp.watch(`./${APP}/images/*`, gulp.series(minifyImages));
    buildHtml();
    buildStyles();
    minifyImages();
    setTimeout(() => {
        fonts.moveFiles();
    }, 100)

};
