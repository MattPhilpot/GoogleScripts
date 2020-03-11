//entry point
function deleteThreadsInBatch() {
  //---------- parameters for this script
  
  //high priority labels in the beginning, low priority in the end
  //for example: var labels = ['Suspicious Logins', 'Confluence', 'Opsgenie', 'Lever', 'Algolia', 'Crashlytics', 'Removed Labs', 'Travis'];
  var labels = [''];
  
  //how many batches per label? Each batch is up to 500 emails (max defined by google)
  var initialRunsPer = 4; //4 = remove 2000 emails at a time per label
  
  //How long to preserve emails for?
  var delayDays = 2; // will only impact emails more than 2days (48h) old
  
  //--------- start of the script, do not touch
  var runsLeft = labels.length * initialRunsPer;
  var start = new Date();
  var preLoopRunsLeft = runsLeft;
  Logger.log('Max batch runs specified at [' + runsLeft +']');   
  
  //start of the loop
  for (i = 0; i < labels.length && runsLeft > 0; ++i) {
    if (isTimeUp(start)) {
      Logger.log("Time up. Exiting from script");
      runsLeft = 0;
      break;
    }
    
    //decrements the total runs allowed. Once that counter hits zero, it signals the end of the script
    runsLeft -= deleteThreadsLittleByLittle(labels[i], initialRunsPer, start, delayDays);  
    Logger.log('Max batch runs decremented to [' + runsLeft +']');   
    
    //called once we get to the end of the loop. It will determine whether or not to start over
    //and if to adjust the runsLeft variable. This is based on what runsLeft was when the loop started
    if (i == (labels.length - 1)) {
      Logger.log('Surplus batch runs found [' + runsLeft +']');   
      //if we make it to the end, start over with the remaining runs
      i = 0;
      initialRunsPer = Math.max(1, Math.floor(runsLeft / labels.length));
      if (preLoopRunsLeft == runsLeft) {
        --runsLeft; //just in case, to prevent loops  
      }
      preLoopRunsLeft = runsLeft;
      
      Logger.log('Starting over with [' + runsLeft +'] max runs left and [' + initialRunsPer + '] runs per label');   
    }
  }
  
  Logger.log("Script Finished! :D");
}

//utility function to see if a set amount of time has passed since the start of the script
function isTimeUp(start) {
  var now = new Date();
  return (now.getTime() - start.getTime()) > 1200000;   // 20 minutes
}
  
//the bulk of the script. This actually executes batches for moving threads to the trash.
//NOTE - you cannot actually delete emails, only move them to trash
function deleteThreadsLittleByLittle (name, maxCount, startTime, delayDays) {
  Logger.log('Starting [' + maxCount +'] batches for [' + name + ']');   
  Logger.log('Fetching Label [' + name +']'); 
  
  var maxDate = new Date();
  maxDate.setDate(maxDate.getDate()-delayDays); 
  
  var label = GmailApp.getUserLabelByName(name);
  Logger.log('Retrieved Label [' + name + ']'); 
  var threads = label.getThreads().filter(each => each.getLastMessageDate() < maxDate);
  Logger.log('Excluding threads from the last [' + delayDays + '] days');
  var count = 0;
  var timeUp = isTimeUp(startTime);
  while (threads.length > 0 && count < maxCount && !timeUp) {
    ++count;    
    Logger.log('Batch [' + count + '] of [' + maxCount + '] contains [' + threads.length + '] threads'); 
    var mod = threads.length % 100;
    var index = 0;
    var start = 0;
    var end = 0;
    do {
      timeUp = isTimeUp(startTime);
      if (timeUp) {
        Logger.log("Time up. Exiting from batch");
        break;
      }
      
      start = index * 100;
      end = Math.min(((index+1) * 100) - 1, threads.length - 1);
      Logger.log('Executing for threads [' + start + '] to [' + end + ']'); 
      GmailApp.moveThreadsToTrash(threads.slice(start, end));
      ++index;
    } while (end < threads.length - 1);
    Logger.log('Deleted [' + threads.length + '] threads from batch [' + count + '] of [' + maxCount + ']'); 
    threads = label.getThreads();
  }

  Logger.log('Finished all [' + maxCount +'] batches for [' + name + ']');   
  return count;
}
  