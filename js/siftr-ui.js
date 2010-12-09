/*TODO: switch to HTML5 label input */
var labeledInput = new goog.ui.LabelInput();
labeledInput.decorate($$("#switchTumblr")[0]);

sim.siftr.switchTumblr = function switchTumblr(e) {
  input = labeledInput.getValue();
  var iTumblr = (input == "")? "simloovoo":input;
  var findTumblr = goog.array.find(tumblrData, function(ele) {return ele.tumblog == iTumblr});
  goog.array.forEach($$(".activeList"), $.removeNode);
  
            if(findTumblr == null) {
              sim.siftr.getTumblrData(iTumblr, "activeList", 0);
            }else{
              et.dispatchEvent({type: "JSONP_LOADED",
                                "tumblog"    : findTumblr.tumblog,
                                "sourceList" : findTumblr.sourceList,
                                "postCount"  : findTumblr.postCount,
                                "tumblrObj"  : findTumblr.tumblrObj,
                                "lastStart"  : findTumblr.lastStart,
                                "paintStart" : 0});}
};

goog.events.listen($$("#tumblrSwitch")[0], goog.events.EventType.CLICK, sim.siftr.switchTumblr);
