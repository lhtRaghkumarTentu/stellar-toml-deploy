const express = require('express');
const app = express();
const port = process.env.PORT || 8000;
const path = require('path');
const cors = require('cors');

app.get("/",(req,res)=>{
    res.send("Hello EveyOne!!!")
});

app.use(cors({
  origin: '*'
}));

app.get('/.wellknown/stellar.toml', (req, res, next) => {
    const options = {
      root: path.join(__dirname, 'public'),
    }
    res.header("Access-Control-Allow-Origin", "*");
    res.header("content-type", "text/plain");
    res.sendFile('stellar.txt', options);
  })

app.listen(port,()=>{
    console.log(`App is Running Locally on Port http://localhost:${port}`)
})