'use strict';
const APP = 'app';
const APP_DIST = `./${APP}/dist`;
const DIST = `./dist`;

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
const glob = require("glob");
const sharp = require('sharp');
var fs = require('fs');
var path = require('path')
let sizeOf = require('image-size');
const { JSDOM } = require("jsdom");
const svgSprite = require('gulp-svg-sprite');
const sizes = {
    xxl: {
        width: 1400
    },
    xl: {
        width: 1200
    },
    lg: {
        width: 992
    },
    md: {
        width: 768
    },
    sm: {
        width: 576
    }
}
const imagesFolders = {
    svgIcons: 'svg-icons',
    noWebp: 'no-webp',
}
const buildDirectory = {
    images: '/images',
    get distImages() { return DIST + this.images },
    get appDistImages() { return APP_DIST + this.images },

    imgesSvgIcons: '/images/' + imagesFolders.svgIcons,
    get distImgesSvgIcons() {return  DIST + this.imgesSvgIcons},
    get appDistImgesSvgIcons() {return  APP_DIST + this.imgesSvgIcons},

    imgesNoWebp: '/images/' +  imagesFolders.noWebp,
    get distImgesNoWebp() {return  DIST + this.imgesNoWebp},
    get appDistImgesNoWebp() {return  APP_DIST + this.imgesNoWebp},

    fonts: DIST + '/fonst',
    js: DIST + '/js',
    css: DIST + '/styles',
    html: DIST + '/'
}
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
        .pipe(replace('~/images/', './../images/'))
        .pipe(autoprefixer('last 3 versions'))
        .pipe(cleanCSS({compatibility: 'ie8'}))
        .pipe(rename({suffix: '.min'}))
        .pipe(sourcemaps.write(`./`))
        .pipe(gulp.dest(`./${APP}/dist/styles`));
}

const images = {
    async minify() {
        const imgSrc = [
            `./${APP}/images/**/*.+(png|jpg|jpeg|svg|gif)`,
            `!./${APP}/images/svg-icons/**/*`
        ];
        const imgDst = `./${APP}/dist/images`;
        const imgsWebpDst = `./${APP}/dist/images/webp`;

        return await gulp.src(imgSrc)
            .pipe(changed(imgDst))
            .pipe(imagemin([
                imagemin.gifsicle({interlaced: true}),
                imagemin.mozjpeg({quality: 75, progressive: true}),
                imagemin.optipng({optimizationLevel: 5}),
                imagemin.svgo({
                    plugins: [
                        {removeViewBox: true},
                        {cleanupIDs: false}
                    ]
                })
            ]))
            .pipe(gulp.dest(imgDst))

    },
    resize() {
        return new Promise( (resolve, reject) => {
            let paths = glob(
                `./${APP}/dist/images/**/*`,
                (err, paths) => {
                    sizesCycle: for(const src of paths) {
                        // do not resize svg icons sprite
                        if(src.split('/').includes('svg-icons')) continue;

                        const currentFile = fs.statSync(src);
                        if(currentFile.isDirectory()) continue;
                        let fileName = src.split('/');
                        fileName = fileName[fileName.length - 1];
                        fileName = fileName.split('.');
                        fileName = fileName[0];

                        for(const size of [...Object.keys(sizes), 'orig']) {
                            if (fileName.split('__').includes(size)) {
                                continue sizesCycle;
                            }
                        }

                        // if error occurs check if images in app/images is ok
                        sizeOf(src, (err, {width}) => {

                                for (const key in sizes) {
                                    const origSuffix = 'orig';
                                    const srcExt = src.split('.')[src.split('.').length-1];
                                    if(!(width > sizes[key].width)) {
                                        if(key === 'sm') {
                                            fs.rename(src, images.addSuffix(src, origSuffix), err => console.log(err));
                                        }
                                        continue;
                                    }
                                    if(srcExt === 'svg') continue;

                                    const outputFile = images.addSuffix(src, key);

                                    sharp(src)
                                        .resize(sizes[key])
                                        .toFile(outputFile)
                                        .then(mes => {
                                            if(fs.existsSync(src)) {
                                                fs.rename(src, images.addSuffix(src, origSuffix), err => console.log('ERROR: ' + err));
                                            }

                                            console.log('success', mes)
                                        })
                                        .catch(e => console.log('Faliure', e))
                                }

                            })

                    }
                })
            resolve();
        })
    },
    generateWebp() {
        const imgSrc = [
            `./${APP}/dist/images/**/*.+(png|jpg|jpeg|gif)`,
           `!./${APP}/dist/images/no-webp/**/*`,
           `!./${APP}/dist/images/svg-icons/*.svg`
        ];
        const imgsWebpDst = `./${APP}/dist/images/webp`;

        if (fs.existsSync(imgsWebpDst)) {
            fs.rmdirSync(imgsWebpDst, { recursive: true });
        }

        return gulp.src(imgSrc)
            .pipe(rename(path => {
                return {
                    dirname: path.dirname,
                    basename: path.basename + "__" + path.extname.substr(1),
                    extname: path.extname
                };
            }))
            .pipe(webp())
            .pipe(gulp.dest(imgsWebpDst));
    },
    addSuffix(src, suffix) {
        let newImgFileName = src.split('.');
        newImgFileName[newImgFileName.length-2] += '__' + suffix;
        newImgFileName = newImgFileName.join('.')

        return newImgFileName;
    },
    svgIcons() {
        const imgSrc = `./${APP}/images/svg-icons/*.svg`;
        const imgDst = `./${APP}/dist/images/svg-icons`;

        return gulp.src(imgSrc)
            .pipe(svgSprite({
                mode: {
                    stack: {
                        sprite: `../svg-icons`,
                        example: true
                    }
                }
            }))
            .pipe(gulp.dest(imgDst))
    }
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
            resolve();
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
const common = {
    getImgSettings(imgString) {
        const img = this.getHtmlImgNode(imgString);
        const settings = this.parseImgFilePathInfo(img.src);
        settings.imgObject = img;
        settings.htmlDistPath = img.src.replace('@images', './images');
        return settings;
    },
    parseImgFilePathInfo(src) {
        const srcArr = src.replace('@images/', '').split('/');
        const ext = this.getImgExt(srcArr[srcArr.length - 1]);

        return {
            imgPathByArr: srcArr,
            'svgIcons': srcArr[0] === imagesFolders.svgIcons,
            'noWebp': srcArr[0] === imagesFolders.noWebp,
            'svgNotIcon': srcArr[0] !== imagesFolders.svgIcons && ext === 'svg',
            'imgNameWithExt': srcArr[srcArr.length - 1],
            'imgNameWithoutExt': srcArr[srcArr.length - 1].replace(`.${ext}`, ''),
            ext
        };
    },
    getDistImgAbsolutePath(uglyImgSrc) {
        const pathPart = `./${APP}/dist/images`;
        return uglyImgSrc.replace('@images', pathPart);
    },
    getHtmlImgNode(imgString) {
        const htmlEl = new JSDOM('<!DOCTYPE html>' + imgString);
        const img = htmlEl.window.document.querySelector("img");
        return img;
    },
    getImgExt(imgSrc) {
        let src = imgSrc.split('.');
        src = src[src.length - 1];
        return src;
    }
}
const html = {
    buildSvgIcons(imgSettings) {
        const {ext, imgNameWithoutExt, imgObject} = imgSettings;
        const {svgIcons: svgIconsFolder} = imagesFolders;
        let {imgesSvgIcons: src} = buildDirectory;
        src = `.${src}/${svgIconsFolder}.${ext}#${imgNameWithoutExt}`;
        imgObject.src = src;
        return imgObject.outerHTML;
    },
    buildSvg(imgSettings) {
        let {images: src} = buildDirectory;
        const {imgObject, imgPathByArr} = imgSettings;
        imgObject.src = html.updateName(imgSettings.ext, `.${src}/${imgPathByArr.join('/')}`, 'orig');
        return imgObject.outerHTML;
    },
    buildImages({ext, imgPathByArr}, webp = false) {
        const sources = [];
        for(const key in sizes) {
            let imgPath = html.updateName(webp ? 'webp' : ext, imgPathByArr.join('/'), key);
            imgPath = `.${buildDirectory.images}/${webp ? 'webp/' : ''}${imgPath}`;
            const imgFullPath = `./${APP}/dist${imgPath.substr(1)}`;
            if(!fs.existsSync(imgFullPath)) continue;
            sources.push(`<source srcset="${imgPath}" media="(min-width:  ${sizes[key].width}px)" type="image/${webp ? 'webp' : ext}">`);
        }
        return sources;
    },
    buildWebpImages(imgSerrings) {
        const sources = [];
        const src = html.updateName(
            'webp',
            `.${buildDirectory.images}/webp/${imgSerrings.imgPathByArr.join('/')}`,
            'orig'
        )
        sources.push(`<source srcset="${src}" type="image/webp" data-default-source>`);
        sources.push(...html.buildImages(imgSerrings, true));
        return sources;
    },
    buildDefaultImages(imgSerrings) {
        const sources = [];
        const {imgObject} = imgSerrings;
        imgObject.src = html.updateName(
            imgSerrings.ext,
            `.${buildDirectory.images}/${imgSerrings.imgPathByArr.join('/')}`,
            'orig'
        )
        sources.push(...html.buildImages(imgSerrings));
        sources.push(imgObject.outerHTML);
        return sources;
    },
    buildHtml() {
        let regexp = /<img.*?src="(.*?)"[^\>]+>/g
        return gulp.src(`./${APP}/*.html`)
            .pipe(htmlhint('.htmlhintrc'))
            .pipe(htmlhint.failOnError())
            .pipe(replace('@styles', './styles'))
            .pipe(replace('@js', './js'))
            // @ todo optimize if there is no img in @images folder but user uses one in html
            .pipe(replace(regexp, (match) => {
                const imgSettings = common.getImgSettings(match);
                const sources = [];
                // Handle svg-icons
                if(imgSettings.svgIcons) return html.buildSvgIcons(imgSettings)

                // Handle .svg
                if(imgSettings.svgNotIcon) return html.buildSvg(imgSettings);

                // Handle .webp
                if(!imgSettings.noWebp) sources.push(...html.buildWebpImages(imgSettings));

                // Handle rest images
                sources.push(...html.buildDefaultImages(imgSettings));

                return (
                    `<template id="template-${html.randomStr()}" data-picture ${!imgSettings.noWebp ? 'data-webp' : 'data-no-webp'}>
                        <picture>
                            ${sources.join(`\n`)}
                        </picture>
                    </template>`
                )

            } ) )
            .pipe(htmlmin({collapseWhitespace: true}))
            .pipe(gulp.dest(`./${APP}/dist`))
    },

    randomStr() {
        return (Math.random() + 1).toString(36).substring(7);
    },
    changeSrc(imgString) {
        const htmlEl = new JSDOM('<!DOCTYPE html>' + imgString);
        const img = htmlEl.window.document.querySelector("img");
        let src = img.src;
        src = src.split('.')
        src[src.length - 2] += '__orig';
        src = src.join('.');
        img.src = src;

        return img.outerHTML;
    },
    updateName(ext, src, key = null) {
        let webPath = src.split('.');
        const replaceValue = ext === 'webp' ? './images/webp' : './images';

        if(key !== null) {
            webPath[webPath.length-2] += '__' + key;
        }

        if(ext === 'webp') {
            webPath[webPath.length-2] += '__' +  webPath[webPath.length-1];
        }

        webPath[webPath.length-1] = ext;
        webPath = webPath.join('.');

        webPath = webPath.replace('@images', replaceValue);
        return webPath
    }
}
const js = {
    build() {
        return gulp.src(`./${APP}/js/**/*js`)
            .pipe(gulp.dest(`./${APP}/dist/js`));
    }
}

exports.buildHtml = html.buildHtml;
exports.buildStyles = buildStyles;
exports.minifyImages = images.minify;
exports.generateWebp = images.generateWebp;
exports.resize = images.resize;
exports.svgIcons = images.svgIcons;
exports.cfisf = fonts.createFontIndexScssFile;
exports.fontsCreateIndex = fonts.createGlobalIndex;
exports.moveFiles = fonts.moveFiles;
exports.buildJS = js.build;

exports.default = async function() {
    if (fs.existsSync(`./${APP}/dist`)) {
        fs.rmdirSync(`./${APP}/dist`, { recursive: true });
    }

    const imgDistSrc = [
        `./${APP}/dist/images/**/*.+(png|jpg|jpeg|gif)`,
        `!./${APP}/dist/images/no-webp/**/*`,
        `!./${APP}/dist/images/svg-icons/*.svg`
    ];

    const svgIconsSrc = [
        `./${APP}/images/svg-icons/*.svg`
    ];

    const imgAppSrc = [
        `./${APP}/images/*`,
        `./${APP}/images/svg-icons/*.svg`
    ];

    gulp.watch(`./${APP}/scss/**/*.scss`, gulp.series(buildStyles));
    gulp.watch(`./${APP}/*.html`, gulp.series(html.buildHtml));
    gulp.watch(`./${APP}/js/**/*.js`, gulp.series(js.build));
    gulp.watch(`./${APP}/fonts/**/*.css`, gulp.series( gulp.parallel(fonts.createFontIndexScssFile, fonts.createGlobalIndex), fonts.moveFiles));
    gulp.watch(imgAppSrc, gulp.series(images.minify));
    gulp.watch(imgDistSrc, gulp.series( gulp.parallel(images.generateWebp, images.resize), html.buildHtml ));
    gulp.watch(svgIconsSrc, gulp.series(images.svgIcons));

    html.buildHtml();
    buildStyles();
    images.minify();
    images.svgIcons();
    js.build();

    setTimeout(() => {
        fonts.moveFiles();
    }, 100)

};
