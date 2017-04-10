#save instance create/terminate info in dynamodb
var AWS = require('aws-sdk');  
const zlib = require('zlib');  
exports.handler = (event, context, callback) => {  
    const payload = new Buffer(event.awslogs.data, 'base64');
    zlib.gunzip(payload, (err, res) => {
        if (err) {
            return callback(err);
        }
        const parsed = JSON.parse(res.toString('utf8'));  
        for (var i=0; i<parsed['logEvents'].length; i++){
        parsed1 =parsed['logEvents'][i]['message'];
        const parsedfinal = JSON.parse(parsed1.toString('utf8'));
        console.log('Decoded final in:',parsedfinal);
    }
     console.log('Decoded final out:',parsedfinal);
     var creationDate = "";
     var userName = parsedfinal.userIdentity.userName; 
     
     if (!userName) {
         userName = 'Root'
     }
     var instancesSet = parsedfinal.responseElements.instancesSet;
     console.log("instancesSet", instancesSet);
     console.log("userName", userName);  
     var eventName = parsedfinal['eventName'];
     var eventTime = parsedfinal['eventTime'];
     var awsRegion = parsedfinal['awsRegion'];
     if(eventName === "RunInstances" || eventName === "TerminateInstances" ) {
          for (var j=0; j<instancesSet.items.length; j++){
               instanceId = instancesSet['items'][j]['instanceId'];
               instanceType  = instancesSet['items'][j]['instanceType'];
               console.log("instanceId", instanceId);         
               console.log("instanceType", instanceType);
           
           
           var table = 'instance-activity';
           
           var updateExpr =  "set awsRegion = :r, createdBy =:u, instanceType =:i, createdDate = :et";
           var exprAttrs = {
                    ":r": awsRegion,
                    ":u": userName,
                    ":i": instanceType,
                    ":et":eventTime
           }
           
           if (eventName === "TerminateInstances") {
               updateExpr = "set deletedBy =:u,  deleteDate = :et";
               exprAttrs = {
                    ":u": userName,
                    ":et":eventTime
                }
           }
           
           var params = {
                TableName:table,
                Key:{
                    "Id": instanceId
                },
                UpdateExpression: updateExpr,
                ExpressionAttributeValues: exprAttrs ,
                ReturnValues:"UPDATED_NEW"
            };
           
            var docClient = new AWS.DynamoDB.DocumentClient();
          
            console.log("Updating the item...");
            docClient.update(params, function(err, data) {
                if (err) {
                    console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
                    context.fail(err)
                    callback(null, `UnSuccessfully processed ${parsed.logEvents.length} log events.`);
                } else {
                    console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
                    console.log(data);
                    context.succeed();
                }
            });   
       }
     }
 });
};
