//----------------------------------------------------------------------
//  モード
//----------------------------------------------------------------------
"use strict";

//----------------------------------------------------------------------
//  モジュール読み込み
//----------------------------------------------------------------------
const gulp = require("gulp");
const { src, dest, watch, series, parallel, tree } = require("gulp");

const plumber = require("gulp-plumber"); //watch中にエラーが発生してもwatchが止まらないようにするプラグイン
const sassGlob = require("gulp-sass-glob-use-forward"); //@useや@forwardを省略する
const sass = require('gulp-sass')(require('sass')); //Dart Sassを使えるようにする sassのコンパイルをしてくれる
const autoprefixer = require("gulp-autoprefixer"); //ベンダープレフィックスを自動付与
const postcss = require('gulp-postcss'); //メディアクエリをまとめる為
const mqpacker = require('css-mqpacker'); //メディアクエリをまとめる為

const imageResize = require("gulp-image-resize"); //画像をリサイズ

const imageMin = require("gulp-imagemin");　// 画像を圧縮
const mozjpeg = require("imagemin-mozjpeg");    // jpg
const pngquant = require("imagemin-pngquant");  // png
const changed = require("gulp-changed"); // 画像の再圧縮を無くして画像圧縮全体の処理時間を減らす

const purgecss = require("gulp-purgecss"); //css圧縮
const cleancss = require("gulp-clean-css");　//cssコードをきれいに

const uglify = require("gulp-uglify"); //js圧縮
const concat = require('gulp-concat'); //ファイルを結合する
const jshint = require('gulp-jshint'); //JavaScriptの構文をチェックしてくれる
const babel = require('gulp-babel');


const bs = require("browser-sync"); //ブラウザシンク

const htmlhint = require("gulp-htmlhint"); // HTML構文チェック



//----------------------------------------------------------------------
//  関数定義
// //----------------------------------------------------------------------

function compile(done) {
    src("./src/sass/**/*.scss", { sourcemaps: true  /* init */ })
        .pipe(sass({ outputStyle: 'expanded' }))
        .pipe(sass().on('error', sass.logError))
        .pipe(plumber())                   // watch中にエラーが発生してもwatchが止まらないようにする
        .pipe(sassGlob())                  // glob機能を使って@useや@forwardを省略する
        .pipe(
            sass({
                outputStyle: 'expanded',
            })
        )                      // sassのコンパイルをする
        .pipe(autoprefixer())    // ベンダープレフィックスを自動付与する
        .pipe(postcss([mqpacker()]))
        .pipe(dest("./src/css", { sourcemaps: './' /* write */ }))
        .pipe(dest("./src/css"));

    done();
};



function resize(done) {
    src("./src/image/**")
        .pipe(
            imageResize({
                width: 1024,
                height: 768,
                crop: true,	  // リサイズ後に画像をトリミングするかどうか
                upscale: false,   // リサイズ後に画像を拡大するかどうか
            })
        )
        .pipe(dest("./src/dist/img/"));

    done();
}

function imagemin(done) {
    src("./src/image/**")
        .pipe(changed("./src/dist/img/"))   // 追加
        .pipe(
            imageMin([
                pngquant({                // 追加
                    quality: [0.6, 0.7],
                    speed: 1,
                }),
                mozjpeg({ quality: 65 }), // 追加
                imageMin.svgo(),
                imageMin.optipng(),
                imageMin.gifsicle({ optimizationLevel: 3 }),
            ])
        )
        .pipe(dest("./src/dist/img/"));
    done();
}



function minify(done) {
    src("./src/css/*.css")
        .pipe(plumber())                              // watch中にエラーが発生してもwatchが止まらないようにする
        .pipe(purgecss({
            content: ["./src/*.html", "./src/**/*.js"],  // src()のファイルで使用される可能性のあるファイルを全て指定
        }))
        .pipe(cleancss())                             // コード内の不要な改行やインデントを削除
        .pipe(dest("./src/dist/css/"));

    done();
}

function js(done) {
    src("./src/js/**/*.js")
        .pipe(plumber())                 // watch中にエラーが発生してもwatchが止まらないようにする
        .pipe(uglify())                  // コード内の不要な改行やインデントを削除
        .pipe(dest("./src/dist/js/"));

    done();
}

const concatJs = (done) => {
    src(`./src/js/**/*.js`)
        .pipe(plumber())
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        .pipe(
            babel({
                presets: ['@babel/env'],
            })
        )
        .pipe(concat('bundle.js'))
        .pipe(dest("./src/dist/js/"));
    done();
};

const hinthtml = (done) => {
    src("./src/*.html")
        .pipe(htmlhint());
    done();
};

function bsInit(done) {
    bs.init({
        server: {
            baseDir: "./"                   // browser-syncが基準とするディレクトリを指定する
        },
        startPath: "src/index.html",      // 開きたいパスを指定する
        notify: false,                    // ブラウザ更新時に出てくる通知を非表示にする
        open: "external",                 // ローカルIPアドレスでサーバを立ち上げる
    });

    done();
}

function bsReload(done) {
    bs.reload();

    done();
}

const watchFiles = (done) => {
    watch('./**/*.html', bsReload);
    watch(
        './src/sass/**/*.scss',
        series(compile, minify, bsReload)
    );
    watch('./src/css/*.css', minify);
    watch('./src/*.html', hinthtml);
    watch(
        './src/js/**/*.js',
        series(js, concatJs, bsReload)
    );
    watch('./src/image/**', series(imagemin, bsReload));
    done();
};



//----------------------------------------------------------------------
//  タスク定義
//----------------------------------------------------------------------
exports.compile = series(compile);
exports.resize = series(resize);
exports.imagemin = imagemin;
exports.minify = series(minify);
exports.js = series(js, concatJs);
// exports.bs = series(bsInit, bsReload,);

exports.default = parallel(
    compile,
    hinthtml,
    concatJs,
    imagemin,
    watchFiles,
    bsInit
);


/************************************************************************/
/*  END OF FILE                                                         */
/************************************************************************/