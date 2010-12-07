/* sim.array utility functions */
sim.array.intersect = function(arrOfArrs) {
  var shortestArr = sim.array.first(arrOfArrs);
  var restArrs = sim.array.rest(arrOfArrs);
  return goog.array.filter(shortestArr, function(ele) {
    return goog.array.every(restArrs, 
                            function(restArr) {
                              return goog.array.contains(restArr, ele);
                            });
  });
};

sim.array.first = function(arr) {
  var arrClone = goog.array.clone(arr);
  return arrClone.shift();
}
sim.array.rest = function(arr) {
  var arrClone = goog.array.clone(arr);
  arrClone.shift();
  return arrClone;
}

/* returns array of DOM elements with both classes provided.
   TODO: actually use it*/
sim.siftr.getPhotosByBlogAndList = function(tumblog, sourceList) {
  return sim.array.intersect([
    goog.dom.getElementsByClass(tumblog), 
    goog.dom.getElementsByClass(sourceList)]);
};

/* custom event management */
var et = new goog.events.EventTarget;

tumblrData = new Array();

/* manipulates tumblrData structure. 1 object in the array per blog. 
   dispatches MORE_POSTS event to load more photos
   returns modified object. */
sim.siftr.updateTumblrData = function(tumblogName, sourceList, start, reply) {
  var ourTumblog;

  if(!goog.array.some(tumblrData, function(ele, i, arr) {
    return ele.tumblog == tumblogName;})) {
    ourTumblog ={"tumblog"    : reply.tumblelog.name,
                 "sourceList" : sourceList,
                 "tumblrObj"  : reply,
                 "postCount"  : reply["posts-total"],
                 "lastStart"  : start}; 
    tumblrData.push(ourTumblog);
    }else{
      ourTumblog = goog.array.find(tumblrData, function(ele) {
        return ele.tumblog == tumblogName;});
      goog.array.extend(ourTumblog.tumblrObj.posts, reply.posts);
      ourTumblog.postCount = reply["posts-total"];
      ourTumblog.lastStart = start;
    }

  if(ourTumblog.postCount - 50 > start) {
    et.dispatchEvent({type : "MORE_POSTS",
                      "tumblog"    : tumblogName,
                      "sourceList" : sourceList,
                      "lastStart"  : start});
  }

  return ourTumblog;
}

/* gets tumblr data and handles it */
sim.siftr.getTumblrData = function(tumblog, sourceList, start) {
  
  /* called on successful JSONP request.
     adds response to tumblrData data structure &
     dispatches JSONP_LOADED event */
  function handleTumblr_(reply) {
    var updatedTumblr = sim.siftr.updateTumblrData(tumblog, sourceList, start, reply);

    et.dispatchEvent({type: "JSONP_LOADED",
                      "tumblog"    : updatedTumblr["tumblog"],
                      "sourceList" : updatedTumblr["sourceList"],
                      "tumblrObj"  : updatedTumblr["tumblrObj"],
                      "postCount"  : updatedTumblr["postCount"],
                      "lastStart"  : updatedTumblr["lastStart"]});
  }
  
  var tumblrEndpoint = "http://"+tumblog+".tumblr.com/api/read/json";
  var jsonp = new goog.net.Jsonp(tumblrEndpoint);
  jsonp.send({"type" : "photo",
              "num" : 50,
              "start" : start},
             handleTumblr_);
};

/*listens for more posts to be loaded, and calls getTumblrData.
  yay recursion!*/
et.addEventListener("MORE_POSTS", function(e) {
  sim.siftr.getTumblrData(e.tumblog, e.sourceList, e.lastStart + 50);
});

/* returns function to be used in a goog.array.forEach loop
   with given tumblog and sourcelist
   enclosed in DOM classes and ids */
sim.siftr.addPhotoFrom = function(tumblog, sourceList) {
  var container = goog.dom.getElement("natural");

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
      
      goog.dom.appendChild(container,
                           goog.dom.createDom("li",
                                              {"class" : tumblog + " draggable " +sourceList ,
                                               "id" : ele.id + multiPhotoSlug + "-" + tumblog,
                                              },
                                              goog.dom.createDom("img", 
                                                                 {"src" : elem["photo-url-75"],
                                                                  "class" : "thumbnail"}),
                                              goog.dom.createDom("img",
                                                                 {"src" : elem["photo-url-1280"],
                                                                  "class" : "fullsize"})));
    }
  }
};

/* adds photos to the DOM &
   dispatches PHOTOS_LOADED event */
et.addEventListener("JSONP_LOADED", function(e){
  goog.array.forEach(e.tumblrObj.posts,
                     sim.siftr.addPhotoFrom(e.tumblog, e.sourceList));
  et.dispatchEvent({type: "PHOTOS_LOADED"});
});

/* our DragListGroup variable */
var dlg;

sim.siftr.updateDlg = function(){
  dlg = new goog.fx.DragListGroup();
  listContainers = goog.dom.getElementsByClass("list-container");
  goog.array.forEach(listContainers, function(ele, i, arr) {
       dlg.addDragList(goog.dom.getFirstElementChild(ele),
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
