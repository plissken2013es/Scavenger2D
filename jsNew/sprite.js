var DHTMLSprite = function (params) {
     var w = params.w,
         h = params.h,
         iW = params.iW,
         el = params.t.appendChild(create("div")),
         st = el.style,
         mF = Math.floor,
         anims = [],
         canim = [],
         dx = 0,
         dy = 0,
         ii = 0,
         ci = 0;
     css(el, {
         position: 'absolute', 
         left: "-9999px", /*********************/
         width: w+"px",
         height: h+"px",
         backgroundImage: 'url(' + params.img + ')'
     });
     var that = {
        log: function() {
            console.log(w, h, iW, anims, canim, ii, ci);
        },
        diff: function(x, y) {
            dx = x;
            dy = y;
        },
        aA: function(animsArr) {
            anims = animsArr;
        },
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
            if (anims[anim]) {
                canim = anims[anim];
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
        },
        mv: function(dt, dir) {
            if (!dt) return;
            that.cI(ci + canim[mF(ii)]);
            ii += dt/1000 * anims.v;
            if (ii >= canim.length) {
                ii = 0;
            }
        },
        v: function() {
            return anims.v;
        },
        dxy: function() {
            return [dx/500, dy/500];
        }
     };
     return that;
};