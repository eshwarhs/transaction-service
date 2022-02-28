'use strict';

const Ajv = require("ajv");
const AWS = require('aws-sdk');

const docClient = new AWS.DynamoDB.DocumentClient();
var { nanoid } = require("nanoid");

function validate_input(req_body) {
  const ajv = new Ajv({ allErrors: true });
  require("ajv-errors")(ajv)

  const schema = {
    type: "object",
    required: [
      "senderWalletId",
      "receiverWalletId",
      "type",
      "statuss"
    ],
    properties: {
      senderWalletId: {
        type: "string",
        description: "The unique ID of the sender",
        pattern: "^[a-zA-Z0-9-_]*$",
        maxLength: 21
      },
      receiverWalletId: {
        type: "array",
        uniqueItems: true,
        description: "Array of strings containing the recipient IDs",
        items: {
          type: "string",
          pattern: "^[a-zA-Z0-9-_]*$",
          maxLength: 21
        }
      },
      type: {
        type: "string",
        description: "The type of transaction",
        enum: [
          "mine_nft",
          "claim_nft",
          "create_nft_series",
          "transfer_nft",
          "create_wallet"
        ]
      },
      statuss: {
        type: "string",
        description: "The status of the transaction",
        enum: [
          "pending",
          "inprogress",
          "completed"
        ]
      },
      tags: {
        type: "object",
        description: "The tags associated with the transaction",
        required: [
          "stackId",
          "sliceId"
        ],
        additionalProperties: false,
        properties: {
          stackId: {
            type: "string",
            description: "The ID of the product stack",
            pattern: "^[a-zA-Z0-9-_]*$",
            maxLength: 21
          },
          sliceId: {
            type: "string",
            description: "The slice ID",
            pattern: "^[a-zA-Z0-9-_]*$",
            maxLength: 21
          }
        }
      }
    },
    additionalProperties: false,
    errorMessage: {
      required: {
        senderWalletId: "missing request parameter : senderWalletId",
        recieverWalletId: "missing request parameter : recieverWalletId",
        type: "missing request parameter : type",
        statuss: "missing request parameter : statuss",
        stackId: "missing request parameter : stackId",
        sliceId: "missing request parameter : sliceId",
      },
    }
  };
  const validate = ajv.compile(schema)
  const valid = validate(req_body)
  if (!valid) {
    console.log(validate.errors)
    return validate.errors;
  }
}

function get_sqs_body(request_body) {
  let return_body = {};
  let action_type = request_body.type;
  switch (action_type) {
    case "claim_nft":
      console.log("claim_nft");
      return_body = {
        "operation": "claim_nft",
        "app_user_hash": "", //
        "args": {
          "series_id": 5672,  //hardcoded for now
          "sender_id": request_body.senderWalletId, //sendeWalletId
          "receiver_id": request_body.receiverWalletId //receiverWalletId
        },
        "tags": {
          "app_id": "my nice app",
          "action_id": 1,
          "user_id": request_body.receiverWalletId //receiverID
        }
      };
      break;
    case "create_nft_series":
      console.log("create_nft_series");
      return_body = {
        "operation": "create_nft_series",
        "app_user_hash": "qwe1edwdddd",
        "args": {
          "creator_id": "my-account.testnet",
          "token_metadata": {
            "title": "Title of my NFT",
            "description": "Description of my NFT",
            "media": "https://ipfs.io/ipfs/link-to-the-image-file-of-the-NFT",
            "reference": "https://ipfs.io/ipfs/link-to-json-file-with-all-attributes-of-the-nft--tags-&-category",
            "copies": 20
          }
        },
        "tags": {
          "app_id": "my nice app",
          "action_id": 2,
          "user_id": "my-account.testnet"
        }
      };
      break;
    case "create_wallet":
      console.log("create_wallet");
      return_body = {
        "operation": "create_wallet",
        "tags": {
          "app_id": "sdf",
          "action_id": 3,
          "user_id": "234566"
        },
        "args": {
          "new_account_id": "minewacct.near",
          "email": "test.test.org",
          "phone": "+2541611111"
        }
      };
      break;
    case "transfer_nft":
      console.log("transfer_nft");
      return_body = {
        "id": "7890",
        "operation": "execute",
        "contract": "nft.naps.testnet",
        "method": "transfer_nft",
        "sender": "my-account8246.testnet",
        "deposit": "0.01",
        "args": {
          "series_id": "37",
          "token_owner_id": "my-account.testnet",
          "token_metadata": {
            "title": null,
            "description": null,
            "media": "https://ipfs.io/ipfs/bafybeicvjdjdxhu6oglore3dw26pclogws2adk7gtmsllje6siinqq4uzy",
            "media_hash": null,
            "copies": null,
            "issued_at": null,
            "expires_at": null,
            "starts_at": null,
            "updated_at": null,
            "extra": null,
            "reference": "https://ipfs.io/ipfs/bafybeigo6bjoq6t5dl4fqgvwosplvbkbu5ri6wo3cmkxmypi4sj2j2ae54",
            "reference_hash": null
          }
        },
        "tags": {
          "app_id": "my nice app",
          "action_id": 4,
          "user_id": "my-account8246.testnet"
        }
      };
      break;
    case "mine_nft":
      console.log("mine_nft");
      return_body = {
        "id": "7890",
        "operation": "execute",
        "contract": "nft.naps.testnet",
        "method": "mine_nft",
        "tags": {
          "app_id": "my nice app",
          "action_id": 5,
          "user_id": "my-account8246.testnet"
        }
      }
      break;
    default:
      break;
  }
  return JSON.stringify(return_body);
}

module.exports.createTransaction = async (event) => {
  let token = '';
  const queue_url = "https://sqs.us-east-1.amazonaws.com/343989648581/test.fifo";
  if (event.headers.Authorization) {
    token = event.headers.Authorization.split(' ')[1];
    if (token != "testtoken") {  //hardcoded since authorizer lamba will validate it
      return {
        statusCode: 401,
        body: JSON.stringify(
          {
            errors: [
              {
                message: 'You are not authorized to perform this operation'
              }
            ]
          },
          null,
          2
        ),
      };
    }
  }
  else {
    return {
      statusCode: 401,
      body: JSON.stringify(
        {
          errors: [
            {
              message: 'You are not authenticated'
            }
          ]
        },
        null,
        2
      ),
    };
  }

  let request_body = JSON.parse(event.body);
  let response = validate_input(request_body);
  let errors = [];
  let finalErrors = [];
  let setErr = new Set();

  if (response != null) {
    errors = response.map(function (item) {
      let pathName = item.instancePath.split('/')
      let field = pathName[1]
      let message = `${field} ${item.message}`
      if (item.keyword == 'maxLength' || item.keyword == 'pattern' || item.keyword == 'enum') {
        return message
      }
      return item.message;
    });

    for (var i = 0; i < errors.length; i++) {
      setErr.add(errors[i]);
    }

    setErr.forEach(
      key => finalErrors.push({
        message: key,
      })
    );

    return {
      statusCode: 400,
      body: JSON.stringify(
        {
          "errors": finalErrors
        },
        null,
        2
      ),
    };
  }
  else {
    try {
      let ts = new Date();
      let trxId = nanoid();
      let record = {
        "transactionId": trxId,
        "userId": token,  //decode bearer token to get userId
        "senderWalletId": request_body.senderWalletId,
        "receiverWalletId": request_body.receiverWalletId,
        "transactionValue": "0.0025", //hardcoded. will be fetched from blockchain
        "transactionItemId": nanoid(),
        "transactionHash": "", //will be fetched from blockchain
        "statuss": request_body.statuss,
        "type": request_body.type,
        "created": ts.toISOString(),
        "updated": ts.toISOString(),
        "tags": request_body.tags,
        "blockchainStatus": "",
        "gasFee": "0.0000025"  //hardcoding for now
      }
      let params = {
        TableName: 'transactions',
        Item: record
      };
      
      let result = await docClient.put(params).promise();

      var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
      console.log("type ---"+get_sqs_body(request_body))
      let params1 = {
        MessageBody: get_sqs_body(request_body),
        MessageDeduplicationId: trxId,
        MessageGroupId: request_body.type,
        QueueUrl: queue_url
      };

      sqs.sendMessage(params1, function (err, data) {
        if (err) {
          console.log("Error", err);
        } else {
          console.log("Success", data.MessageId);
        }
      });

      return {
        statusCode: 201,
        body: JSON.stringify(
          record,
          null,
          2
        ),
      };
    }
    catch (error) {
      console.log(error);
      return {
        statusCode: 400,
        body: JSON.stringify(
          {
            errors: [
              {
                "message": "Server error!"
              }
            ]
          },
          null,
          2
        ),
      };
    }
  }
};
