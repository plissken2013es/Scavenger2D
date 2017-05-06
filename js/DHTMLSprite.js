var DHTMLSprite = function (params) {
     var width = params.width,
         height = params.height,
         imagesWidth = params.imagesWidth,
         $element = params.$drawTarget.append('<div/>').find(':last'),
         elemStyle = $element[0].style,
         mathFloor = Math.floor,
         currentIndex = 0;
     $element.css({
         position: 'absolute', left:-9999,/*********************/
         width: width,
         height: height,
         backgroundImage: 'url(' + params.images + ')'
     });
     var that = {
        draw: function (x, y) {
            elemStyle.left = x + 'px';
            elemStyle.top = y + 'px';
        },
        baseImage: function(index) {
            currentIndex = index;
            that.changeImage(currentIndex);
        },
        changeImage: function (index) {
            index *= width;
            var vOffset = -mathFloor(index / imagesWidth) * height;
            var hOffset = -index % imagesWidth;
            elemStyle.backgroundPosition = hOffset + 'px ' + vOffset + 'px';
        },
        changeAnimation: function(anim) {
            if (that.anims[anim]) {
                that.currentAnim = that.anims[anim];
            }
        },
        index: function() {
            return currentIndex;
        },
        show: function () {
            elemStyle.display = 'block';
        },
        hide: function () {
            elemStyle.display = 'none';
        },
        destroy: function () {
            $element.remove();
        }
     };
     return that;
};