var Sessions = []
var AuthorMap = {}

var match = location.search.match(/docId=(.*)/)
var docId = match[1]

function getMaxOfArray(numArray) {
  return Math.max.apply(null, numArray);
}

function getMinOfArray(numArray) {
  return Math.min.apply(null, numArray);
}

var msToTime = function(duration) {
  var milliseconds = parseInt((duration%1000)/100)
    , seconds = parseInt((duration/1000)%60)
    , minutes = parseInt((duration/(1000*60))%60)
    , hours = parseInt((duration/(1000*60*60))%24);

  hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  return hours + ":" + minutes + ":" + seconds + 's';
}

chrome.runtime.sendMessage({msg: 'get-stats-data', docId: docId}, function(response) {
  Sessions = response.sessions
  AuthorMap = response.authorMap
  Timeline = response.timeline && response.timeline.timeline
  
  $(function() {
    $("#writing_session_count").text(Sessions.length)
    var totalDuration = 0
    $.each(Sessions, function(i, session) {
      var startDate = new Date(session.start_timestamp).toLocaleString('en-US', { weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
      var endDate = new Date(session.end_timestamp).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric' })
      var $tr = $('<tr>', {html: '<td>' + startDate + ' - '  + endDate + '</td> <td>' + msToTime(session.duration) + '</td> <td>' + ((AuthorMap && AuthorMap[session.uid]) || session.uid) + '</td> <td>' + session.revisions_count + '</td>'})
      $tr.appendTo($('#writing_sessions'))
      totalDuration += session.duration
    })
    
    $("#total_duration").text(msToTime(totalDuration))
    
    if (!Timeline) {
      return
    } else {
      $("#graphs").show()
    }
    
    var timeline_y = Math.floor(getMaxOfArray($.map(Timeline, function(o, i) { return o.character_count })) / 2)
    var max_index = getMaxOfArray($.map(Timeline, function(o, i) { return o.start_i }))

    var timeline_data = $.map(Timeline, function(o, i) { return {x: o.timestamp, y: timeline_y} })
    var character_counts = $.map(Timeline, function(o, i) { return {x: o.timestamp, y: o.character_count} })
    var positions = $.map(Timeline, function(o, i) { return {x: o.timestamp, y: o.start_i * -1} })
    
    var max_t = getMaxOfArray($.map(Timeline, function(o, i) { return o.timestamp }))
    var min_t = getMinOfArray($.map(Timeline, function(o, i) { return o.timestamp }))
    var tick_size_in_seconds = (max_t - min_t) / 6

    var seriesData = [ timeline_data, character_counts ];

    var timeline = new Rickshaw.Graph( {
      element: document.getElementById("timeline"),
      renderer: 'multi',
      width: 900,
      height: 50,
      dotSize: 2,
      series: [
        {
          name: 'activity',
          data: seriesData.shift(),
          color: 'rgba(255, 0, 0, 0.2)',
          renderer: 'scatterplot'
        }, {
          name: 'document length',
          data: seriesData.shift(),
          color: 'rgba(82, 196, 255, 0.207843)',
          renderer: 'area'
        }
      ]
    } );

    timeline.render();

    var detail = new Rickshaw.Graph.HoverDetail({
      graph: timeline,
      xFormatter: function(x) {
        return new Date(x).toLocaleString();
      }
    });

    var legend = new Rickshaw.Graph.Legend({
      graph: timeline,
      element: document.querySelector('#timeline_legend')
    });

    var unit = {}
    unit.formatTime = function(d) {
      var str = new Date(d / 1000).toLocaleString('en-US', { weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric' });
      return str.replace(':00', '')
    };
    unit.formatter = function(d) { return this.formatTime(d) };
    unit.name = "meme";
    unit.seconds = tick_size_in_seconds;
    var xAxis = new Rickshaw.Graph.Axis.Time({
      graph: timeline,
      ticksTreatment: 'glow',
      timeUnit: unit,
      timeFixture: new Rickshaw.Fixtures.Time.Local()
    });

    xAxis.render();

    // Position graph:
    var seriesData = [ positions ];
    var MAX_INDEX = max_index;

    var positions = new Rickshaw.Graph( {
      element: document.getElementById("positions"),
      renderer: 'scatterplot',
      width: 900,
      height: 350,
      dotSize: 2,
      min: 'auto',
      series: [
        {
          name: 'position in doc',
          data: seriesData.shift(),
          color: 'rgba(131, 131, 131, 0.2)',
        }
      ]
    } );

    positions.render();

    var legend = new Rickshaw.Graph.Legend({
      graph: positions,
      element: document.querySelector('#position_legend')
    });

    var newXAxis = new Rickshaw.Graph.Axis.Time({
      graph: positions,
      ticksTreatment: 'glow',
      timeUnit: unit,
      timeFixture: new Rickshaw.Fixtures.Time.Local()
    });

    newXAxis.render();
  })
})