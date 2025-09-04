var Revisions = []

var match = location.search.match(/docId=(.*)/)
var docId = match[1]

chrome.runtime.sendMessage({msg: 'get-last-revision', docId: docId}, function(response) {
  Revisions[response.seq] = {timestamp: response.timestamp, content: response.rendered}
})