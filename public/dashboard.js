const getLists = function() {
  fetch("/viewList")
    .then(function(res) {
      return res.text();
    })
    .then(function(out) {
      document.getElementById("listBlock").innerHTML = out;
    });
};

window.onload = getLists;
