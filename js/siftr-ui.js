$$("#switchTumblr").connect("onsubmit", function(e) {
  e.preventDefault();
  var input = $("tumblrSwitch").value;
  var iTumblr = (input == "") ? "simloovoo" : input;
  var curTumblr = sim.siftr.findTumblrData(iTumblr);

  if(curTumblr == null) {
    $$(".activeList").orphan();
    sim.siftr.getTumblrData(iTumblr, "activeList", 0);
  } else {dojo.publish("JSONP_LOADED", [curTumblr]);}
});
