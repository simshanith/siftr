/*
////////////// /array utils\\\\\\\\\\\\\\\\\\\\
ported from Google Closure Library,
   goog.array.js

*/

sim.array.extend = function extend(arr1, var_args) {
  for (var i = 1; i < arguments.length; i++) {
    var arr2 = arguments[i];
    // If we have an Array or an Arguments object we can just call push
    // directly.
    var isArrayLike;
    if (dojo.isArray(arr2) ||
        // Detect Arguments. ES5 says that the [[Class]] of an Arguments object
        // is "Arguments" but only V8 and JSC/Safari gets this right. We instead
        // detect Arguments by checking for array like and presence of "callee".
        (isArrayLike = dojo.isArrayLike(arr2)) &&
        // The getter for callee throws an exception in strict mode
        // according to section 10.6 in ES5 so check for presence instead.
        arr2.hasOwnProperty('callee')) {
      arr1.push.apply(arr1, arr2);
      
    } else if (isArrayLike) {
      // Otherwise loop over arr2 to prevent copying the object.
      var len1 = arr1.length;
      var len2 = arr2.length;
      for (var j = 0; j < len2; j++) {
        arr1[len1 + j] = arr2[j];
      }
    } else {
      arr1.push(arr2);
    }
  }
};

sim.array.findIndex = function(arr, f, opt_obj) {
  var l = arr.length;  // must be fixed during loop... see docs
  var arr2 = dojo.isString(arr) ? arr.split('') : arr;
  for (var i = 0; i < l; i++) {
    if (i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return i;
    }
  }
  return -1;
};

sim.array.find = function(arr, f, opt_obj) {
  var i = sim.array.findIndex(arr, f, opt_obj);
  return i < 0 ? null : dojo.isString(arr) ? arr.charAt(i) : arr[i];
};

sim.array.get = function(arrOfObjs, property, value) {
  function _matcher(ele) {return ele[property] === value}

  if(!dojo.some(arrOfObjs, _matcher))
    return null;
  else
    return sim.array.find(arrOfObjs, _matcher);
}
//////////////////////main application code\\\\\\\\\\\\\\\\\\\\\\\\

var $  = dojo.byId;
var $$ = dojo.query;
var tumblrData = [];
var et = [];
var dlg = [];

sim.siftr.findTumblrData = function findTumblrData(tumblogName) {
  return sim.array.get(tumblrData, "tumblog", tumblogName);
}

sim.siftr.getTumblrData = function getTumblrData(tumblogName, sourceList, start) {
  function _handleTumblr(tumblrReply) {
    var ourTumblog = sim.siftr.findTumblrData(tumblogName);

    if(!ourTumblog) {
      // if it's not already in our set, push it
      ourTumblog = {"tumblog"    : tumblogName,
                    "sourceList" : sourceList,
                    "tumblrObj"  : tumblrReply,
                    "postCount"  : tumblrReply["posts-total"],
                    "lastStart"  : start,
                    "paintStart" : start};
      tumblrData.push(ourTumblog);
    } else {
      //otherwise update existing object
      sim.array.extend(ourTumblog.tumblrObj.posts, tumblrReply.posts);
      ourTumblog["sourceList"] = sourceList;
      ourTumblog.postCount     = tumblrReply["posts-total"];
      ourTumblog.lastStart     = start;
      ourTumblog.paintStart    = start;
    }
    
    dojo.publish("JSONP_LOADED", [ourTumblog]);
  }

  var tumblrEndpoint = "http://"+tumblogName+".tumblr.com/api/read/json";
  dojo.io.script.get({
    url    : tumblrEndpoint,
    content: {type    : "photo",
              num     : 50,
              "start" : start},
    jsonp  : "callback",
    load   : _handleTumblr    
    });
};

et.push(dojo.subscribe("MORE_POSTS", function(e) {
  sim.siftr.getTumblrData(e.tumblog, e.sourceList, e.lastStart + 50)}));

sim.siftr.addPhotoFrom = function addPhotoFrom(tumblog, sourceList) {
  return function(post) {
    
    var dndData = [];

    /*  items should have the form:
    {uid       : postId + offset + "-" + tumblog,
     classes   : sourceList + " " + tumblog,
     thumbnail : photo-url-75,
     fullsize  : photo-url-1280}
    */

    function _extractPhotoData(ele) {
      var multiPhotoSlug = (ele.offset)?ele.offset:"";
      var item = {uid       : post.id + multiPhotoSlug + "-" + tumblog,
                  classes   : sourceList + " " + tumblog,
                  thumbnail : ele["photo-url-75"],
                  fullsize  : ele["photo-url-1280"]};
      dndData.push(item);
    }


    //multiple photos in one post need to be handled.
    if(post.photos.length)
      dojo.forEach(post.photos, _extractPhotoData);
    else _extractPhotoData(post);

    sim.array.get(dlg, "sourceId", "natural").dndSource.insertNodes(true, dndData);
  }  
};

sim.siftr.photoItemCreator = function photoItemCreator(item, hint) {
  var listItem = dojo.create("li", 
                             {"class" : "draggable " + item.classes,
                              "id" : item.uid});
  dojo.create("img", {"src"   : item.thumbnail,
                      "class" : "thumbnail"}, listItem);
  dojo.create("img", {"src"   : item.fullsize,
                      "class" : "fullsize"}, listItem);
  
  return {node : listItem, data: item, type: ["tumblrPhoto"]};
};

et.push(dojo.subscribe("JSONP_LOADED", function(e) {
  dojo.forEach(e.tumblrObj.posts.slice(e.paintStart), 
               sim.siftr.addPhotoFrom(e.tumblog, e.sourceList));
  e.paintStart = e.lastStart + 50;
  if(e.postCount - 50 > e.lastStart)
    dojo.publish("MORE_POSTS", [e]);

}));

dojo.ready(function ready() {
  $$(".list-container").forEach(function(node) {
    var ourSource = new dojo.dnd.AutoSource(node,
                                            {creator    : sim.siftr.photoItemCreator,
                                             accept     : ["tumblrPhoto"],
                                             copyOnly   : false,
                                             copyState  : function() {return false;}, //never copy
                                             dropParent : node.firstChild,
                                             singular   : true,

                                            });
    dlg.push({sourceId  : node.firstChild.id,
              dndSource :ourSource});
  });

  sim.siftr.getTumblrData("simloovoo", "activeList", 0);
});
