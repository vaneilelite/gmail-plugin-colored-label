var gmail, userEmail;
var _3hrs, _12hrs, _24hrs;
var _3LabelName = '3+ hrs',
    _12LabelName = '12+ hrs',
    _24LabelName = '24+ hrs';

function refresh(f) {
  if( (/in/.test(document.readyState)) || (typeof Gmail === undefined) ) {
    setTimeout('refresh(' + f + ')', 100);
  } else {
    f();
  }
}

var saveItem = function(id, value) {
  var newId = 'GP_' + id;
  localStorage.setItem(newId, value);
};

var deleteItem = function(id) {
  var newId = 'GP_' + id;
  localStorage.removeItem(newId);
};

var loadItem = function(id) {
  var newId = 'GP_' + id;
  return localStorage.getItem(newId);
};

var main = function(){


  gmail = new Gmail();

  userEmail = gmail.get.user_email();


  
  // gmail.observe.on("poll", function(url, body, data, xhr) {
    var currentPage =  gmail.get.current_page();
    // console.log ('current page:',currentPage);
    if (currentPage == 'inbox')
    {
      var mails = gmail.get.visible_emails();
      applyLabels(mails);
    }  
  // })

  gmail.observe.on('delete_label', function(id, url, body, xhr){
    console.log('label deleted:', id, 'url:', url , 'body', body);
  });

  gmail.observe.on("delete", function(id, url, body, xhr) {
    id.forEach(function(id){
      deleteItem(id);
    });
  })

  gmail.observe.on("send_message", function(url, body, data, xhr) {
    if (data.subject.indexOf('Re:') != -1 && data.to[0] != null && data.to[0] != undefined && data.to[0] != userEmail) {
      var emailData = gmail.get.selected_emails_data();
      if (emailData != undefined && emailData.length >0)
      {
        // console.log('remove label. emailData:', emailData[0]);
        removeLabel(emailData[0].first_email);
      }
    }
  });

  //coloring labels
  gmail.observe.on('load', function(id, url, body, xhr){
    applyColors();
  });

  gmail.observe.on("compose", function(compose, type) {

    // type can be compose, reply or forward
    
    var label24Count = get24LabelsCount();
    if ((type == 'compose') && (label24Count > 0)) {
      alert('You have ' + label24Count + ' 24+ Labeled emails. You\'re not able to send email before reply them.');
      var dialog = compose.$el.parents('div[role="dialog"]');
      console.log('compose dialog body:', dialog);
      dialog.hide();
    }
  });

}

function applyColors()
{
  // console.log('applying colors');
  $('div[title="3+ hrs"]').attr('style', function(i, style) {
    return 'background-color:#00ff00 !important;';
  });
    
  $('div[title="12+ hrs"]').attr('style', function(i, style)
  {
    return 'background-color:#ffff00 !important;';
  });

  $('div[title="24+ hrs"]').attr('style', function(i, style)
  {
    return 'background-color:#ff0000 !important;';
  });

  setTimeout(function(){
    applyColors();
  }, 5*1000);
}



function parseDate(dateString)
{
  var d = dateString.split(' at ')[0],
      ts = dateString.split(' at ')[1],
      a = ts.split(' ')[1],
      h = parseInt(ts.split(' ')[0].split(':')[0]) + (a == "AM" ? 0 : 12),
      m = ts.split(' ')[0].split(':')[1];
  var date = new Date(d);

  date.setHours(h);
  date.setMinutes(m);
  return date;
}

function applyLabels(mails)
{

  mails.forEach(function(mail){

    //filter out

    var now = Date.now(),
        timestamp = parseDate(mail.time).getTime(),
        timeDiffInHours = (now - parseDate(mail.time).getTime()) / 1000/60/60;

    if (timeDiffInHours < 3)
      return;
    else if (timeDiffInHours < 12 && ($.inArray(_3LabelName, mail.labels) > -1))
      return;
    else if (timeDiffInHours < 24 && ($.inArray(_12LabelName, mail.labels) > -1))
      return;
    else if (timeDiffInHours >=24 && ($.inArray(_24LabelName, mail.labels) > -1))
      return;
    
    gmail.get.email_data_async(mail.id, function(data){
      var lastEmail = data.threads[data.last_email];
      // console.log('last email data', lastEmail.subject, lastEmail.from, lastEmail.datetime);

      if (lastEmail.from_email != userEmail) {
        var timeDiffInHours = (now - lastEmail.timestamp) /1000/60/60;
        var detail = {
          action: 'apply_label',
          timestamp: lastEmail.timestamp,
          threadId: data.thread_id,
        };

        if (timeDiffInHours >= 24) {
          detail.labelName = _24LabelName;
        } else if( timeDiffInHours >= 12) {
          detail.labelName = _12LabelName;
        } else if( timeDiffInHours >= 3) {
          detail.labelName = _3LabelName;
        }

        var event = new CustomEvent("LB+GP",{
          detail:detail
        });
        document.dispatchEvent(event);
      }
    });
  });
}

function removeLabel(id) {
  var detail = {
    action:'remove_label',
    threadId: id
  };

  var event = new CustomEvent("LB+GP",{
    detail:detail,
  });
  document.dispatchEvent(event);
}

function get24LabelsCount(){

  var count = 0;
  for ( var i = 0, len = localStorage.length; i < len; ++i ) {
    var key = localStorage.key(i);

    if (key.startsWith('GP_')) {
      var detail = localStorage.getItem(key);
      if (detail != undefined && detail != null && 'undefined' != typeof detail) {
        detail = JSON.parse(detail)
        if (detail.labelName == _24LabelName)
          count++;
      }
    }
    
  }
  return count;
}

refresh(main);
