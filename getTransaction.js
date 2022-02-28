'use strict';

const AWS = require('aws-sdk');

const docClient = new AWS.DynamoDB.DocumentClient();

const {
    v1: uuidv1,
    v4: uuidv4,
} = require('uuid');

module.exports.getTransaction = async (event) => {
    let token = '';
    let table = "transactions";
    let serverError = {
        errors: [
            {
                message: 'Server error!'
            }
        ]
    };
    if (event.headers.Authorization) {
        token = event.headers.Authorization.split(' ')[1];
        if (token != "testtoken") {
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

    if (event.queryStringParameters && event.queryStringParameters.statuss != null) {
        let userId = event.pathParameters.userId;
        let statuss = event.queryStringParameters.statuss;

        let params = {
            TableName : "transactions",
            FilterExpression : 'userId = :userId AND statuss = :statuss',
            ExpressionAttributeValues: {
                ":userId": userId,
                ":statuss": statuss
            }
        };
        try {
            let result = await docClient.scan(params).promise();
            if (result.Items.length > 0) {
                return {
                    statusCode: 200,
                    body: JSON.stringify(
                        result.Items[0],
                        null,
                        2
                    ),
                };
            }
            else {
                return {
                    statusCode: 404,
                    body: JSON.stringify(
                        {
                            errors: [
                                {
                                    message: 'Invalid user ID or does not exist'
                                }
                            ]
                        },
                        null,
                        2
                    ),
                };
            }
        }
        catch (error) {
            console.log(error);
            return {
                statusCode: 400,
                body: JSON.stringify(
                    serverError,
                    null,
                    2
                ),
            };
        }        
    }
    else if (event.queryStringParameters && event.queryStringParameters.user) {
        let userId = event.queryStringParameters.user;
        let params = {
            TableName: table,
            FilterExpression: 'userId = :userId',
            ExpressionAttributeValues: { ':userId': userId }
        };
        try {
            let result = await docClient.scan(params).promise();
            if (result.Items.length > 0) {
                return {
                    statusCode: 200,
                    body: JSON.stringify(
                        result.Items,
                        null,
                        2
                    ),
                };
            }
            else {
                return {
                    statusCode: 400,
                    body: JSON.stringify(
                        {
                            errors: [
                                {
                                    message: 'Invalid user ID or does not exist'
                                }
                            ]
                        },
                        null,
                        2
                    ),
                };
            }
        }
        catch (error) {
            console.log(error);
            return {
                statusCode: 400,
                body: JSON.stringify(
                    serverError,
                    null,
                    2
                ),
            };
        }
    }
    else if (event.pathParameters && event.pathParameters.transactionId != null) {
        let trxId = event.pathParameters.transactionId;
        if(trxId.length>21 || !trxId.match("^[a-zA-Z0-9-_]*$"))
        {
            console.log("Invalid TransactionId");
            return {
                statusCode: 400,
                body: JSON.stringify(
                    {
                        errors: [
                            {
                                message: 'Invalid TransactionId'
                            }
                        ]
                    },
                    null,
                    2
                ),
            };
        }
        let params = {
            TableName: table,
            FilterExpression: 'transactionId = :transactionId',
            ExpressionAttributeValues: { ':transactionId': trxId }
        };
        try {
            let result = await docClient.scan(params).promise();
            return {
                statusCode: 200,
                body: JSON.stringify(
                    result.Items[0],
                    null,
                    2
                ),
            };
        } catch (error) {
            return {
                statusCode: 400,
                body: JSON.stringify(
                    serverError,
                    null,
                    2
                ),
            };
        }
    }
    else {
        let params = {
            TableName: table,
        };
        try {
            let result = await docClient.scan(params).promise();
            return {
                statusCode: 200,
                body: JSON.stringify(
                    result.Items,
                    null,
                    2
                ),
            };
        } catch (error) {
            console.log(error);
            return {
                statusCode: 400,
                body: JSON.stringify(
                    serverError,
                    null,
                    2
                ),
            };
        }
    }
};
