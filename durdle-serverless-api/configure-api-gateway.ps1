$API_ID = "qcfd5p4514"
$REGION = "eu-west-2"
$ACCOUNT_ID = "771551874768"

# Function to create method, integration, and permission
function Add-APIMethod {
    param(
        [string]$ResourceId,
        [string]$HttpMethod,
        [string]$LambdaFunction,
        [string]$Path
    )

    Write-Host "Creating $HttpMethod method for $Path"

    # Create method
    aws apigateway put-method `
        --rest-api-id $API_ID `
        --resource-id $ResourceId `
        --http-method $HttpMethod `
        --authorization-type NONE `
        --region $REGION

    # Create integration
    aws apigateway put-integration `
        --rest-api-id $API_ID `
        --resource-id $ResourceId `
        --http-method $HttpMethod `
        --type AWS_PROXY `
        --integration-http-method POST `
        --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${LambdaFunction}/invocations" `
        --region $REGION

    # Add Lambda permission
    $statementId = "apigw-${LambdaFunction}-${HttpMethod}-${ResourceId}"
    aws lambda add-permission `
        --function-name $LambdaFunction `
        --statement-id $statementId `
        --action lambda:InvokeFunction `
        --principal apigateway.amazonaws.com `
        --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*/${HttpMethod}${Path}" `
        --region $REGION 2>$null
}

Write-Host "Configuring API Gateway methods and integrations..."

# /admin/pricing/vehicles (GET, POST)
Add-APIMethod -ResourceId "5bym2q" -HttpMethod "GET" -LambdaFunction "pricing-manager-dev" -Path "/admin/pricing/vehicles"
Add-APIMethod -ResourceId "5bym2q" -HttpMethod "POST" -LambdaFunction "pricing-manager-dev" -Path "/admin/pricing/vehicles"

# /admin/pricing/vehicles/{vehicleId} (GET, PUT, DELETE)
Add-APIMethod -ResourceId "d5s1t6" -HttpMethod "GET" -LambdaFunction "pricing-manager-dev" -Path "/admin/pricing/vehicles/*"
Add-APIMethod -ResourceId "d5s1t6" -HttpMethod "PUT" -LambdaFunction "pricing-manager-dev" -Path "/admin/pricing/vehicles/*"
Add-APIMethod -ResourceId "d5s1t6" -HttpMethod "DELETE" -LambdaFunction "pricing-manager-dev" -Path "/admin/pricing/vehicles/*"

# /admin/pricing/fixed-routes (GET, POST)
Add-APIMethod -ResourceId "amjhqj" -HttpMethod "GET" -LambdaFunction "fixed-routes-manager-dev" -Path "/admin/pricing/fixed-routes"
Add-APIMethod -ResourceId "amjhqj" -HttpMethod "POST" -LambdaFunction "fixed-routes-manager-dev" -Path "/admin/pricing/fixed-routes"

# /admin/pricing/fixed-routes/{routeId} (GET, PUT, DELETE)
Add-APIMethod -ResourceId "ysrg44" -HttpMethod "GET" -LambdaFunction "fixed-routes-manager-dev" -Path "/admin/pricing/fixed-routes/*"
Add-APIMethod -ResourceId "ysrg44" -HttpMethod "PUT" -LambdaFunction "fixed-routes-manager-dev" -Path "/admin/pricing/fixed-routes/*"
Add-APIMethod -ResourceId "ysrg44" -HttpMethod "DELETE" -LambdaFunction "fixed-routes-manager-dev" -Path "/admin/pricing/fixed-routes/*"

# /admin/locations/autocomplete (GET)
Add-APIMethod -ResourceId "29vkff" -HttpMethod "GET" -LambdaFunction "locations-lookup-dev" -Path "/admin/locations/autocomplete"

# /admin/uploads/presigned (POST)
Add-APIMethod -ResourceId "9e5six" -HttpMethod "POST" -LambdaFunction "uploads-presigned-dev" -Path "/admin/uploads/presigned"

# /admin/auth/login (POST)
Add-APIMethod -ResourceId "z8zj1j" -HttpMethod "POST" -LambdaFunction "admin-auth-dev" -Path "/admin/auth/login"

# /admin/auth/logout (POST)
Add-APIMethod -ResourceId "dq9x2s" -HttpMethod "POST" -LambdaFunction "admin-auth-dev" -Path "/admin/auth/logout"

# /admin/auth/session (GET)
Add-APIMethod -ResourceId "eyupcm" -HttpMethod "GET" -LambdaFunction "admin-auth-dev" -Path "/admin/auth/session"

Write-Host "API Gateway configuration complete!"
