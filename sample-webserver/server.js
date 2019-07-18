const express = require('express')
const app = express()
const port = 3000


app.get('/health', (request, response) => {
    response.send("I'm alive")
})

app.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${port}`)
})