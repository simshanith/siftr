$$("#switchTumblr").connect("onsubmit", function(e) {
  e.preventDefault();
  var input = $("tumblrSwitch").value;
  var iTumblr = (input == "") ? "simloovoo" : input;
  var cacheTumblr = sim.siftr.findTumblrData(iTumblr);

  //TODO: make this not a hack
  var loadedTumblr = $("natural").firstChild.id.split("-").pop() || "";

  if(iTumblr == loadedTumblr)
    dojo.publish("JSONP_LOADED", [cacheTumblr]);
  else  {
    sim.array.get(dlg, "sourceId", "natural").dndSource.selectAll().deleteSelectedNodes();

    if(cacheTumblr == null)
      sim.siftr.getTumblrData(iTumblr, "activeList", 0);
    else {
      dojo.publish("JSONP_LOADED",
                   [dojo.mixin(cacheTumblr,
                               {paintStart: 0})]);}

  }
  
});
