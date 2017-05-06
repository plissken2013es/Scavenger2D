var DHTMLSprite = function (params) {
     var w = params.w,
         h = params.h,
         iW = params.iW,
         el = params.t.appendChild(create("div")),
         st = el.style,
         mF = Math.floor,
         ci = 0;
     css(el, {
         position: 'absolute', 
         left: "-9999px", /*********************/
         width: w+"px",
         height: h+"px",
         backgroundImage: 'url(' + params.img + ')'
     });
     var that = {
        dw: function (x, y) {
            st.left = x + 'px';
            st.top = y + 'px';
        },
        bI: function(index) {
            ci = index;
            that.cI(ci);
        },
        cI: function (index) {
            index *= w;
            var vOffset = -mF(index / iW) * h;
            var hOffset = -index % iW;
            st.backgroundPosition = hOffset + 'px ' + vOffset + 'px';
        },
        cA: function(anim) {
            if (that.anims[anim]) {
                that.currentAnim = that.anims[anim];
            }
        },
        i: function() {
            return ci;
        },
        sh: function () {
            st.display = 'block';
        },
        hi: function () {
            st.display = 'none';
        },
        k: function () {
            remove(el);
        }
     };
     return that;
};