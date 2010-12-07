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

/* TODO: refine data structure */
tumblrData = new Array();

/* custom event management */
var et = new goog.events.EventTarget;

/* gets tumblr data and handles it */
sim.siftr.getTumblrData = function(tumblog, sourceList, start) {
  
  /* called on successful JSONP request.
     adds response to tumblrData data structure &
     dispatches JSONP_LOADED event */
  function handleTumblr_(reply) {
    tumblrData.push({"tumblog" : reply.tumblelog.name,
                     "sourceList" : sourceList,
                     "tumblrObj" : reply});
    et.dispatchEvent({type: "JSONP_LOADED",
                      "tumblog" : reply.tumblelog.name,
                      "sourceList" : sourceList,
                      "tumblrObj" : reply});
  }
  
  var tumblrEndpoint = "http://"+tumblog+".tumblr.com/api/read/json";
  var jsonp = new goog.net.Jsonp(tumblrEndpoint);
  jsonp.send({"type" : "photo",
              "num" : 50,
              "start" : start},
             handleTumblr_);
};


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
sim.siftr.getTumblrData("simloovoo", "customList1", 0);
