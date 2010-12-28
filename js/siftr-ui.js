sim.siftr.switchTumblr = function switchTumblr(e) {
  e.preventDefault();
  input = $.forms.getValue($$1("#tumblrSwitch"));
  var iTumblr = (input == "")? "simloovoo":input;
  var findTumblr = goog.array.find(tumblrData, function(ele) {return ele.tumblog == iTumblr});
  goog.array.forEach($$(".activeList"), $.removeNode);
  
            if(findTumblr == null) {
              sim.siftr.getTumblrData(iTumblr, "activeList", 0);
            }else{
              et.dispatchEvent(sim.extend(findTumblr, {type : "JSONP_LOADED",
                                                       paintStart : 0}));}
};

goog.events.listen($$1("#switchTumblr"), goog.events.EventType.SUBMIT, sim.siftr.switchTumblr);

