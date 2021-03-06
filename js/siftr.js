/* shorthand functions */
var $ = goog.dom;
var $$ = function(selector) {return goog.global.document.querySelectorAll(selector);}
var $$1 = function(selector) {return goog.global.document.querySelector(selector);}
/*utility: custom extend that returns object*/
sim.extend = function extend(target, var_args) {
  var clone = goog.object.clone(target);
  goog.object.extend(clone, var_args);
  return clone;
};
/* custom event management */
var et = new goog.events.EventTarget;

tumblrData = [];

var dlg = new goog.fx.DragListGroup();


sim.siftr.findTumblrData = function findTumblrData(tumblogName) {
  var ourTumblog;
  function _matchName(ele) {return ele.tumblog == tumblogName}
  if(!goog.array.some(tumblrData, _matchName))
    return null;
  else
    return goog.array.find(tumblrData, _matchName);
}

/* gets tumblr data and handles it */
sim.siftr.getTumblrData = function  getTumblrData(tumblog, sourceList, start) {
  
  function handleTumblr_(reply) {
    var ourTumblr = sim.siftr.findTumblrData(tumblog);

    if(!ourTumblr) {
      ourTumblr = {"tumblog"    : tumblog,
                   "sourceList" : sourceList,
                   "tumblrObj"  : reply,
                   "postCount"  : reply["posts-total"],
                   "lastStart"  : start,
                   "paintStart" : start,
                   "linkedTumblrSet" : new goog.structs.StringSet(),
                   "linkedTumblrData" : {},
                  };
      tumblrData.push(ourTumblr);
    } else {
      goog.array.extend(ourTumblr.tumblrObj.posts, reply.posts);
      ourTumblr["sourceList"] = sourceList;
      ourTumblr.postCount = reply["posts-total"];
      ourTumblr.lastStart = start;
      ourTumblr.paintStart = start;
    }
    
    et.dispatchEvent(sim.extend(ourTumblr, {type: "JSONP_LOADED"}));
  }
  
  var tumblrEndpoint = "http://"+tumblog+".tumblr.com/api/read/json";
  var jsonp = new goog.net.Jsonp(tumblrEndpoint);
  jsonp.send({"type" : "photo",
              "num" : 50,
              "start" : start},
             handleTumblr_, function() {//handleError
             }, "cacheplz");
};

/*listens for more posts to be loaded, and calls getTumblrData.
  yay recursion!*/
et.addEventListener("MORE_POSTS", function(e) {
  sim.siftr.getTumblrData(e.tumblog, e.sourceList, e.lastStart + 50);
});

sim.siftr.countLinkedTumblrs = function countLinkedTumblrs(arr) {
  var result = {};     
  function accumulate(ele, i, arr) {
    if(result.hasOwnProperty(ele)) 
      result[ele]++;
    else 
      result[ele] = 1;  
  }
  goog.array.forEach(arr, accumulate);
  return result;
};

/* returns function to be used in a goog.array.forEach loop
   with given tumblog and sourcelist
   enclosed in DOM classes and ids */
sim.siftr.addPhotoFrom = function addPhotoFrom(tumblog, sourceList) {
  var container = $$1("#natural");
  var ourTumblr = sim.siftr.findTumblrData(tumblog);

  return function(ele, i, arr) {
    
    function mergeLinkedTumblrs(o) {
      var linkedObj = ourTumblr.linkedTumblrData;
      
      function extendAdd(value, key, obj) {
        if(obj[key] && linkedObj[key])
          linkedObj[key] += obj[key];
        else if (obj[key])
          linkedObj[key] = obj[key]
      }
      goog.object.forEach(o, extendAdd);
    };
    

    /*logic taken from tmv.proto.jp and refactored */
    function getLinkedTumblrs(s) {
      // simple regex against photo caption 
      var matches = s.match(/http:\/\/[\w|-]+\.tumblr\.com/g);
      var tumblrs;
      if (!matches)
        return [];
      
      // gets subdomain which is our tumblog name
      function getNameFromUri(uri) {
        return  uri.replace(/http:\/\//g, "").replace(/.tumblr\.com/g, "").replace(/media|data|www/g, "");
      }
      tumblrs = goog.array.map(matches, getNameFromUri)

      return tumblrs;
    };

    if(ele["photo-caption"]) {
      var ourLinks = getLinkedTumblrs(ele["photo-caption"]);

      ourTumblr.linkedTumblrSet.addArray(ourLinks);

      var ourCountedLinks = sim.siftr.countLinkedTumblrs(ourLinks);

      mergeLinkedTumblrs(ourCountedLinks);
    }

    if(ele.photos.length)
      goog.array.forEach(ele.photos, photoDom);
    else photoDom(ele, i, arr);
    
    function photoDom(elem, j, arr2) {
      var multiPhotoSlug = (elem.offset) ? elem.offset : "";
      
      $.appendChild(container,
                    $.createDom("li",
                                {"class" : tumblog + " draggable " +sourceList ,
                                 "id" : ele.id + multiPhotoSlug + "-" + tumblog,
                                },
                                $.createDom("img", 
                                            {"src" : elem["photo-url-75"],
                                             "class" : "thumbnail"}),
                                $.createDom("img",
                                            {"src" : elem["photo-url-1280"],
                                             "class" : "fullsize"})));
    }
  }
};

/* adds photos to the DOM &
   dispatches PHOTOS_LOADED event */
et.addEventListener("JSONP_LOADED", function(e){
  goog.array.forEach(goog.array.slice(e.tumblrObj.posts, e.paintStart),
                     sim.siftr.addPhotoFrom(e.tumblog, e.sourceList));
  
  if(e.postCount - 50 > e.lastStart) 
    et.dispatchEvent(sim.extend(e, {type: "MORE_POSTS"}));
  
  
  et.dispatchEvent(sim.extend(e, {type: "PHOTOS_LOADED"}));
});

sim.siftr.updateDlg = function updateDlg(){
  dlg.dispose();
  dlg = new goog.fx.DragListGroup();
  listContainers = $$(".list-container");
  goog.array.forEach(listContainers, function(ele, i, arr) {
       dlg.addDragList($.getFirstElementChild(ele),
                       goog.fx.DragListDirection.RIGHT_2D, true, "dragHover");
  });
  
  dlg.setDraggerElClass("dragging");
  dlg.init();
};

/* after a batch of photos is loaded into the DOM,
   make them draggable. */
et.addEventListener("PHOTOS_LOADED", sim.siftr.updateDlg);


/* start it all off with query data tumblr or my tumblr*/
goog.tweak.registerString('tumblr', 'Sets which tumblr to use as source', 'simloovoo', {restartRequired: true});

sim.siftr.getTumblrData(goog.tweak.getString('tumblr'), "activeList", 0);