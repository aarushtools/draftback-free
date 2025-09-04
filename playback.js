var match = location.search.match(/docId=(.*)/)
var docId = match[1]

document.title = "Draftback playback for " + docId

var populateRevisionsStartingAtIndex = function(index, cb) {
  chrome.runtime.sendMessage({msg: 'get-revisions', docId: docId, offset: index, limit: 50}, function(response) {
    for (var i = 0; i < response.length; i++) {
      Revisions[i + index] = response[i]
    }
    
    $("#page").removeClass("loading")
    cb(index)
  })
}

var step = function(n) {
  var current = $("#revisionSlider").slider("option", "value")
  $("#revisionSlider").slider("option", "value", current + n)
}

var Extracts = []
  
var extracting = false

var record_for_extraction = function() {
  extracting = true
}

var playTimeout = null
var playpause = null
var realtime = false
var speedup_factor = 1
var PLAY_SPEED = 60

var fetchingAhead = false

var goReal = function() {
	realtime = true;
}

var goTick = function() {
	resetRealtime();
	realtime = false;
}

var resetRealtime = function() {
	if (realtime) {
		clearTimeout(playTimeout);
		if (playpause)
			play();
	};
};

var goToSliderVal = function(i) {
  $("#revisionSlider").slider("option", "value", i)
  if (Revisions[i + 1]) {
    var timeout = Revisions[i + 1].timestamp - Revisions[i].timestamp
  } else {
    var timeout = PLAY_SPEED
  }
  
  return Math.max(timeout, PLAY_SPEED)
}

var play = function() {
  var currentRevision = $("#revisionSlider").slider("option", "value")
  if (!Revisions[currentRevision + 100] && !fetchingAhead) {
    fetchingAhead = true
    populateRevisionsStartingAtIndex(currentRevision + 100, function() {
      fetchingAhead = false
    })
  }
  if (currentRevision < $("#revisionSlider").slider("option", "max")) {
    if (Revisions[currentRevision + 1]) {
      var timeout = goToSliderVal(currentRevision + 1)
      playTimeout = setTimeout(function() { play() }, realtime ? (timeout / speedup_factor) : PLAY_SPEED / speedup_factor);
    } else {
      pause()
      $("#page").addClass("loading")
      populateRevisionsStartingAtIndex(currentRevision + 1, function(index) {
        var timeout = goToSliderVal(currentRevision + 1)
        playTimeout = setTimeout(function() { play() }, realtime ? (timeout / speedup_factor) : PLAY_SPEED / speedup_factor);
      })
    }
  }
  playpause = true;
  $("#revisionSlider").slider("disable");
}

var pause = function() {
	clearTimeout(playTimeout);
	playpause = false;
	$("#revisionSlider").slider("enable");
}

var playKey = function(e) {
  if (e.keyCode == 32) {
		e.preventDefault();
		$("#playpause_button").click()
	} else if (e.keyCode == 37) {
		e.preventDefault();
		$("#leftstep").click()
	} else if (e.keyCode == 39) {
		e.preventDefault();
		$("#rightstep").click()
	}
}

var get_selection = function() {
  var text = window.getSelection()
  if (text.type == "None") return
  var objRange = text.getRangeAt(0)
  var objClone = objRange.cloneContents()
  var objDiv = document.createElement('div')
  objDiv.appendChild(objClone)
  return objDiv.innerHTML
}

var setDocContentFromWindow = function() {
  var draggerTopLeftCorner = {left: $("#dragger").offset().left, top: $("#dragger").offset().top}
  var draggerBottomLeftCorner = {left: $("#dragger").offset().left, top: $("#dragger").offset().top + $("#dragger").height()}

  var from = $(".progress p").closestToOffset(draggerTopLeftCorner)
  var to = $(".progress p").closestToOffset(draggerBottomLeftCorner)          

  var start = $(from).index()
  var diff = $(to).index() - $(from).index()
  var content = $(".progress p:eq(" + start + ")").add($(".progress p:gt(" + start + ")").filter("p:lt(" + diff + ")")).clone()

  $("#doc .content").html(content)
}

var updateExtractCount = function() {
  $("#extract_count").text(Extracts.length)
  Extracts.length == 1 ? $("#extract_count_s").hide() : $("#extract_count_s").show()
}

var setDocContent = function(i) {
  if (extracting) {
    var $dragger = $("#dragger")
    var old_left = $dragger.offset().left
    var old_top = $dragger.offset().top
    
    $dragger.appendTo($("body"))
    $dragger.css("left", old_left)
    $dragger.css("top", old_top)
    
    $("#doc").html(Revisions[i].content)
    
    $(".progress .window").replaceWith($(".progress .window").html())
    
    setDocContentFromWindow()
    Extracts.push({timestamp: Revisions[$("#revisionSlider").slider("option", "value")].timestamp, content: $("#doc .content").html()})
    updateExtractCount()
  } else {
    $("#doc").html(Revisions[i].content)
    if(Revisions[i] && Revisions[i].tab) {
      $("#tab_name").html(Revisions[i].tab)
      $("#tabs").show();
    } else {
      $("#tabs").hide();
    }
    $("#timestamp span").html(new Date(Revisions[i].timestamp).toLocaleString('en-US', { weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }))
    $("#stats_link").show()
  }
}

$(document).ready(function() {
  (function($) {
    $.fn.closestToOffset = function(offset) {
        var el = null, elOffset, x = offset.left, y = offset.top, distance, dx, dy, minDistance;
        this.each(function() {
            elOffset = $(this).offset();

            if (
            (x >= elOffset.left)  && (x <= elOffset.right) &&
            (y >= elOffset.top)   && (y <= elOffset.bottom)
            ) {
                el = $(this);
                return false;
            }

            var offsets = [[elOffset.left, elOffset.top], [elOffset.right, elOffset.top], [elOffset.left, elOffset.bottom], [elOffset.right, elOffset.bottom]];
            for (off in offsets) {
                dx = offsets[off][0] - x;
                dy = offsets[off][1] - y;
                distance = Math.sqrt((dx*dx) + (dy*dy));
                if (minDistance === undefined || distance < minDistance) {
                    minDistance = distance;
                    el = $(this);
                }
            }
        });
        return el;
    }
  })(jQuery);
  
  $("#extract_embed_code").click(function() {
    $(this).select();
  })
  
  $("#playpause_button").click(function() {
    clearTimeout(playTimeout)
    if (playpause) {
      $(this).removeClass('playing')
      pause()
    } else {
      play()
      $(this).addClass('playing')
    }
    return false
  })
  
	$("#speed_control").slider({
		min: 0.1,
		max: 6.1,
		step: 0.1,
		value: 1,
		orientation: "vertical",
		slide: function(event, ui) { speedup_factor = ui.value; $("#speedup").text(parseInt(ui.value * 10) / 10 + "x") }
	});
  
	$("#realtime").click(function() {
		if ($(this).attr("checked")) {
			goReal();
			$(this).attr("checked", "checked");
		} else {
			goTick();
			$(this).removeAttr("checked");
		};
	});
  
  $("#leftstep").click(function() {
    if (playpause) return
    var currentRevision = $("#revisionSlider").slider("option", "value")
    if (currentRevision > 0) {
      if (extracting) {
        $("#revisionSlider").slider("option", "value", currentRevision - 1)
        Extracts.pop()
        Extracts.pop()
        updateExtractCount()
      } else {
        $("#revisionSlider").slider("option", "value", currentRevision - 1)
      }
    }
    return false
  });
  
  $("#rightstep").click(function(e) {
    var currentRevision = $("#revisionSlider").slider("option", "value")
    if (currentRevision < $("#revisionSlider").slider("option", "max")) {
      $("#revisionSlider").slider("option", "value", currentRevision + 1)
    }
    return false
  });
  
  populateRevisionsStartingAtIndex(0, function(index) {
    $("#revisionSlider").slider({
      min: 0,
      max: Revisions.length - 1,
      value: 0,
      slide: function(event, ui) {
        if (Revisions[ui.value]) {
          setDocContent(ui.value)
        }
      },
      change: function(event, ui) {
        if (Revisions[ui.value]) {
          setDocContent(ui.value)
        } else {
          $("#page").addClass("loading")
        
          populateRevisionsStartingAtIndex(ui.value, function(index) {
            setDocContent(index)
          })
        }
      }
    })
    $("#playpause_button").click()
  });
  
  $('body').on('keydown', function(event) {
    playKey(event)
  })
  
  $('#show_stats').click(function() {
    chrome.runtime.sendMessage({msg: 'stats', docId: docId}, function(response) {
    })
    return false
  })
  
  $("#doc").on("mouseover", ".window", function() {
    if (!$("#dragger").length) {
      if (playpause) {
        $("#playpause_button").click()
      }
      $("#extract").show()
      $("<div id='dragger'>").appendTo(".progress")
      $("#dragger").css("height", $(".window").css("height"))
      $("#dragger").css("width", $(".window").css("width"))
      $("#dragger").css("background-color", "red")
      $("#dragger").css("cursor", "move")
      $("#dragger").css("position", "absolute")
      $("#dragger").css("left", $(".window").offset().left - 25)
      $("#dragger").css("top", $(".window").offset().top - 46)
      $("#dragger").css("opacity", 0.1)
      $("#dragger").draggable({axis: 'y', drag: function() {
        setDocContentFromWindow()
      }})
      $("#dragger").resizable({ handles: "n, s", resize: function() {
        setDocContentFromWindow()
      }});
    }
    $(".progress .window").replaceWith($(".progress .window").html())      
  })
})