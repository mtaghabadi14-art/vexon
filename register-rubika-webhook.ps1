$lines = Get-Content .dev.vars

$token = ($lines | Where-Object {
    $_ -like "RUBIKA_BOT_TOKEN=*"
}).Split("=", 2)[1]

$webhookKey = ($lines | Where-Object {
    $_ -like "RUBIKA_WEBHOOK_KEY=*"
}).Split("=", 2)[1]

$webhookUrl =
    "https://s.vexongame.workers.dev/api/rubika/webhook/$webhookKey"

$body = @{
    url  = $webhookUrl
    type = "ReceiveUpdate"
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Method Post `
    -Uri "https://botapi.rubika.ir/v3/$token/updateBotEndpoints" `
    -ContentType "application/json" `
    -Body $body

$response | ConvertTo-Json -Depth 10