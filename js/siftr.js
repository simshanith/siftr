/* shorthand functions */
var $ = goog.dom;
var $$ = function(selector) {return $.query(selector, goog.global.document);}

/*utility: custom extend that returns object*/
sim.extend = function extend(target, var_args) {
  var clone = goog.object.clone(target);
  goog.object.extend(clone, var_args);
  return clone;
};
/* custom event management */
var et = new goog.events.EventTarget;

tumblrData = [];

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
  
  /* called on successful JSONP request.
     adds response to tumblrData data structure &
     dispatches JSONP_LOADED event */
  function handleTumblr_(reply) {
    var ourTumblr = sim.siftr.findTumblrData(tumblog);

    if(!ourTumblr) {
      ourTumblr = {"tumblog"    : tumblog,
                   "sourceList" : sourceList,
                   "tumblrObj"  : reply,
                   "postCount"  : reply["posts-total"],
                   "lastStart"  : start,
                   "paintStart" : start};
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

/* returns function to be used in a goog.array.forEach loop
   with given tumblog and sourcelist
   enclosed in DOM classes and ids */
sim.siftr.addPhotoFrom = function addPhotoFrom(tumblog, sourceList) {
  var container = $$("#natural")[0];
  
  /* goog.array.forEach() iterating function */
  return function(ele, i, arr) {
   
    /* if there are multiple photos in a post, we need to iterate
       over those too. They will be in an array attached to the
       photos property. */
    if(ele.photos.length)
      goog.array.forEach(ele.photos, photoDom);
    
    /*else we just thread on through photoDom */
    else photoDom(ele, i, arr);
    
    /* inner function actually handles DOM manipulation */
    function photoDom(elem, j, arr2) {
      
      /* multiPhotoSlug is appended to the id of the list
         element. the object of a multiple-photo post photo has an
         offset property; single-photo posts don't. */
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
  
  if(e.postCount - 50 > e.lastStart) {
    et.dispatchEvent({type : "MORE_POSTS",
                      "tumblog"    : e.tumblog,
                      "sourceList" : e.sourceList,
                      "lastStart"  : e.lastStart});
  }
  
  et.dispatchEvent({type: "PHOTOS_LOADED",
                    "tumblog"   : e.tumblog,
                    "souceList" : e.sourceList,
                    "tumblrObj" : e.tumblrObj,
                    "lastStart" : e.lastStart,
                    "postCount" : e.postCount});
});

/* our DragListGroup variable */
var dlg;

sim.siftr.updateDlg = function updateDlg(){
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


/* start it all off with my tumblr */
sim.siftr.getTumblrData("simloovoo", "activeList", 0);
