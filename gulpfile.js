var gulp = require('gulp');
var spritesmith = require('gulp.spritesmith');
var imageResize = require('gulp-image-resize');
var imagemin = require('gulp-imagemin');
var gulpSequence = require('gulp-sequence');
var merge = require('merge-stream');
var buffer = require('vinyl-buffer');
var csso = require('gulp-csso');
var del = require('del');

gulp.task('clean-src', function () {
    return del([
        './images/**/*'
    ], {force: true});
});

var imgRoot = '../img/';

function spriteTaskGenerator(imgRoot, set, name, sizePrefix, imageExt) {
    return function () {
        var name_size = sizePrefix ?  name + '_' + sizePrefix : name;
        var spriteData = gulp.src('./tmp/img/' + set + '/' + name_size + '/*').pipe(spritesmith({
            imgName: set + '_' + name_size + '_sprite.' + imageExt,
            imgPath: imgRoot + name_size + '_sprite.' + imageExt,
            cssName: set + '_' + name_size + '_sprite_' + imageExt + '.css',
            cssOpts: {
                cssSelector: function (sprite) {
                    return '.' + set + '-' + name + '-sprite-' + sprite.name.replace('.', '-') + (sizePrefix ? '.' + set + '-' + name + '-sprite-' + sizePrefix : '');
                }
            }
        }));
        
        var imgStream = spriteData.img
            .pipe(buffer())
            .pipe(imagemin())
            .pipe(gulp.dest('./dist/img'));

        var cssStream = spriteData.css
            .pipe(csso())
            .pipe(gulp.dest('./dist/css'));

        return merge(imgStream, cssStream);
    }
}

function taskGenerator(imgRoot, set, name, sizes, imgTypes) {
    var cleanTaskName = set + '/' + name + '-clean';
    var copyTaskName = set + '/' + name + '-copy';
    var fixTaskName = set + '/' + name + '-fix';
    
    gulp.task(cleanTaskName, function () {
        var arr = imgTypes.map(function (imgType) { return './dist/css/' + set + '/' + name + '_sprite_' + imgType + '.css'; });
        arr.push('./dist/img/'+ set + '/' + name + '/*');
        arr.push('./tmp/img/' + set + '/' + name + '/*');
        return del(arr, {force: true});
    });
    
    gulp.task(copyTaskName, function() {
        return gulp.src('./images/' + set + '/' + name + '/*')
            .pipe(imagemin())
            .pipe(gulp.dest('./tmp/img/' + set + '/' + name));
    });
    
    gulp.task(fixTaskName, function() {
        return gulp.src('./override/' + set + '/' + name + '/*')
            .pipe(imagemin())
            .pipe(gulp.dest('./tmp/img/' + set + '/' + name));
    });
        
    var sizes = sizes || [];
    sizes.forEach(function (size) {
        var width = size[0];
        var height = size[1];
        var sizePrefix = width + 'x' + height;
    
        var cleanTaskName2 = set + '/' + name + '-clean-' + sizePrefix;
        
        gulp.task(cleanTaskName2, function () {
            var arr = imgTypes.map(function (imgType) { return './dist/css/' + name + '_sprite' + '_' + sizePrefix + '_' + imgType + '.css'; });
            arr.push('./dist/img/' + set + '/' + name + '_' + sizePrefix + '/*');
            arr.push('./tmp/img/' + set + '/' + name + '_' + sizePrefix + '/*');
            return del(arr, {force: true});
        });

        gulp.task(name + '-resize-' + sizePrefix, function() {
            return gulp.src('./tmp/img/' + set + '/' + name + '/*')
                .pipe(imageResize({
                    width : width,
                    height : height,
                    crop : true,
                    upscale : false
                }))
                .pipe(imagemin())
                .pipe(gulp.dest('./tmp/img/' + set + '/' + name + '_' + sizePrefix));
        });
    });
        
    imgTypes.forEach(function (imgType) {
        var taskName = set + '/' + name + '-sprite-' + imgType;
        
        gulp.task(taskName, spriteTaskGenerator(imgRoot, set, name, null, imgType));
        
        var spriteTasks = [taskName];
        
        sizes.forEach(function (size) {
            var width = size[0];
            var height = size[1];
            var sizePrefix = width + 'x' + height;
            
            var taskName2 = set + '/' + name + '-sprite-' + sizePrefix + '-' + imgType;
            
            gulp.task(taskName2, spriteTaskGenerator(imgRoot, set, name, sizePrefix, imgType));
            
            spriteTasks.push(taskName2);
        });

        gulp.task(set + '/' + name + '-' + imgType, gulpSequence.apply(this, spriteTasks));
    });
    
    var taskList = [cleanTaskName, copyTaskName, fixTaskName]
    imgTypes.forEach(function (imgType) {
        taskList.push(set + '/' + name + '-sprite-' + imgType);
    });
    sizes.forEach(function (size) {
        var width = size[0];
        var height = size[1];
        var sizePrefix = width + 'x' + height;
    
        taskList.push(set + '/' + name + '-clean-' + sizePrefix);
        taskList.push(set + '/' + name + '-resize-' + sizePrefix);
            
        imgTypes.forEach(function (imgType) {
            taskList.push(set + '/' + name + '-sprite-' + sizePrefix + '-' + imgType)
        });
    });
    gulp.task(set + '/' + name, gulpSequence.apply(this, taskList));
}

taskGenerator(imgRoot, 'set00', 'hero_icons', null, ['png']);
taskGenerator(imgRoot, 'set01', 'hero_icons', null, ['png']);
//taskGenerator(imgRoot, 'heroes', [[64, 36], [32, 18]], ['png', 'jpg']);
//taskGenerator(imgRoot, 'portraits', [[64, 84], [32, 42]], ['png', 'jpg']);
//taskGenerator(imgRoot, 'items', [[70, 50], [50, 36], [36, 26], [25, 18]], ['png', 'jpg']);
//taskGenerator(imgRoot, 'spellicons', [[64, 64], [32, 32]], ['png', 'jpg']);
    
gulp.task('clean', function () {
    return del([
        './dist/**/*',
        './tmp/**/*'
    ], {force: true});
});
    
gulp.task('default', gulpSequence('set00/hero_icons', 'set01/hero_icons'));